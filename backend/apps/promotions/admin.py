from django.contrib import admin
from .models import Promotion


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'discount_type', 'discount_value', 'is_active', 'usage_count', 'usage_limit', 'status_label']
    list_filter = ['is_active', 'discount_type']
    search_fields = ['name', 'code']
    readonly_fields = ['usage_count', 'created_at', 'updated_at']
