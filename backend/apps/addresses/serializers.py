from rest_framework import serializers
from .models import Address

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'user', 'full_name', 'phone_number', 'pincode', 'area', 'city', 'state', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
