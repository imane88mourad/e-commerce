from django.contrib import admin
from .models import Review, WishlistItem


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'user', 'rating', 'status', 'created_at']
    list_filter = ['status', 'rating']
    search_fields = ['title', 'comment', 'user__email', 'product__name']
    list_editable = ['status']


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'product', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'product__name']
