from django.db import models
from django.utils import timezone
from apps.orders.models import Order
from apps.billing.pricing import document_totals


class Quote(models.Model):
    """A request for quote / professional quotation (devis)."""
    STATUS_CHOICES = (
        ('draft', 'Brouillon'),
        ('sent', 'Envoyé'),
        ('accepted', 'Accepté'),
        ('declined', 'Refusé'),
        ('expired', 'Expiré'),
        ('converted', 'Converti en commande'),
    )

    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True, default='')
    client_phone = models.CharField(max_length=30, blank=True, default='')
    notes = models.TextField(blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def recalculate(self):
        lines = [
            (i.unit_price, i.quantity, i.vat_rate)
            for i in self.items.all().order_by('id')
        ]
        totals = document_totals(lines)
        self.subtotal = totals['subtotal']
        self.vat_total = totals['vat_total']
        self.total = totals['total']
        self.save(update_fields=['subtotal', 'vat_total', 'total', 'updated_at'])
        return totals

    def __str__(self):
        return f"Devis #{self.id} - {self.client_name}"


class QuoteItem(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='items')
    product = models.JSONField(default=dict)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_vat = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.quantity} x {self.product.get('name', 'Produit')}"


class Invoice(models.Model):
    """A professional invoice (facture), normally generated from an order."""
    STATUS_CHOICES = (
        ('draft', 'Brouillon'),
        ('issued', 'Émise'),
        ('void', 'Annulée'),
    )

    number = models.CharField(max_length=30, unique=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')

    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True, default='')
    client_phone = models.CharField(max_length=30, blank=True, default='')
    client_address = models.TextField(blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    issue_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def _next_number(self):
        prefix = 'FACT'
        year = timezone.now().year
        last = (Invoice.objects.filter(number__startswith=f'{prefix}-{year}-')
                .order_by('-id').values_list('number', flat=True).first())
        seq = 1
        if last:
            try:
                seq = int(str(last).rsplit('-', 1)[-1]) + 1
            except ValueError:
                seq = 1
        return f'{prefix}-{year}-{seq:03d}'

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._next_number()
        super().save(*args, **kwargs)

    def recalculate(self):
        lines = [
            (i.unit_price, i.quantity, i.vat_rate)
            for i in self.lines.all().order_by('id')
        ]
        totals = document_totals(lines)
        self.subtotal = totals['subtotal']
        self.vat_total = totals['vat_total']
        self.total = totals['total']
        self.save(update_fields=['subtotal', 'vat_total', 'total', 'updated_at'])
        return totals

    def __str__(self):
        return f"Facture {self.number} - {self.client_name}"


class InvoiceLine(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')
    product = models.JSONField(default=dict)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_vat = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.quantity} x {self.product.get('name', 'Produit')}"
