from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('seller', 'Seller'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    image_url = models.URLField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def has_purchased_product(self, product_id):
        """Check if this user has a delivered/confirmed/shipped/processing order containing the product."""
        from apps.orders.models import Order, OrderItem
        return Order.objects.filter(
            user=self,
            status__in=['confirmed', 'processing', 'shipped', 'delivered'],
        ).filter(
            items__product__id=product_id
        ).exists()

    def __str__(self):
        return self.email
