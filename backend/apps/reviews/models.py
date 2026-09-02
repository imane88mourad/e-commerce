from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.products.models import Product


class Review(models.Model):
    """Product review — only by authenticated users who purchased the product."""

    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')

    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Note de 1 à 5',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    comment = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        # One review per user per product
        unique_together = ['product', 'user']

    def __str__(self):
        return f"Review {self.id} — {self.product.name} ({self.rating}/5)"

    @property
    def is_approved(self):
        return self.status == 'approved'


class WishlistItem(models.Model):
    """Wishlist item for authenticated users."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlist_items')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'product']

    def __str__(self):
        return f"Wishlist: {self.user.email} → {self.product.name}"
