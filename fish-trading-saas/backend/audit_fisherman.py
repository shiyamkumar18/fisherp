import os
import django
from collections import Counter
from django.db.models.functions import Lower

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from business.trading.models import PurchaseBatch, Supplier
from fuzzywuzzy import fuzz

def run_audit():
    print("--- PurchaseBatch Normalization Audit ---")
    
    total_purchases = PurchaseBatch.objects.count()
    null_supplier = PurchaseBatch.objects.filter(supplier__isnull=True).count()
    only_fisherman = PurchaseBatch.objects.filter(supplier__isnull=True).exclude(fisherman_name='').count()
    
    print(f"Total purchases: {total_purchases}")
    print(f"Purchases with null supplier: {null_supplier}")
    print(f"Purchases with ONLY fisherman_name: {only_fisherman}")
    
    # Duplicate fisherman names
    fishermen = PurchaseBatch.objects.filter(supplier__isnull=True).exclude(fisherman_name='').values_list('fisherman_name', flat=True)
    
    normalized_names = [name.strip().lower() for name in fishermen if name]
    counts = Counter(normalized_names)
    
    print("\n--- Duplicate / Raw Name Frequency ---")
    for name, count in counts.most_common(10):
        print(f"'{name}': {count} occurrences")
        
    print("\n--- Potential Spelling Variants (Fuzzy Match >= 80) ---")
    unique_names = list(set(normalized_names))
    found_variants = []
    for i, name1 in enumerate(unique_names):
        for name2 in unique_names[i+1:]:
            ratio = fuzz.ratio(name1, name2)
            if ratio >= 80:
                found_variants.append((name1, name2, ratio))
                
    for v in sorted(found_variants, key=lambda x: x[2], reverse=True)[:10]:
        print(f"{v[0]} <-> {v[1]} (Score: {v[2]})")

if __name__ == '__main__':
    run_audit()
