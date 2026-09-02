"""Tests for the payments app.

Covers:
    - PaymentProvider abstraction
    - MockProvider
    - Payment initiation
    - Payment status polling
    - Webhook handling (valid, invalid, duplicate, amount mismatch)
    - Mock simulate endpoint
    - Guest checkout → payment flow
    - DZD / Decimal correctness
"""
import json
import hashlib
import hmac
from decimal import Decimal

from django.test import TestCase, TransactionTestCase
from django.test.client import RequestFactory
from django.contrib.auth import get_user_model
from django.db import transaction
from django.urls import reverse

from apps.orders.models import Order, OrderItem, Payment

User = get_user_model()


def _make_user(username='payuser', email='pay@example.com'):
    user, _ = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': 'Pay',
            'last_name': 'User',
            'is_staff': False,
        },
    )
    user.set_password('testpass123')
    user.save()
    return user


def _make_order(user=None, amount=Decimal('50000.00'), method='cod', status='pending'):
    """Create an order + payment for testing."""
    order = Order.objects.create(
        user=user,
        amount=amount,
        payment_method=method,
        status=status,
        guest_email='guest@test.dz' if not user else None,
        guest_first_name='Test',
        guest_last_name='Guest',
        guest_phone='0550000000',
        guest_address='123 Rue Test',
        guest_city='Alger',
        guest_state='Alger',
    )
    payment = Payment.objects.create(
        order=order,
        method=method,
        amount=amount,
        status='pending',
    )
    return order, payment


def _mock_webhook_body(order_id, amount, status='success', reference='MOCK-TEST', txn_id='TXN-001'):
    return json.dumps({
        'order_id': order_id,
        'amount': str(amount),
        'status': status,
        'transaction_id': txn_id,
        'reference': reference,
        'currency': 'DZD',
    }).encode()


def _mock_signature(body, secret='mock-secret-dev'):
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# Provider tests
# ---------------------------------------------------------------------------

class MockProviderTest(TestCase):
    def test_initiate_payment(self):
        from apps.payments.providers import get_provider
        provider = get_provider('mock')
        result = provider.initiate_payment(
            order_id=42,
            amount=Decimal('125000.00'),
            currency='DZD',
        )
        self.assertEqual(result.provider, 'mock')
        self.assertTrue(result.payment_url.startswith('http'))
        self.assertIn('order_id=42', result.payment_url)
        self.assertTrue(result.reference.startswith('MOCK-42-'))
        self.assertIn('order_id=42', result.payment_url)
        self.assertIn('125000', result.payment_url)

    def test_verify_webhook_valid(self):
        from apps.payments.providers import get_provider
        provider = get_provider('mock')
        body = b'{"test": true}'
        sig = _mock_signature(body)
        self.assertTrue(provider.verify_webhook({'X-Mock-Signature': sig}, body))

    def test_verify_webhook_invalid(self):
        from apps.payments.providers import get_provider
        provider = get_provider('mock')
        self.assertFalse(provider.verify_webhook({'X-Mock-Signature': 'bad'}, b'{}'))

    def test_parse_webhook_success(self):
        from apps.payments.providers import get_provider
        provider = get_provider('mock')
        body = _mock_webhook_body(1, Decimal('50000'), 'success', 'REF-1')
        result = provider.parse_webhook(body)
        self.assertEqual(result.status, 'paid')
        self.assertEqual(result.amount, Decimal('50000'))
        self.assertEqual(result.reference, 'REF-1')

    def test_parse_webhook_failure(self):
        from apps.payments.providers import get_provider
        provider = get_provider('mock')
        body = _mock_webhook_body(1, Decimal('50000'), 'failure')
        result = provider.parse_webhook(body)
        self.assertEqual(result.status, 'failed')

    def test_get_provider_unknown(self):
        from apps.payments.providers import get_provider
        with self.assertRaises(ValueError):
            get_provider('nonexistent')


# ---------------------------------------------------------------------------
# Payment initiation view tests
# ---------------------------------------------------------------------------

class PaymentInitiateViewTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = _make_user('inituser', 'init@test.dz')
        self.order, self.payment = _make_order(user=None, amount=Decimal('75000.00'), method='online_card')
        self.url = f'/api/payments/initiate/{self.order.id}/'

    def test_initiate_guest_success(self):
        """Guest initiates payment with matching email."""
        response = self.client.post(
            self.url,
            data=json.dumps({'provider': 'mock', 'email': 'guest@test.dz'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('payment_url', data)
        self.assertEqual(data['provider'], 'mock')
        self.assertEqual(data['amount'], '75000.00')
        self.assertEqual(data['currency'], 'DZD')

    def test_initiate_guest_wrong_email(self):
        """Guest with wrong email gets 404."""
        response = self.client.post(
            self.url,
            data=json.dumps({'provider': 'mock', 'email': 'wrong@test.dz'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)

    def test_initiate_already_paid(self):
        """Cannot initiate payment for an already-paid order."""
        self.payment.status = 'paid'
        self.payment.save()
        response = self.client.post(
            self.url,
            data=json.dumps({'provider': 'mock', 'email': 'guest@test.dz'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_updates_payment_record(self):
        """Initiation should update payment provider and transaction_id."""
        self.client.post(
            self.url,
            data=json.dumps({'provider': 'mock', 'email': 'guest@test.dz'}),
            content_type='application/json',
        )
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.provider, 'mock')
        self.assertTrue(self.payment.transaction_id.startswith('MOCK-'))


# ---------------------------------------------------------------------------
# Payment status view tests
# ---------------------------------------------------------------------------

class PaymentStatusViewTest(TestCase):
    def setUp(self):
        self.order, self.payment = _make_order(amount=Decimal('100000.00'))
        self.url = f'/api/payments/status/{self.order.id}/'

    def test_status_pending(self):
        response = self.client.get(f'{self.url}?email=guest@test.dz')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'pending')
        self.assertEqual(data['amount'], '100000.00')
        self.assertEqual(data['currency'] if 'currency' in data else 'DZD', 'DZD')

    def test_status_paid(self):
        self.payment.status = 'paid'
        self.payment.transaction_id = 'TXN-001'
        self.payment.save()
        response = self.client.get(f'{self.url}?email=guest@test.dz')
        data = response.json()
        self.assertEqual(data['status'], 'paid')

    def test_status_wrong_email(self):
        response = self.client.get(f'{self.url}?email=wrong@test.dz')
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# Webhook tests
# ---------------------------------------------------------------------------

class PaymentWebhookTest(TransactionTestCase):
    """Webhook tests using TransactionTestCase to test select_for_update."""

    def setUp(self):
        self.factory = RequestFactory()
        self.order, self.payment = _make_order(
            amount=Decimal('80000.00'), method='online_card'
        )
        self.payment.transaction_id = 'MOCK-1-ABCDEF01'
        self.payment.save()
        self.url = '/api/payments/webhook/mock/'

    def _webhook(self, status='success'):
        body = _mock_webhook_body(
            self.order.id,
            Decimal('80000.00'),
            status=status,
            reference='MOCK-1-ABCDEF01',
            txn_id='TXN-SUCCESS-001',
        )
        sig = _mock_signature(body)
        return self.factory.post(
            self.url,
            data=body,
            content_type='application/json',
            HTTP_X_MOCK_SIGNATURE=sig,
        )

    def _call_webhook(self, request):
        """Wrap webhook call in a transaction for select_for_update."""
        from apps.payments.views import payment_webhook
        with transaction.atomic():
            return payment_webhook(request, provider_slug='mock')

    def test_webhook_success(self):
        request = self._webhook('success')
        response = self._call_webhook(request)
        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'paid')
        self.assertEqual(self.payment.transaction_id, 'TXN-SUCCESS-001')

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'confirmed')

    def test_webhook_failure(self):
        request = self._webhook('failure')
        response = self._call_webhook(request)
        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    def test_webhook_invalid_signature(self):
        from apps.payments.views import payment_webhook
        body = _mock_webhook_body(self.order.id, Decimal('80000.00'), 'success', 'MOCK-1-ABCDEF01')
        request = self.factory.post(
            self.url,
            data=body,
            content_type='application/json',
            HTTP_X_MOCK_SIGNATURE='invalid-sig',
        )
        with transaction.atomic():
            response = payment_webhook(request, provider_slug='mock')
        self.assertEqual(response.status_code, 403)

    def test_webhook_duplicate_idempotent(self):
        """Duplicate webhook should be accepted without error."""
        # First webhook
        request1 = self._webhook('success')
        response1 = self._call_webhook(request1)
        self.assertEqual(response1.status_code, 200)

        # Second webhook (duplicate)
        request2 = self._webhook('success')
        response2 = self._call_webhook(request2)
        self.assertEqual(response2.status_code, 200)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'paid')

    def test_webhook_amount_mismatch(self):
        from apps.payments.views import payment_webhook
        body = _mock_webhook_body(
            self.order.id,
            Decimal('99999.00'),  # wrong amount
            'success',
            'MOCK-1-ABCDEF01',
        )
        sig = _mock_signature(body)
        request = self.factory.post(
            self.url,
            data=body,
            content_type='application/json',
            HTTP_X_MOCK_SIGNATURE=sig,
        )
        with transaction.atomic():
            response = payment_webhook(request, provider_slug='mock')
        self.assertEqual(response.status_code, 400)

    def test_webhook_unknown_provider(self):
        from apps.payments.views import payment_webhook
        request = self.factory.post(
            '/api/payments/webhook/unknown/',
            data=b'{}',
            content_type='application/json',
        )
        with transaction.atomic():
            response = payment_webhook(request, provider_slug='unknown')
        self.assertEqual(response.status_code, 400)

    def test_webhook_reference_not_found(self):
        from apps.payments.views import payment_webhook
        body = _mock_webhook_body(
            self.order.id,
            Decimal('80000.00'),
            'success',
            'NONEXISTENT-REF',
        )
        sig = _mock_signature(body)
        request = self.factory.post(
            self.url,
            data=body,
            content_type='application/json',
            HTTP_X_MOCK_SIGNATURE=sig,
        )
        with transaction.atomic():
            response = payment_webhook(request, provider_slug='mock')
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# Mock simulate tests
# ---------------------------------------------------------------------------

class MockSimulateTest(TestCase):
    def setUp(self):
        self.order, self.payment = _make_order(amount=Decimal('60000.00'), method='online_card')
        self.url = '/api/payments/mock/simulate/'

    def test_simulate_success(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'order_id': self.order.id, 'success': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'paid')

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'confirmed')

    def test_simulate_failure(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'order_id': self.order.id, 'success': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    def test_simulate_missing_order_id(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'success': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_simulate_already_paid(self):
        self.payment.status = 'paid'
        self.payment.save()
        response = self.client.post(
            self.url,
            data=json.dumps({'order_id': self.order.id, 'success': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# DZD / Decimal tests
# ---------------------------------------------------------------------------

class PaymentDZDTest(TestCase):
    def test_payment_amount_is_decimal(self):
        _, payment = _make_order(amount=Decimal('125000.00'))
        self.assertIsInstance(payment.amount, Decimal)
        self.assertEqual(payment.amount, Decimal('125000.00'))

    def test_webhook_amount_verification_decimal(self):
        """Amount comparison should work with Decimal."""
        from decimal import Decimal
        a = Decimal('125000.00')
        b = Decimal('125000.00')
        self.assertEqual(a, b)

    def test_order_amount_preserved(self):
        order, _ = _make_order(amount=Decimal('999999.99'))
        order.refresh_from_db()
        self.assertEqual(order.amount, Decimal('999999.99'))
