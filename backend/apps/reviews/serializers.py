from rest_framework import serializers
from .models import Review, WishlistItem


class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    has_purchased = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'product', 'user', 'user_email', 'user_name',
            'product_name', 'rating', 'title', 'comment',
            'status', 'has_purchased', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.email

    def get_has_purchased(self, obj):
        """Check if the user has actually purchased this product."""
        return obj.user.has_purchased_product(obj.product_id)


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'product', 'rating', 'title', 'comment']
        read_only_fields = ['id']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("La note doit être entre 1 et 5.")
        return value

    def validate_comment(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Le commentaire doit contenir au moins 10 caractères.")
        return value


class ReviewModerationSerializer(serializers.ModelSerializer):
    """For admin moderation (status changes)."""
    class Meta:
        model = Review
        fields = ['id', 'status']
        read_only_fields = ['id']


class ReviewStatsSerializer(serializers.Serializer):
    """Aggregated review stats for a product."""
    average_rating = serializers.FloatField()
    total_reviews = serializers.IntegerField()
    distribution = serializers.DictField()


class WishlistItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.SerializerMethodField()
    product_stock = serializers.IntegerField(source='product.stock', read_only=True)
    product_is_active = serializers.BooleanField(source='product.is_active', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    product_offer_price = serializers.SerializerMethodField()

    class Meta:
        model = WishlistItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'product_image', 'product_stock', 'product_is_active',
            'product_slug', 'product_offer_price', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_product_image(self, obj):
        images = obj.product.images.all()
        if images.exists() and images[0].image:
            return images[0].image.url
        return ''

    def get_product_offer_price(self, obj):
        return str(obj.product.offer_price) if obj.product.offer_price else str(obj.product.price)
