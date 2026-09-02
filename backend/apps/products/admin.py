from django.contrib import admin
from .models import Category, Brand, Attribute, AttributeValue, Product, ProductImage, ProductVariant, ProductDocument

class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'is_active', 'display_order', 'created_at']
    list_filter = ['is_active', 'parent', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']

class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']

class AttributeValueInline(admin.TabularInline):
    model = AttributeValue
    extra = 1

class AttributeAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ['categories']
    inlines = [AttributeValueInline]
    readonly_fields = ['created_at']

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1

class ProductDocumentInline(admin.TabularInline):
    model = ProductDocument
    extra = 1

class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'brand', 'price', 'stock', 'is_active', 'is_featured', 'is_new', 'is_best_seller', 'created_at']
    list_filter = ['category', 'brand', 'is_active', 'is_featured', 'is_new', 'is_best_seller', 'created_at']
    search_fields = ['name', 'slug', 'sku', 'manufacturer_reference']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline, ProductVariantInline, ProductDocumentInline]
    readonly_fields = ['created_at', 'updated_at']

admin.site.register(Category, CategoryAdmin)
admin.site.register(Brand, BrandAdmin)
admin.site.register(Attribute, AttributeAdmin)
admin.site.register(Product, ProductAdmin)
