from django.contrib import admin
from .models import Address

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['user', 'full_name', 'city', 'state', 'phone_number', 'created_at']
    list_filter = ['city', 'state', 'created_at']
    search_fields = ['full_name', 'phone_number', 'city', 'state']
