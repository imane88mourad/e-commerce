from rest_framework import serializers
from .models import Quote, QuoteItem, Invoice, InvoiceLine


class QuoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteItem
        fields = ['id', 'product', 'quantity', 'unit_price', 'vat_rate', 'line_total', 'line_vat']


class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quote
        fields = ['id', 'client_name', 'client_email', 'client_phone', 'notes',
                  'status', 'subtotal', 'vat_total', 'total', 'items', 'created_at', 'updated_at']


class QuoteItemInput(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=9999)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class QuoteCreateSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=255)
    client_email = serializers.EmailField(required=False, allow_blank=True, default='')
    client_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.ChoiceField(choices=Quote.STATUS_CHOICES, default='draft')
    items = serializers.ListField(child=QuoteItemInput())

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Au moins un produit est requis.")
        if len(value) > 100:
            raise serializers.ValidationError("Trop de lignes.")
        return value


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ['id', 'product', 'quantity', 'unit_price', 'vat_rate', 'line_total', 'line_vat']


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True, allow_null=True)

    class Meta:
        model = Invoice
        fields = ['id', 'number', 'order_id', 'client_name', 'client_email', 'client_phone',
                  'client_address', 'status', 'subtotal', 'vat_total', 'total',
                  'issue_date', 'lines', 'created_at']


class InvoiceLineInput(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=9999)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class InvoiceCreateSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=255)
    client_email = serializers.EmailField(required=False, allow_blank=True, default='')
    client_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    client_address = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.ChoiceField(choices=Invoice.STATUS_CHOICES, default='draft')
    items = serializers.ListField(child=InvoiceLineInput())

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Au moins une ligne est requise.")
        if len(value) > 100:
            raise serializers.ValidationError("Trop de lignes.")
        return value
