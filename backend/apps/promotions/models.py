from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Promotion(models.Model):
    """A promotion / promo code that can be applied to orders."""

    DISCOUNT_TYPE_CHOICES = (
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    )

    name = models.CharField(max_length=255, help_text="Internal name for this promotion")
    code = models.CharField(max_length=50, unique=True, db_index=True,
                            help_text="The code customers enter (case-insensitive)")
    description = models.TextField(blank=True, default='')

    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Percentage (0-100) or fixed amount in DA"
    )

    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True,
                                    help_text="Empty = no expiration")

    is_active = models.BooleanField(default=True, db_index=True)

    usage_limit = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum number of times this code can be used. Empty = unlimited."
    )
    usage_count = models.PositiveIntegerField(default=0)

    minimum_order_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        help_text="Minimum subtotal required to apply this code (in DA)"
    )

    # Optional targeting (empty = all products)
    # Keeping it simple — can be extended later with M2M if needed.

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_valid_now(self):
        """Check if the promotion is currently valid (active, not expired, not future)."""
        now = timezone.now()
        if not self.is_active:
            return False
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        if self.usage_limit is not None and self.usage_count >= self.usage_limit:
            return False
        return True

    @property
    def is_expired(self):
        now = timezone.now()
        if self.end_date and now > self.end_date:
            return True
        return False

    @property
    def status_label(self):
        if not self.is_active:
            return 'inactive'
        if self.is_expired:
            return 'expired'
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return 'scheduled'
        if self.usage_limit is not None and self.usage_count >= self.usage_limit:
            return 'limit_reached'
        return 'active'

    def compute_discount(self, subtotal):
        """Compute the discount amount for a given subtotal.

        Returns Decimal. Never returns a value that would make total negative.
        """
        subtotal = Decimal(str(subtotal))
        if subtotal <= 0:
            return Decimal('0')

        if not self.is_valid_now:
            return Decimal('0')

        if self.minimum_order_amount > 0 and subtotal < self.minimum_order_amount:
            return Decimal('0')

        if self.discount_type == 'percentage':
            # Cap at 100%
            pct = min(self.discount_value, Decimal('100'))
            discount = (subtotal * pct / Decimal('100')).quantize(Decimal('0.01'))
        elif self.discount_type == 'fixed':
            discount = min(self.discount_value, subtotal)
        else:
            return Decimal('0')

        # Never negative
        return max(discount, Decimal('0'))

    def increment_usage(self):
        """Increment usage count atomically."""
        Promotion.objects.filter(pk=self.pk).update(
            usage_count=models.F('usage_count') + 1
        )
        self.refresh_from_db(fields=['usage_count'])
