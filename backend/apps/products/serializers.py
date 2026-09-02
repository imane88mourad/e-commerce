from rest_framework import serializers
from .models import Product, Category, Brand, Attribute, AttributeValue, ProductImage, ProductVariant, ProductDocument

class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image', 'parent', 'is_active', 'display_order', 'children', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return CategorySerializer(children, many=True).data

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class AttributeValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeValue
        fields = ['id', 'attribute', 'value']
        read_only_fields = ['id']

class AttributeSerializer(serializers.ModelSerializer):
    values = AttributeValueSerializer(many=True, read_only=True)

    class Meta:
        model = Attribute
        fields = ['id', 'name', 'slug', 'categories', 'is_active', 'values', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'alt_text', 'display_order', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'product', 'sku', 'name', 'price', 'stock', 'attributes', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProductDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDocument
        fields = ['id', 'product', 'name', 'file', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False
    )
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False, allow_null=True
    )
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    documents = ProductDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'user', 'category', 'category_id', 'brand', 'brand_id',
            'name', 'slug', 'sku', 'manufacturer_reference',
            'short_description', 'description',
            'price', 'old_price', 'promotional_price', 'vat',
            'stock', 'low_stock_threshold', 'warranty', 'weight', 'dimensions',
            'is_active', 'is_featured', 'is_new', 'is_best_seller',
            'attributes', 'images', 'variants', 'documents',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('price') and data.get('promotional_price') and data['promotional_price'] > data['price']:
            raise serializers.ValidationError("Promotional price cannot be greater than price")
        return data


class ProductAdminSerializer(serializers.ModelSerializer):
    """Full write serializer used by the back-office admin.

    Includes every editable product field (including availability toggles)
    while exposing images, variants and documents as read-only nested data
    (their create/delete is handled through dedicated media endpoints).
    Allows the admin to manage active/inactive products.
    """
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', required=False, allow_null=True
    )
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', required=False, allow_null=True
    )
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    documents = ProductDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'user', 'category_id', 'brand_id',
            'name', 'slug', 'sku', 'manufacturer_reference',
            'short_description', 'description',
            'price', 'old_price', 'promotional_price', 'vat',
            'stock', 'low_stock_threshold', 'warranty', 'weight', 'dimensions',
            'is_active', 'is_featured', 'is_new', 'is_best_seller',
            'attributes', 'images', 'variants', 'documents',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        price = data.get('price')
        promo = data.get('promotional_price')
        if price is not None and promo is not None and promo > price:
            raise serializers.ValidationError(
                {"promotional_price": "Promotional price cannot be greater than price."}
            )
        return data
