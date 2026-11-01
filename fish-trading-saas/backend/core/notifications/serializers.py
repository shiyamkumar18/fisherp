from rest_framework import serializers
from .models import Notification, NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'category', 'priority', 
            'delivery_type', 'icon', 'action_url', 'metadata', 
            'is_read', 'created_at', 'expires_at'
        ]
        read_only_fields = fields

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['email_enabled', 'sms_enabled', 'opt_out_categories']
