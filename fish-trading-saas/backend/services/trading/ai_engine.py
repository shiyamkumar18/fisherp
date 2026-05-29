import datetime
from decimal import Decimal
from django.db.models import Avg, Sum
from django.utils import timezone
from trading.models import Inventory, Sale, Supplier, Buyer, MarketFishPrice, Fish

class AISuggestionEngine:
    def __init__(self, company, user):
        self.company = company
        self.user = user

    def generate_suggestions(self):
        suggestions = []
        today = timezone.localdate()

        # 1. Slow-moving stock & Markdown Suggestions
        # Find inventory that was created > 4 days ago but still has significant remaining stock
        four_days_ago = timezone.now() - datetime.timedelta(days=4)
        slow_stock = Inventory.objects.filter(
            company=self.company,
            remaining_packages__gt=0,
            created_at__lt=four_days_ago
        )
        for item in slow_stock:
            fish_name = "Unknown"
            fish_id = None
            batch_id = None
            batch_number = "Unknown"
            
            if item.fish:
                fish_name = item.fish.name
                fish_id = item.fish.id
            
            if item.purchase_batch:
                batch_number = item.purchase_batch.batch_number
                batch_id = item.purchase_batch.id

            suggestions.append({
                'category': 'pricing',
                'title': f'{fish_name} stock moving slowly',
                'description': f'Batch {batch_number} has {item.remaining_packages} packages remaining after 4 days. Suggestion: Reduce price by ₹20/kg to accelerate sales.',
                'action_type': 'markdown',
                'fish_id': fish_id,
                'batch_id': batch_id,
                'value': 20.00
            })

        # 2. Expiry warnings (Shelf-life advisory)
        # Expiry near: expiry_date within next 2 days
        two_days_from_now = today + datetime.timedelta(days=2)
        expiring_stock = Inventory.objects.filter(
            company=self.company,
            remaining_packages__gt=0,
            expiry_date__lte=two_days_from_now,
            expiry_date__gte=today
        ).select_related('fish', 'purchase_batch')
        
        for item in expiring_stock:
            fish_name = "Unknown"
            fish_id = None
            batch_id = None
            batch_number = "Unknown"
            
            if item.fish:
                fish_name = item.fish.name
                fish_id = item.fish.id
            
            if item.purchase_batch:
                batch_number = item.purchase_batch.batch_number
                batch_id = item.purchase_batch.id

            suggestions.append({
                'category': 'expiry',
                'title': 'Sell fast — expiry near',
                'description': f'Batch {batch_number} of {fish_name} expires on {item.expiry_date}. Sell immediately to prevent wastage.',
                'action_type': 'clearance',
                'fish_id': fish_id,
                'batch_id': batch_id
            })

        # 3. Supplier Margin suggestions
        suppliers = Supplier.objects.filter(company=self.company, is_deleted=False)
        margin_suggestions = []
        for supplier in suppliers:
            sales = Sale.objects.filter(batch__supplier=supplier, company=self.company, is_deleted=False)
            if sales.exists():
                total_rev = sales.aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')
                total_prof = sales.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
                if total_rev > 0:
                    margin = (total_prof / total_rev) * 100
                    margin_suggestions.append((supplier, margin))
        
        if margin_suggestions:
            margin_suggestions.sort(key=lambda x: x[1], reverse=True)
            top_supplier = margin_suggestions[0][0]
            suggestions.append({
                'category': 'supplier',
                'title': f'{top_supplier.name} yields higher margins',
                'description': f'Purchasing from {top_supplier.name} has historically yielded an average profit margin of {margin_suggestions[0][1]:.1f}%. Consider increasing procurement from them.',
                'action_type': 'procure',
                'supplier_id': top_supplier.id
            })

        # 4. Debtor Payment warnings
        bad_debtors = Buyer.objects.filter(
            company=self.company, 
            is_deleted=False,
            risk_score__gt=70
        )
        for debtor in bad_debtors:
            suggestions.append({
                'category': 'risk',
                'title': f'Buyer {debtor.name} delays payments',
                'description': f'{debtor.name} has a risk score of {debtor.risk_score}/100 and average delay of {debtor.average_payment_delay_days} days. Restrict credit terms or demand cash-on-delivery.',
                'action_type': 'restrict_credit',
                'buyer_id': debtor.id
            })

        # 5. Market Demand increase suggestion
        fishes = Fish.objects.filter(company=self.company, is_active=True, is_deleted=False)
        for fish in fishes:
            recent_prices = MarketFishPrice.objects.filter(fish=fish, recorded_at__date=today)
            if recent_prices.exists():
                today_avg = recent_prices.aggregate(Avg('price_per_kg'))['price_per_kg__avg'] or Decimal('0.00')
                seven_days_ago = today - datetime.timedelta(days=7)
                weekly_avg = MarketFishPrice.objects.filter(
                    fish=fish, 
                    recorded_at__date__gte=seven_days_ago, 
                    recorded_at__date__lt=today
                ).aggregate(Avg('price_per_kg'))['price_per_kg__avg'] or Decimal('0.00')
                
                if today_avg > 0 and weekly_avg > 0 and today_avg > weekly_avg * Decimal('1.05'):
                    suggestions.append({
                        'category': 'market',
                        'title': "Today's market trend shows demand increase",
                        'description': f'Daily market average for {fish.name} is ₹{today_avg:.2f}/kg, which is higher than the weekly average of ₹{weekly_avg:.2f}/kg. Consider increasing selling prices by ₹15/kg.',
                        'action_type': 'price_increase',
                        'fish_id': fish.id,
                        'value': 15.00
                    })

        return suggestions
