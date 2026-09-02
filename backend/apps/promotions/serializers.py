from rest_framework import serializers
from .models import Promotion


class PromotionSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(read_only=True)
    is_valid_now = serializers.BooleanField(read_only=True)

    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'code', 'description',
            'discount_type', 'discount_value',
            'start_date', 'end_date', 'is_active',
            'usage_limit', 'usage_count',
            'minimum_order_amount',
            'status_label', 'is_valid_now',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']


class PromoValidateSerializer(serializers.Serializer):
    """Input for validating a promo code against a subtotal."""
    code = serializers.CharField(max_length=50)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
