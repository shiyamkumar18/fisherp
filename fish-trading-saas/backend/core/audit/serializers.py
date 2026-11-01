from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default="System")
    user_initials = serializers.SerializerMethodField()
    impersonator_username = serializers.CharField(source='impersonation_log.platform_user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'module', 'entity_type', 'entity_id', 'entity_label', 
            'action', 'before_state', 'after_state', 'changed_fields', 
            'reason', 'ip_address', 'device', 'os', 'browser', 'location', 
            'request_id', 'status', 'is_sensitive', 'performed_at', 
            'username', 'user_initials', 'impersonator_username'
        ]
        read_only_fields = fields

    def get_user_initials(self, obj):
        if obj.user and obj.user.username:
            return obj.user.username[0].upper()
        return "S" # System
