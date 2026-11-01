# backend/utils/security.py

def safe_dict_get(data_dict, key, allowed_keys, fallback=None):
    """
    Safely retrieves a value from a dictionary if the key is explicitly whitelisted.
    Prevents unsafe mass assignment and unvalidated dynamic access.
    """
    if key in allowed_keys and key in data_dict:
        return data_dict[key]
    return fallback

def safe_order_by(queryset, sort_field, allowed_fields, default_field):
    """
    Safely applies order_by to a Django queryset.
    """
    if not sort_field:
        return queryset.order_by(default_field)
    
    clean_field = sort_field.lstrip('-')
    if clean_field in allowed_fields:
        return queryset.order_by(sort_field)
    
    return queryset.order_by(default_field)

def safe_model_update(model_instance, data_dict, allowed_fields):
    """
    Safely updates a Django model instance using a strictly whitelisted
    set of allowed fields, preventing mass assignment vulnerabilities.
    """
    for field in allowed_fields:
        if field in data_dict:
            setattr(model_instance, field, data_dict[field])
    return model_instance
