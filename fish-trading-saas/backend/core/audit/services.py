from .models import AuditLog
from .middleware import get_audit_context

class AuditLogger:
    @staticmethod
    def log(
        module, entity_type, entity_id, entity_label, action,
        before_state=None, after_state=None, changed_fields=None,
        reason="", status="success", is_sensitive=False, metadata=None
    ):
        """
        Creates an Enterprise Audit Log entry using context injected by the middleware.
        """
        context = get_audit_context() or {}
        
        # Don't log if company is missing, unless it's a global action, but in our ERP
        # everything must be tenant-bound for the enterprise audit.
        company = context.get('company')
        if not company:
            return None

        # Build the log
        return AuditLog.objects.create(
            user=context.get('user'),
            company=company,
            # If your app stores branch in session/request, inject it here
            branch=context.get('branch'),
            
            module=module,
            entity_type=entity_type,
            entity_id=str(entity_id),
            entity_label=entity_label,
            action=action,
            
            before_state=before_state,
            after_state=after_state,
            changed_fields=changed_fields or [],
            reason=reason,
            
            ip_address=context.get('ip_address'),
            browser=context.get('browser', ''),
            device=context.get('device', ''),
            os=context.get('os', ''),
            location=context.get('location', ''),
            request_id=context.get('request_id', ''),
            session_id=context.get('session_id', ''),
            
            status=status,
            is_sensitive=is_sensitive,
            
            impersonation_log_id=context.get('impersonation_log_id'),
            metadata=metadata or {}
        )
