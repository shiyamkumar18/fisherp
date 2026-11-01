from rest_framework import serializers
from .models import SupportTicket, TicketMessage

class TicketMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = TicketMessage
        fields = ['id', 'content', 'author', 'author_name', 'is_internal', 'created_at']
        read_only_fields = ['author', 'created_at']

class SupportTicketSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    creator_name = serializers.CharField(source='creator.username', read_only=True)
    assignee_name = serializers.CharField(source='assignee.username', read_only=True)
    messages = TicketMessageSerializer(many=True, read_only=True)
    unread_message_count = serializers.SerializerMethodField()

    def get_unread_message_count(self, obj):
        # Placeholder logic: in a real system we'd track last_read_at per user per ticket
        return obj.messages.count()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'tenant', 'tenant_name', 'creator', 'creator_name', 
            'assignee', 'assignee_name', 'department', 'severity', 'category', 'sub_category',
            'issue_type', 'tags',
            'subject', 'description', 'priority', 'status', 
            'sla_response_at', 'sla_resolution_at', 'first_response_at', 'closed_at',
            'is_escalated', 'escalation_level', 'affected_module', 'tenant_environment',
            'branch', 'linked_subscription',
            'sla_breach_at', 'created_at', 'updated_at', 'resolved_at', 'messages', 'unread_message_count'
        ]
        read_only_fields = [
            'ticket_number', 'tenant', 'creator', 'sla_response_at', 'sla_resolution_at', 
            'first_response_at', 'closed_at', 'created_at', 'updated_at', 'resolved_at'
        ]
