from rest_framework import serializers
from .models import Order, OrderItem, Payment


class PaymentSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(read_only=True)
    method_label = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'method', 'method_label', 'status', 'status_label',
            'amount', 'provider', 'transaction_id', 'paid_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    customer_name = serializers.CharField(read_only=True)
    customer_email = serializers.CharField(read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_label = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'address', 'status', 'status_label', 'payment_method',
            'payment_method_label', 'amount', 'date', 'items', 'payment',
            'customer_name', 'customer_email',
            'guest_email', 'guest_phone', 'guest_first_name', 'guest_last_name',
            'guest_full_name', 'guest_address', 'guest_city', 'guest_state',
            'guest_pincode', 'guest_shipping_info',
            'promo_code', 'discount_amount', 'subtotal_before_discount',
        ]
        read_only_fields = ['id', 'user', 'date']


class CreateOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(required=False)
    payment_method = serializers.ChoiceField(
        choices=[(m, m) for m in Order.ALLOWED_PAYMENT_METHODS], default='cod'
    )

    def validate_payment_method(self, value):
        if value not in Order.ALLOWED_PAYMENT_METHODS:
            raise serializers.ValidationError("This payment method is not available.")
        return value


class GuestOrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class GuestOrderSerializer(serializers.Serializer):
    guest_first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    guest_last_name = serializers.CharField(max_length=100, trim_whitespace=True)
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20)
    guest_address = serializers.CharField()
    guest_city = serializers.CharField(max_length=100)
    guest_state = serializers.CharField(max_length=100)
    guest_pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    guest_shipping_info = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=[(m, m) for m in Order.ALLOWED_PAYMENT_METHODS], default='cod'
    )
    promo_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    items = serializers.ListField(child=GuestOrderItemSerializer(), write_only=True)

    def validate_payment_method(self, value):
        if value not in Order.ALLOWED_PAYMENT_METHODS:
            raise serializers.ValidationError("This payment method is not available.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        if len(value) > 50:
            raise serializers.ValidationError("Too many distinct items.")
        return value
