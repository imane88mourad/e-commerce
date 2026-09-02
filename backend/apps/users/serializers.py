from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'is_staff', 'full_name',
                  'first_name', 'last_name', 'phone_number', 'image_url', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        """Return combined first_name + last_name, or username as fallback."""
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name',
                  'phone_number', 'password', 'password2', 'role']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user
