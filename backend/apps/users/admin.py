from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'username', 'role', 'phone_number', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['email', 'username', 'phone_number']
    readonly_fields = ['created_at', 'updated_at']
