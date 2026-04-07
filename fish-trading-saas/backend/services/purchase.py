"""
Purchase Service - Handles batch creation, inventory tracking, and supplier ledger updates
"""
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from trading.models import PurchaseBatch, Supplier, Fish, Inventory
from accounts.models_audit import AuditLog


class PurchaseService:
    """
    Service for creating purchases with batch generation.
    Each product row = 1 batch
    """

    @staticmethod
    def generate_batch_id(company, date=None):
        """
        Generate unique batch ID: B + YYYYMMDD + counter
        Example: B20260403-01
        """
        if date is None:
            date = timezone.now().date()

        date_str = date.strftime('%Y%m%d')
        
        # Count batches created on this date
        today_batches = PurchaseBatch.objects.filter(
            company=company,
            created_at__date=date
        ).count()
        
        counter = today_batches + 1
        batch_id = f"B{date_str}-{counter:02d}"
        
        return batch_id

    @staticmethod
    def validate_purchase_data(items):
        """
        Validate purchase items for required fields and data types
        """
        errors = []
        
        if not items:
            errors.append("At least one product must be added")
            return errors

        for idx, item in enumerate(items):
            # Required fields
            if not item.get('product_id'):
                errors.append(f"Item {idx + 1}: Product is required")
            
            qty = item.get('qty')
            if not qty or Decimal(str(qty)) <= 0:
                errors.append(f"Item {idx + 1}: Quantity must be > 0")
            
            cost_price = item.get('cost_price')
            if not cost_price or Decimal(str(cost_price)) <= 0:
                errors.append(f"Item {idx + 1}: Cost price must be > 0")

        return errors

    @staticmethod
    def get_price_trend_indicator(fish, current_price):
        """
        Compare current price to historical average
        Returns: 'stable', 'increased', 'decreased'
        """
        if not fish.avg_price_per_kg or fish.avg_price_per_kg == 0:
            return 'stable'
        
        current = Decimal(str(current_price))
        historical = Decimal(str(fish.avg_price_per_kg))
        
        threshold = historical * Decimal('0.05')  # 5% threshold
        
        if current > historical + threshold:
            return 'increased'
        elif current < historical - threshold:
            return 'decreased'
        else:
            return 'stable'

    @staticmethod
    @transaction.atomic
    def create_purchase(user, company, supplier_id=None, supplier_name=None,
                        items=None, payment_method='cash', amount_paid=0, notes=None):
        """
        Create purchase with batches for each item
        
        Args:
            user: Authenticated user (tenant)
            company: Company instance
            supplier_id: Existing supplier ID (optional)
            supplier_name: Supplier name for quick entry (optional)
            items: List of {product_id, qty, cost_price}
            payment_method: 'cash', 'upi', or 'credit'
            amount_paid: Amount paid in payment
            notes: Purchase notes
        
        Returns:
            {
                'success': bool,
                'batches': [batch_ids],
                'total_amount': Decimal,
                'errors': [error_messages]
            }
        """
        
        # Validate items
        errors = PurchaseService.validate_purchase_data(items)
        if errors:
            return {
                'success': False,
                'batches': [],
                'total_amount': 0,
                'errors': errors
            }

        # Get or create supplier
        supplier = None
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id, company=company)
            except Supplier.DoesNotExist:
                errors.append("Supplier not found")
        elif supplier_name:
            supplier_name = supplier_name.strip()
            supplier, created = Supplier.objects.get_or_create(
                name=supplier_name,
                company=company,
                defaults={'tenant': user}
            )

        if errors:
            return {
                'success': False,
                'batches': [],
                'total_amount': 0,
                'errors': errors
            }

        # Create batches
        created_batches = []
        total_amount = Decimal('0')
        
        for item in items:
            try:
                fish = Fish.objects.get(id=item['product_id'], company=company)
                
                qty = Decimal(str(item['qty']))
                cost_price = Decimal(str(item['cost_price']))
                
                # Generate batch ID
                batch_id = PurchaseService.generate_batch_id(company)
                
                # Calculate totals
                total_cost = qty * cost_price
                total_amount += total_cost
                
                # Get price trend
                trend = PurchaseService.get_price_trend_indicator(fish, cost_price)
                
                # Create batch
                batch = PurchaseBatch.objects.create(
                    batch_number=batch_id,
                    purchase_type='kg',  # Default to kg from requirements
                    supplier=supplier,
                    fish=fish,
                    fish_category=fish.category,
                    date=timezone.now().date(),
                    tenant=user,
                    company=company,
                    number_of_packages=1,  # Single entry for kg-based
                    package_weight=qty,
                    total_weight=qty,
                    price_per_kg=cost_price,
                    fish_cost=total_cost,
                    labour_cost=Decimal('0'),
                    ice_cost=Decimal('0'),
                    transport_cost=Decimal('0'),
                    commission_cost=Decimal('0'),
                    other_cost=Decimal('0'),
                    total_expense=total_cost,
                    actual_cost_per_kg=cost_price,
                    cost_per_package=total_cost,
                    amount_paid=amount_paid if payment_method == 'cash' else Decimal('0'),
                    status='paid' if payment_method == 'cash' else ('partial' if amount_paid > 0 else 'pending'),
                    notes=f"{notes or ''} [Trend: {trend}]",
                    estimated_expiry_date=None,  # Can be set later
                    arrival_time=timezone.now()
                )
                
                # Calculate pending amount
                if payment_method == 'cash':
                    batch.pending_amount = Decimal('0')
                else:
                    batch.pending_amount = total_cost - Decimal(str(amount_paid))
                
                batch.save()
                
                # Create inventory record for batch
                Inventory.objects.create(
                    fish=fish,
                    purchase_batch=batch,
                    initial_packages=1,
                    remaining_packages=1,
                    initial_weight_kg=qty,
                    remaining_weight_kg=qty,
                    status='in_stock',
                    tenant=user,
                    company=company
                )
                
                created_batches.append({
                    'batch_id': batch_id,
                    'batch_number': batch.batch_number,
                    'fish': fish.name,
                    'qty': qty,
                    'cost_price': cost_price,
                    'total': total_cost,
                    'trend': trend
                })
                
                # Log audit
                AuditLog.log_create(
                    user=user,
                    model_name='PurchaseBatch',
                    object_id=batch.id,
                    object_repr=f"Batch {batch_id}: {fish.name}",
                    tenant=user,
                    ip_address=None
                )
                
            except Fish.DoesNotExist:
                errors.append("Fish product not found")
            except Exception as e:
                errors.append(f"Error creating batch: {str(e)}")

        return {
            'success': len(created_batches) > 0 and len(errors) == 0,
            'batches': created_batches,
            'total_amount': total_amount,
            'payment_status': {
                'method': payment_method,
                'paid': amount_paid,
                'pending': total_amount - Decimal(str(amount_paid)) if payment_method != 'cash' else 0
            },
            'errors': errors
        }

    @staticmethod
    def get_last_purchase_prices(company, fish_id, limit=3):
        """
        Get last few purchase prices for a fish product
        Returns: [(date, price, supplier_name), ...]
        """
        purchases = PurchaseBatch.objects.filter(
            fish_id=fish_id,
            company=company,
            is_deleted=False
        ).order_by('-created_at')[:limit]
        
        prices = []
        for p in purchases:
            prices.append({
                'date': p.created_at.date().isoformat(),
                'price': float(p.price_per_kg),
                'supplier': p.supplier.name if p.supplier else 'Direct'
            })
        
        return prices

    @staticmethod
    def get_duplicate_check(company, fish_id, tolerance_minutes=30):
        """
        Check for duplicate purchase within tolerance window
        Returns: batch details if duplicate found, None otherwise
        """
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        window_start = now - timedelta(minutes=tolerance_minutes)
        
        duplicate = PurchaseBatch.objects.filter(
            fish_id=fish_id,
            company=company,
            created_at__gte=window_start,
            created_at__lte=now,
            is_deleted=False
        ).first()
        
        if duplicate:
            return {
                'batch_id': duplicate.batch_number,
                'created_at': duplicate.created_at.isoformat(),
                'qty': float(duplicate.total_weight),
                'price': float(duplicate.price_per_kg)
            }
        
        return None
