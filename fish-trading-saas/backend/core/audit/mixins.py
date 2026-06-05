import json
from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict
from .services import AuditLogger

SENSITIVE_FIELDS = {'password', 'token', 'secret', 'key', 'jwt'}

class AuditableModelMixin(models.Model):
    """
    Mixin to automatically log creates, updates, and deletes to the Enterprise AuditLog.
    """
    class Meta:
        abstract = True

    def _get_audit_module(self):
        # Can be overridden by subclasses
        return self._meta.app_label

    def _get_audit_label(self):
        # Can be overridden
        return str(self)
        
    def _sanitize_dict(self, data):
        clean_data = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_FIELDS):
                clean_data[k] = '[REDACTED]'
            else:
                clean_data[k] = v
        return clean_data

    def _serialize_state(self):
        try:
            # model_to_dict might fail on complex fields (like ManyToMany), 
            # so we use a robust conversion or handle exceptions.
            data = model_to_dict(self)
            # Ensure JSON serializable
            json_str = json.dumps(data, cls=DjangoJSONEncoder)
            return self._sanitize_dict(json.loads(json_str))
        except Exception:
            return {}

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        before_state = None
        changed_fields = []
        after_state = None

        if not is_new:
            # Look up the old state
            try:
                old_instance = self.__class__.objects.get(pk=self.pk)
                before_state = old_instance._serialize_state()
            except self.__class__.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Build after state
        after_state = self._serialize_state()

        if is_new:
            action = 'CREATE'
            changed_fields = list(after_state.keys())
        else:
            action = 'UPDATE'
            if before_state:
                # Calculate delta
                for k, v in after_state.items():
                    if k in before_state and before_state[k] != v:
                        changed_fields.append(k)
                        
                # If nothing changed, don't log an update.
                if not changed_fields:
                    return

        # Prepare Delta (Only store changed fields to save space)
        delta_before = {}
        delta_after = {}
        if before_state and after_state:
            for field in changed_fields:
                delta_before[field] = before_state.get(field)
                delta_after[field] = after_state.get(field)
        elif is_new:
            delta_after = after_state

        AuditLogger.log(
            module=self._get_audit_module(),
            entity_type=self._meta.object_name,
            entity_id=self.pk,
            entity_label=self._get_audit_label(),
            action=action,
            before_state=delta_before if not is_new else None,
            after_state=delta_after,
            changed_fields=changed_fields,
        )

    def delete(self, *args, **kwargs):
        before_state = self._serialize_state()
        
        AuditLogger.log(
            module=self._get_audit_module(),
            entity_type=self._meta.object_name,
            entity_id=self.pk,
            entity_label=self._get_audit_label(),
            action='DELETE',
            before_state=before_state,
        )
        super().delete(*args, **kwargs)
