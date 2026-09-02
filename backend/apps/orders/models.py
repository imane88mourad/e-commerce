from django.db import models
from apps.users.models import User
from apps.addresses.models import Address

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('returned', 'Returned'),
    )
    PAYMENT_CHOICES = (
        ('cod', 'Cash on Delivery'),
        ('bank_transfer', 'Bank Transfer'),
        ('online_card', 'Online Payment'),
    )

    ALLOWED_PAYMENT_METHODS = ['cod', 'bank_transfer', 'online_card']

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)

    # Guest fields — populated when user is not authenticated
    guest_email = models.EmailField(null=True, blank=True)
    guest_phone = models.CharField(max_length=20, null=True, blank=True)
    guest_first_name = models.CharField(max_length=100, null=True, blank=True)
    guest_last_name = models.CharField(max_length=100, null=True, blank=True)
    guest_full_name = models.CharField(max_length=255, null=True, blank=True)
    guest_address = models.TextField(null=True, blank=True)
    guest_city = models.CharField(max_length=100, null=True, blank=True)
    guest_state = models.CharField(max_length=100, null=True, blank=True)
    guest_pincode = models.CharField(max_length=10, null=True, blank=True)
    guest_shipping_info = models.TextField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cod')
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Discount snapshot — frozen at order creation time
    promo_code = models.CharField(max_length=50, blank=True, default='')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal_before_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    @property
    def customer_name(self):
        if self.user:
            full = f"{self.user.first_name} {self.user.last_name}".strip()
            if full:
                return full
        if self.guest_full_name:
            return self.guest_full_name
        return self.guest_email or 'Invité'

    @property
    def customer_email(self):
        return (self.user.email if self.user else None) or self.guest_email

    def __str__(self):
        return f"Order {self.id} - {self.customer_name}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.JSONField()
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.get('name', 'Unknown')}"


class PaymentTransitionError(Exception):
    """Raised when an illegal payment status transition is attempted."""


class Payment(models.Model):
    """A single payment attempt for an order.

    The backend is the single source of truth for payment status. Status is
    only ever mutated via the transition methods below (this enforces an
    allowed state machine) and NEVER on the say-so of the frontend — for the
    future online gateway this would be updated exclusively by a signed
    provider webhook.
    """
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    )

    # Allowed status transitions (source -> targets)
    TRANSITIONS = {
        'pending': {'paid', 'failed', 'cancelled'},
        'failed': {'paid'},
        'paid': {'refunded'},
        'cancelled': set(),
        'refunded': set(),
    }

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    method = models.CharField(max_length=20, choices=Order.PAYMENT_CHOICES, default='cod')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    # 'stripe'/'paypal' when an online gateway is enabled; empty for cod/virement.
    provider = models.CharField(max_length=50, blank=True, default='')
    transaction_id = models.CharField(max_length=255, blank=True, default='')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def status_label(self):
        return dict(self.PAYMENT_STATUS_CHOICES).get(self.status, self.status)

    def _transition(self, new_status):
        allowed = self.TRANSITIONS.get(self.status, set())
        if new_status not in allowed:
            raise PaymentTransitionError(
                f"Payment cannot move from '{self.status}' to '{new_status}'"
            )

    def mark_paid(self, transaction_id='', note=''):
        """Backend-authoritative transition to 'paid'."""
        self._transition('paid')
        self.status = 'paid'
        self.transaction_id = transaction_id or self.transaction_id
        if note:
            self.provider = self.provider or note
        self.paid_at = self._now()

    def mark_failed(self):
        self._transition('failed')
        self.status = 'failed'

    def mark_cancelled(self):
        self._transition('cancelled')
        self.status = 'cancelled'

    def mark_refunded(self):
        self._transition('refunded')
        self.status = 'refunded'

    @staticmethod
    def _now():
        from django.utils import timezone
        return timezone.now()

    def __str__(self):
        return f"Payment {self.id} for order {self.order_id} - {self.status}"
