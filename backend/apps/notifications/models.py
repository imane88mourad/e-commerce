from django.db import models
from django.conf import settings


class Notification(models.Model):
    """In-app notification for users."""

    TYPE_CHOICES = (
        ('order_created', 'Commande créée'),
        ('order_confirmed', 'Commande confirmée'),
        ('order_processing', 'Commande en préparation'),
        ('order_shipped', 'Commande expédiée'),
        ('order_delivered', 'Commande livrée'),
        ('order_cancelled', 'Commande annulée'),
        ('payment_received', 'Paiement reçu'),
        ('payment_failed', 'Paiement échoué'),
        ('invoice_created', 'Facture créée'),
        ('invoice_issued', 'Facture émise'),
        ('quote_sent', 'Devis envoyé'),
        ('quote_accepted', 'Devis accepté'),
        ('quote_declined', 'Devis refusé'),
        ('quote_expired', 'Devis expiré'),
        ('system', 'Système'),
    )

    # recipient — null for admin-only notifications (e.g. "new order received")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='notifications'
    )

    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default='')

    # Optional link to navigate to when clicking the notification
    link = models.CharField(max_length=500, blank=True, default='')

    # Related object info (order id, invoice id, etc.)
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    reference_model = models.CharField(max_length=50, blank=True, default='')

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title}"

    def mark_read(self):
        self.is_read = True
        self.save(update_fields=['is_read'])
