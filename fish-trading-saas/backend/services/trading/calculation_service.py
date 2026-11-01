from decimal import Decimal

class CalculationService:
    """
    Pure functional calculation service for financial metrics.
    No database side effects.
    """

    @staticmethod
    def calculate_purchase_metrics(
        packages: int,
        package_weight: Decimal,
        price_per_kg: Decimal,
        labour_cost: Decimal,
        ice_cost: Decimal,
        transport_cost: Decimal,
        commission_cost: Decimal,
        other_cost: Decimal,
        amount_paid: Decimal,
        explicit_pending: Decimal = None
    ) -> dict:
        """
        Calculates financial metrics for a purchase batch.
        """
        packages = packages or 0
        package_weight = package_weight or Decimal("0.00")
        price_per_kg = price_per_kg or Decimal("0.00")
        labour_cost = labour_cost or Decimal("0.00")
        ice_cost = ice_cost or Decimal("0.00")
        transport_cost = transport_cost or Decimal("0.00")
        commission_cost = commission_cost or Decimal("0.00")
        other_cost = other_cost or Decimal("0.00")
        amount_paid = amount_paid or Decimal("0.00")

        total_weight = round(Decimal(str(packages)) * package_weight, 2)
        fish_cost = round(total_weight * price_per_kg, 2)

        total_expense = round(fish_cost + labour_cost + ice_cost
                             + transport_cost + commission_cost + other_cost, 2)

        actual_cost_per_kg = Decimal("0.00")
        if total_weight > 0:
            actual_cost_per_kg = round(total_expense / total_weight, 2)

        cost_per_package = round(actual_cost_per_kg * package_weight, 2)
        
        pending_amount = round(total_expense - amount_paid, 2)
        
        # Apply explicit pending override if provided
        if explicit_pending is not None and explicit_pending >= 0:
            pending_amount = round(explicit_pending, 2)
            amount_paid = round(total_expense - explicit_pending, 2)

        status = 'pending'
        if pending_amount <= 0 and total_expense > 0:
            status = 'paid'
        elif amount_paid > 0:
            status = 'partial'

        return {
            'total_weight': total_weight,
            'fish_cost': fish_cost,
            'total_expense': total_expense,
            'actual_cost_per_kg': actual_cost_per_kg,
            'cost_per_package': cost_per_package,
            'pending_amount': pending_amount,
            'amount_paid': amount_paid,
            'status': status
        }

    @staticmethod
    def calculate_sale_metrics(
        packages_sold: int,
        selling_weight_per_package: Decimal,
        selling_price_per_kg: Decimal,
        batch_buy_price: Decimal,
        amount_received: Decimal,
        discount_amount: Decimal,
        discount_percent: Decimal,
        tax_percent: Decimal
    ) -> dict:
        """
        Calculates financial metrics for a sale.
        """
        packages_sold = packages_sold or 0
        selling_weight_per_package = selling_weight_per_package or Decimal("0.00")
        selling_price_per_kg = selling_price_per_kg or Decimal("0.00")
        batch_buy_price = batch_buy_price or Decimal("0.00")
        amount_received = amount_received or Decimal("0.00")
        discount_amount = discount_amount or Decimal("0.00")
        discount_percent = discount_percent or Decimal("0.00")
        tax_percent = tax_percent or Decimal("0.00")

        total_weight_sold = round(Decimal(str(packages_sold)) * selling_weight_per_package, 2)
        total_revenue = round(total_weight_sold * selling_price_per_kg, 2)
        total_cost = round(total_weight_sold * batch_buy_price, 2)

        profit = round(total_revenue - total_cost, 2)
        
        profit_margin_percent = Decimal("0.00")
        if total_revenue > 0:
            profit_margin_percent = round((profit / total_revenue) * 100, 2)

        discounted_amount = total_revenue
        if discount_amount > 0:
            discounted_amount = round(discounted_amount - discount_amount, 2)
        elif discount_percent > 0:
            discounted_amount = round(discounted_amount - round(total_revenue * discount_percent / Decimal("100.00"), 4), 2)

        tax_amount = round(discounted_amount * tax_percent / Decimal("100.00"), 2)
        final_amount = round(discounted_amount + tax_amount, 2)
        pending_amount = round(final_amount - amount_received, 2)

        return {
            'total_revenue': total_revenue,
            'total_cost': total_cost,
            'profit': profit,
            'profit_margin_percent': profit_margin_percent,
            'tax_amount': tax_amount,
            'final_amount': final_amount,
            'pending_amount': pending_amount
        }
