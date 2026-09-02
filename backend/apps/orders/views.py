from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from .models import Order, OrderItem, Payment, PaymentTransitionError
from .serializers import (
    OrderSerializer, CreateOrderSerializer, GuestOrderSerializer, PaymentSerializer,
)
from apps.cart.models import Cart
from apps.addresses.models import Address
from apps.products.models import Product
from apps.products.pagination import ProductPagination


class IsAdminUser(permissions.BasePermission):
    """Allow only authenticated staff (admin) users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _create_payment_for_order(order):
    """Create the pending Payment record for a newly created order.

    The backend is the source of truth: every order gets a Payment, always
    starting as 'pending'. Nothing the frontend sends can set it to 'paid'.
    """
    return Payment.objects.create(
        order=order,
        method=order.payment_method,
        amount=order.amount,
    )


def _sync_payment_on_status(order):
    """Apply payment side-effects when the *admin* changes the order status.

    - COD order delivered  -> payment.mark_paid()   (client actually paid)
    - Any pending order cancelled -> payment.mark_cancelled()
    Online/card payments would instead be driven by a signed provider webhook.
    """
    try:
        payment = order.payment
    except Payment.DoesNotExist:
        return

    status_now = order.status
    try:
        if status_now == 'delivered' and order.payment_method == 'cod' and payment.status == 'pending':
            payment.mark_paid()
            payment.save()
        elif status_now == 'cancelled' and payment.status == 'pending':
            payment.mark_cancelled()
            payment.save()
    except PaymentTransitionError:
        # State machine guards against illegal transitions; ignore silently.
        pass


# ---------------------------------------------------------------------------
# Customer-facing order endpoints (existing behaviour preserved)
# ---------------------------------------------------------------------------

class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-date')


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class CreateOrderView(generics.CreateAPIView):
    serializer_class = CreateOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        address = None
        if 'address_id' in serializer.validated_data:
            try:
                address = Address.objects.get(
                    id=serializer.validated_data['address_id'],
                    user=request.user
                )
            except Address.DoesNotExist:
                return Response({'error': 'Invalid address'}, status=status.HTTP_400_BAD_REQUEST)

        cart = Cart.objects.filter(user=request.user).first()
        if not cart or cart.items.count() == 0:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = cart.total_amount
        order = Order.objects.create(
            user=request.user,
            address=address,
            amount=total_amount,
            payment_method=serializer.validated_data['payment_method'],
        )

        for item in cart.items.all():
            product_images = item.product.images.all()
            first_image = product_images[0].image.url if product_images.exists() and product_images[0].image else ''
            OrderItem.objects.create(
                order=order,
                product={
                    'id': item.product.id,
                    'name': item.product.name,
                    'description': item.product.description,
                    'price': str(item.product.price),
                    'offerPrice': str(item.product.offer_price),
                    'image': first_image,
                    'category': item.product.category.name if item.product.category else None,
                },
                quantity=item.quantity,
                price=item.product.offer_price,
            )

        cart.items.all().delete()

        _create_payment_for_order(order)

        # Notify customer + admins (email + in-app)
        try:
            from apps.notifications.helpers import notify_order_created
            notify_order_created(order)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Notification failed: {e}")

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class GuestOrderView(generics.CreateAPIView):
    """Create an order without authentication (guest checkout)."""
    serializer_class = GuestOrderSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        items_data = data['items']
        total_amount = 0
        order_items = []

        for item_data in items_data:
            product_id = item_data['product_id']
            quantity = item_data['quantity']

            try:
                # select_related omitted here because category is nullable;
                # PostgreSQL rejects FOR UPDATE on the nullable side of a
                # LEFT OUTER JOIN.  We fetch category separately below.
                product = Product.objects.select_for_update().get(id=product_id, is_active=True)
            except Product.DoesNotExist:
                return Response(
                    {'error': f'Product {product_id} is not available'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if product.stock < quantity:
                return Response(
                    {'error': f'Insufficient stock for {product.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Price is always read from the server — never trusted from the client.
            price = product.offer_price or product.price
            total_amount += price * quantity

            # Decrement stock atomically.
            product.stock -= quantity
            product.save(update_fields=['stock'])

            # Refresh category for the snapshot (accessed after the lock)
            category = product.category
            product_images = product.images.all()
            first_image = product_images[0].image.url if product_images.exists() and product_images[0].image else ''

            order_items.append({
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'description': product.description,
                    'price': str(product.price),
                    'offerPrice': str(product.offer_price),
                    'image': first_image,
                    'category': category.name if category else None,
                },
                'quantity': quantity,
                'price': price,
            })

        # Server-side promo code validation
        from apps.promotions.views import validate_and_apply_promo
        promo_code = data.get('promo_code', '').strip()
        discount_amount, promo_id, promo_error = validate_and_apply_promo(promo_code, total_amount)

        # If promo code was provided but invalid, reject the order
        if promo_code and promo_error and discount_amount == 0:
            return Response(
                {'error': f'Code promo invalide: {promo_error}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        final_amount = total_amount - discount_amount

        # Optionally link the order to an authenticated user (login is optional,
        # so this stays None for guests).
        user = request.user if getattr(request.user, 'is_authenticated', False) else None

        order = Order.objects.create(
            user=user,
            amount=final_amount,
            payment_method=data['payment_method'],
            promo_code=promo_code.upper() if promo_code else '',
            discount_amount=discount_amount,
            subtotal_before_discount=total_amount,
            guest_email=data['guest_email'],
            guest_phone=data['guest_phone'],
            guest_first_name=data['guest_first_name'],
            guest_last_name=data['guest_last_name'],
            guest_full_name=f"{data['guest_first_name']} {data['guest_last_name']}".strip(),
            guest_address=data['guest_address'],
            guest_city=data['guest_city'],
            guest_state=data['guest_state'],
            guest_pincode=data.get('guest_pincode', ''),
            guest_shipping_info=data.get('guest_shipping_info', ''),
        )

        for order_item_data in order_items:
            OrderItem.objects.create(order=order, **order_item_data)

        _create_payment_for_order(order)

        # Notify customer + admins (email + in-app)
        try:
            from apps.notifications.helpers import notify_order_created
            notify_order_created(order)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Notification failed: {e}")

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class GuestOrderDetailView(generics.RetrieveAPIView):
    """Allow guests to view their order by ID + email (no auth required)."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        order_id = self.kwargs.get('pk')
        email = self.request.query_params.get('email', '')
        try:
            order = Order.objects.get(id=order_id, guest_email=email)
            return order
        except Order.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Order not found')


# ---------------------------------------------------------------------------
# Admin order endpoints (Etape 8 + 9): list, detail, status, payment actions
# ---------------------------------------------------------------------------

class OrderAdminListView(generics.ListAPIView):
    """Admin: list ALL orders (guests and registered users)."""
    permission_classes = [IsAdminUser]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['id', 'guest_email', 'guest_full_name', 'user__email',
                     'user__first_name', 'user__last_name']
    ordering_fields = ['date', 'amount', 'status']
    ordering = ['-date']

    def get_queryset(self):
        qs = Order.objects.select_related('user', 'payment').order_by('-date')
        order_status = self.request.query_params.get('status')
        payment_status = self.request.query_params.get('payment_status')
        if order_status:
            qs = qs.filter(status=order_status)
        if payment_status:
            qs = qs.filter(payment__status=payment_status)
        return qs

    def get_serializer_class(self):
        return OrderSerializer


class OrderAdminDetailView(APIView):
    """Admin: full order detail (GET) + change order status (PATCH).

    GET:  /admin/<pk>/  -> order with items + payment
    PATCH: /admin/<pk>/  -> change order status; applies payment side-effects.

    The payment status is never set by the frontend — it only transitions as
    a side-effect of an admin action enforced here in the backend.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.select_related('user', 'payment'), pk=pk)
        return Response(OrderSerializer(order).data)

    @transaction.atomic
    def patch(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        new_status = (request.data or {}).get('status')
        valid = dict(Order.STATUS_CHOICES)
        if not new_status or new_status not in valid:
            return Response(
                {'error': f"Invalid status. Allowed: {', '.join(valid)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = order.status
        order.status = new_status
        order.save(update_fields=['status'])
        _sync_payment_on_status(order)

        # Notify customer of status change
        try:
            from apps.notifications.helpers import notify_order_status_changed
            notify_order_status_changed(order, old_status)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Notification failed: {e}")

        return Response(OrderSerializer(order).data)


class OrderPaymentActionView(APIView):
    """Admin payment actions. Backend-authoritative status changes.

    Used for COD (mark paid on delivery) and bank transfer (mark paid after
    the deposit is confirmed). Online payments would instead be driven by a
    signed gateway webhook, never by this endpoint.
    """
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, pk, action):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        payment = getattr(order, 'payment', None)
        if not payment:
            return Response({'error': 'No payment record for this order'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            if action == 'mark-paid':
                payment.mark_paid(
                    transaction_id=(request.data or {}).get('transaction_id', '')
                )
                payment.save()
            elif action == 'mark-failed':
                payment.mark_failed()
                payment.save()
            elif action == 'mark-refunded':
                payment.mark_refunded()
                payment.save()
            else:
                return Response({'error': 'Unknown action'},
                                status=status.HTTP_400_BAD_REQUEST)
        except PaymentTransitionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PaymentSerializer(payment).data)
