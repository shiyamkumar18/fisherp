from django.core.management.base import BaseCommand
from django.db import transaction
from trading.models import PurchaseBatch
from trading.services.supplier_resolution import SupplierResolutionService

class Command(BaseCommand):
    help = 'Normalizes PurchaseBatch fisherman_name to Supplier FKs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--execute',
            action='store_true',
            help='Actually perform the database migration. If not provided, runs in dry-run/audit mode.',
        )

    def handle(self, *args, **options):
        execute = options['execute']
        
        if not execute:
            self.stdout.write(self.style.WARNING("Running in AUDIT mode. No changes will be saved. Use --execute to commit changes."))
        
        # Find all PurchaseBatch records missing a supplier
        batches = PurchaseBatch.objects.filter(supplier__isnull=True).exclude(fisherman_name='')
        
        if not batches.exists():
            self.stdout.write(self.style.SUCCESS("No unnormalized PurchaseBatch records found!"))
            return
            
        self.stdout.write(f"Found {batches.count()} PurchaseBatch records needing normalization.")
        
        processed_count = 0
        error_count = 0
        
        try:
            with transaction.atomic():
                for batch in batches:
                    fisherman_name = batch.fisherman_name
                    company = batch.company
                    
                    if not fisherman_name or not company:
                        self.stdout.write(self.style.ERROR(f"Batch {batch.id} missing name or company. Skipping."))
                        error_count += 1
                        continue
                        
                    # Resolve supplier using fuzzy match / auto-create logic
                    supplier = SupplierResolutionService.resolve_fisherman(
                        fisherman_name=fisherman_name, 
                        company=company,
                        created_by=batch.created_by
                    )
                    
                    if supplier:
                        self.stdout.write(f"Batch {batch.id}: '{fisherman_name}' -> Resolved to Supplier '{supplier.name}' (ID: {supplier.id})")
                        if execute:
                            batch.supplier = supplier
                            batch.save(update_fields=['supplier', 'fisherman_name', 'updated_at'])
                            processed_count += 1
                    else:
                        self.stdout.write(self.style.ERROR(f"Batch {batch.id}: Failed to resolve supplier for '{fisherman_name}'"))
                        error_count += 1
                        
                if not execute:
                    # Rollback changes if not explicitly executing
                    raise Exception("Audit mode complete. Rolling back transaction.")
                    
        except Exception as e:
            if str(e) == "Audit mode complete. Rolling back transaction.":
                self.stdout.write(self.style.NOTICE(str(e)))
            else:
                self.stdout.write(self.style.ERROR(f"Error during migration: {str(e)}"))
                
        if execute:
            self.stdout.write(self.style.SUCCESS(f"Normalization complete! Successfully processed {processed_count} records. Errors: {error_count}"))
