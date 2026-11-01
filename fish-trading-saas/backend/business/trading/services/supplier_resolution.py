import re
from fuzzywuzzy import fuzz
from business.trading.models import Supplier

class SupplierResolutionService:
    """
    Service to resolve raw fisherman names into standardized Supplier records,
    preventing duplicate identities via exact and fuzzy matching.
    """
    
    FUZZY_THRESHOLD = 80

    @classmethod
    def resolve_fisherman(cls, name: str, company, created_by=None) -> Supplier:
        """
        Takes a raw fisherman name.
        1. Normalizes the string.
        2. Tries to find an exact match.
        3. Tries to find a fuzzy match.
        4. Auto-creates a new Supplier if no match is found.
        """
        if not name or not str(name).strip():
            return None
            
        normalized_name = " ".join(str(name).strip().split())
        search_name = normalized_name.lower()
        
        # 1. Exact match (case insensitive)
        exact_match = Supplier.objects.filter(company=company, name__iexact=search_name).first()
        if exact_match:
            return exact_match
            
        # 2. Fuzzy match
        # Fetch all supplier names for the company to evaluate
        all_suppliers = Supplier.objects.filter(company=company).only('id', 'name')
        best_match = None
        highest_ratio = 0
        
        for supplier in all_suppliers:
            # We use token_sort_ratio to handle "John Doe" vs "Doe John"
            ratio = fuzz.token_sort_ratio(search_name, supplier.name.lower())
            if ratio > highest_ratio:
                highest_ratio = ratio
                best_match = supplier
                
        if highest_ratio >= cls.FUZZY_THRESHOLD and best_match:
            return best_match
            
        # 3. Create new
        new_supplier = Supplier.objects.create(
            company=company,
            name=normalized_name.title(),
            supplier_type='individual',
            is_auto_created=True,
            created_by=created_by,
            updated_by=created_by,
        )
        return new_supplier
