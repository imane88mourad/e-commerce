from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'type_label', 'title', 'message',
            'link', 'reference_id', 'reference_model',
            'is_read', 'created_at',
        ]
        read_only_fields = fields
