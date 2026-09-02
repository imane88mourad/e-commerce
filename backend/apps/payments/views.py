"""Payment views.

Endpoints:
    POST /api/payments/initiate/<order_id>/   – start an online payment
    GET  /api/payments/status/<order_id>/     – poll payment status
    POST /api/payments/webhook/<provider>/    – provider callback
    POST /api/payments/mock/simulate/         – dev/test: simulate webhook
"""

from __future__ import annotations
import json
import logging
from decimal import Decimal

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order, Payment, PaymentTransitionError
from apps.orders.serializers import PaymentSerializer
from .providers import get_provider

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_owns_order(user, order: Order) -> bool:
    """Check if *user* is authorised to view / pay for *order*."""
    if getattr(user, 'is_staff', False):
        return True
    if order.user_id and order.user_id == user.id:
        return True
    return False


# ---------------------------------------------------------------------------
# 1.  Initiate online payment
# ---------------------------------------------------------------------------

class PaymentInitiateView(APIView):
    """POST /api/payments/initiate/<order_id>/

    Creates the online payment attempt and returns a redirect URL.
    """
    permission_classes = [permissions.AllowAny]  # guests + auth

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(
            Order.objects.select_for_update(), pk=order_id
        )

        # --- access control ---
        user = request.user if getattr(request.user, 'is_authenticated', False) else None
        if not getattr(request.user, 'is_staff', False):
            # guest: must provide matching email
            if user is None:
                email = request.data.get('email', '').strip()
                if not email or email.lower() != (order.guest_email or '').lower():
                    return Response(
                        {'error': 'Order not found'},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            elif not _user_owns_order(user, order):
                return Response(
                    {'error': 'Order not found'},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # --- already paid? ---
        try:
            existing = order.payment
            if existing.status == 'paid':
                return Response(
                    {'error': 'Order already paid'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Payment.DoesNotExist:
            existing = _create_payment(order)

        # --- initiate provider ---
        try:
            provider_slug = request.data.get('provider', 'mock')
            provider = get_provider(provider_slug)
            result = provider.initiate_payment(
                order_id=order.id,
                amount=order.amount,
                currency='DZD',
                description=f'QuickCart Order #{order.id}',
                metadata={
                    'order_id': order.id,
                    'promo_code': order.promo_code,
                },
            )

            # Update payment record
            existing.provider = result.provider
            existing.transaction_id = result.reference
            existing.save(update_fields=['provider', 'transaction_id'])

            return Response({
                'payment_url': result.payment_url,
                'reference': result.reference,
                'provider': result.provider,
                'amount': str(order.amount),
                'currency': 'DZD',
            })

        except Exception as e:
            logger.error(f"Payment initiation failed for order #{order_id}: {e}")
            return Response(
                {'error': 'Payment initiation failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _create_payment(order):
    """Create or return existing pending payment."""
    try:
        return order.payment
    except Payment.DoesNotExist:
        return Payment.objects.create(
            order=order,
            method=order.payment_method,
            amount=order.amount,
        )


# ---------------------------------------------------------------------------
# 2.  Poll payment status
# ---------------------------------------------------------------------------

class PaymentStatusView(APIView):
    """GET /api/payments/status/<order_id>/

    Returns current payment status.  Frontend polls this while waiting.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id)

        # access control
        email = request.query_params.get('email', '')
        if not (request.user and request.user.is_authenticated):
            if not email or email.lower() != (order.guest_email or '').lower():
                return Response(
                    {'error': 'Order not found'},
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            payment = order.payment
        except Payment.DoesNotExist:
            return Response(
                {'status': 'none', 'message': 'No payment record'},
                status=status.HTTP_200_OK,
            )

        return Response({
            'status': payment.status,
            'method': payment.method,
            'amount': str(payment.amount),
            'provider': payment.provider,
            'transaction_id': payment.transaction_id,
            'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
            'order_status': order.status,
        })


# ---------------------------------------------------------------------------
# 3.  Webhook endpoint (generic)
# ---------------------------------------------------------------------------

@csrf_exempt
@require_POST
def payment_webhook(request, provider_slug):
    """POST /api/payments/webhook/<provider>/

    Receives provider callbacks.  Idempotent: duplicate webhooks are
    silently accepted without double-crediting.
    """
    body = request.body

    try:
        provider = get_provider(provider_slug)
    except ValueError:
        return JsonResponse({'error': 'Unknown provider'}, status=400)

    # --- verify signature ---
    if not provider.verify_webhook(dict(request.headers), body):
        logger.warning(f"Invalid webhook signature from {provider_slug}")
        return JsonResponse({'error': 'Invalid signature'}, status=403)

    # --- parse payload ---
    try:
        result = provider.parse_webhook(body)
    except Exception as e:
        logger.error(f"Failed to parse webhook from {provider_slug}: {e}")
        return JsonResponse({'error': 'Invalid payload'}, status=400)

    # --- find the payment ---
    # Look up by reference first, then by transaction_id (in case a previous
    # webhook already replaced the reference via mark_paid()).
    payment = Payment.objects.select_for_update().filter(
        transaction_id=result.reference,
    ).select_related('order').first()

    if not payment:
        payment = Payment.objects.select_for_update().filter(
            transaction_id=result.transaction_id,
        ).select_related('order').first()

    if not payment:
        logger.warning(f"Webhook reference not found: {result.reference}")
        return JsonResponse({'error': 'Reference not found'}, status=404)

    # --- idempotent: skip if already final ---
    if payment.status in ('paid', 'refunded'):
        return JsonResponse({'status': 'already_processed'}, status=200)

    # --- amount verification ---
    if result.amount != payment.amount:
        logger.error(
            f"Amount mismatch: webhook={result.amount}, "
            f"payment={payment.amount}, ref={result.reference}"
        )
        return JsonResponse({'error': 'Amount mismatch'}, status=400)

    # --- apply transition ---
    try:
        if result.status == 'paid':
            payment.mark_paid(transaction_id=result.transaction_id)
            payment.save()

            # Mark order as confirmed
            order = payment.order
            if order.status == 'pending':
                order.status = 'confirmed'
                order.save(update_fields=['status'])

            # Trigger notifications
            _send_payment_notifications(order)

        elif result.status == 'failed':
            payment.mark_failed()
            payment.save()

        elif result.status == 'cancelled':
            payment.mark_cancelled()
            payment.save()

        logger.info(
            f"Webhook processed: {provider_slug} ref={result.reference} "
            f"status={result.status}"
        )

    except PaymentTransitionError as e:
        logger.warning(f"Illegal transition in webhook: {e}")
        return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'status': 'ok'}, status=200)


def _send_payment_notifications(order):
    """Send notifications + email after successful online payment."""
    try:
        from apps.notifications.helpers import notify_payment_received
        notify_payment_received(order)
    except Exception as e:
        logger.error(f"Payment notification failed for order #{order.id}: {e}")


# ---------------------------------------------------------------------------
# 4.  Mock simulate (dev / test only)
# ---------------------------------------------------------------------------

class MockPaymentSimulateView(APIView):
    """POST /api/payments/mock/simulate/

    Simulates a webhook callback for the mock provider.
    Only available in non-production environments.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import os
        if os.environ.get('ENVIRONMENT') == 'production':
            return Response(
                {'error': 'Not available in production'},
                status=status.HTTP_403_FORBIDDEN,
            )

        order_id = request.data.get('order_id')
        success = request.data.get('success', True)

        if not order_id:
            return Response(
                {'error': 'order_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = get_object_or_404(Order, pk=order_id)
        try:
            payment = order.payment
        except Payment.DoesNotExist:
            return Response(
                {'error': 'No payment record'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment.status == 'paid':
            return Response(
                {'error': 'Already paid'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider = get_provider('mock')
        mock_status = 'success' if success else 'failure'

        # Build mock webhook body
        webhook_body = json.dumps({
            'order_id': order.id,
            'amount': str(payment.amount),
            'status': mock_status,
            'transaction_id': f'MOCK-TXN-{order.id}-{timezone.now().strftime("%Y%m%d%H%M%S")}',
            'reference': payment.transaction_id,
            'currency': 'DZD',
        }).encode()

        # Create mock signature
        import hmac as hmac_mod
        import hashlib
        secret = os.environ.get('MOCK_WEBHOOK_SECRET', 'mock-secret-dev')
        signature = hmac_mod.new(secret.encode(), webhook_body, hashlib.sha256).hexdigest()

        # Build fake request
        from django.test import RequestFactory
        factory = RequestFactory()
        fake_request = factory.post(
            f'/api/payments/webhook/mock/',
            data=webhook_body,
            content_type='application/json',
            HTTP_X_MOCK_SIGNATURE=signature,
        )

        # Call the webhook view directly (wrapped in a transaction for select_for_update)
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            response = payment_webhook(fake_request, provider_slug='mock')

        return Response({
            'status': 'success' if success else 'failure',
            'order_id': order.id,
        })
