from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from companies.models import Company
from subscriptions.models import Subscription, SubscriptionTier
from trading.models import Buyer, Fish, FishCategory, Inventory, Payment, PurchaseBatch, Sale, Supplier


TENANT_DATA = {
    "admin": {
        "tier": "premium",
        "company": {
            "name": "Tenant 1 Company",
            "slug": "tenant1",
            "city": "Kolkata",
            "state": "West Bengal",
            "phone": "9876543210",
            "email": "ops@tenant1.example.com",
            "address_line1": "22 Fish Market Road",
            "postal_code": "700001",
            "business_type": "pvt_ltd",
            "industry_type": "wholesale",
            "is_verified": True,
            "is_active": True,
        },
        "fish": [
            {"name": "Rohu", "category": "Freshwater", "unit_type": "kg", "min_price_per_kg": "145", "max_price_per_kg": "220", "avg_price_per_kg": "180"},
            {"name": "Catla", "category": "Freshwater", "unit_type": "kg", "min_price_per_kg": "160", "max_price_per_kg": "245", "avg_price_per_kg": "205"},
            {"name": "Pomfret", "category": "Saltwater", "unit_type": "kg", "min_price_per_kg": "360", "max_price_per_kg": "520", "avg_price_per_kg": "445"},
            {"name": "Seer Fish", "category": "Saltwater", "unit_type": "kg", "min_price_per_kg": "420", "max_price_per_kg": "610", "avg_price_per_kg": "510"},
        ],
        "suppliers": [
            {"name": "Riverline Fisheries", "phone": "9000000001", "supplier_type": "company", "place_of_origin": "Howrah", "payment_terms": "15_days", "credit_limit": "180000", "rating": "4.60"},
            {"name": "Harbor Catch Cooperative", "phone": "9000000002", "supplier_type": "company", "place_of_origin": "Digha", "payment_terms": "7_days", "credit_limit": "120000", "rating": "4.30"},
            {"name": "Bayfront Brokers", "phone": "9000000003", "supplier_type": "broker", "place_of_origin": "Kakdwip", "payment_terms": "30_days", "credit_limit": "90000", "rating": "4.10"},
        ],
        "buyers": [
            {"name": "Blue Harbor Market", "phone": "9880000001", "buyer_type": "wholesale", "credit_limit": "160000", "default_discount_percent": "2.5", "address": "Salt Lake Wholesale Yard"},
            {"name": "FreshCatch Retail", "phone": "9880000002", "buyer_type": "retail", "credit_limit": "45000", "default_discount_percent": "1.0", "address": "New Town Counter 4"},
            {"name": "OceanView Restaurant", "phone": "9880000003", "buyer_type": "restaurant", "credit_limit": "80000", "default_discount_percent": "0.0", "address": "Park Street"},
            {"name": "Sunrise Exporters", "phone": "9880000004", "buyer_type": "export", "credit_limit": "220000", "default_discount_percent": "3.5", "address": "Haldia Export Zone"},
        ],
        "purchases": [
            {"fish": "Rohu", "supplier": "Riverline Fisheries", "date_offset": 10, "packages": 18, "package_weight": "22", "price_per_kg": "150", "amount_paid": "45000", "labour_cost": "1200", "ice_cost": "650", "transport_cost": "1800"},
            {"fish": "Catla", "supplier": "Harbor Catch Cooperative", "date_offset": 8, "packages": 14, "package_weight": "24", "price_per_kg": "168", "amount_paid": "30000", "labour_cost": "900", "ice_cost": "500", "transport_cost": "1400"},
            {"fish": "Pomfret", "supplier": "Bayfront Brokers", "date_offset": 6, "packages": 9, "package_weight": "18", "price_per_kg": "375", "amount_paid": "25000", "labour_cost": "1100", "ice_cost": "850", "transport_cost": "1600", "commission_cost": "950"},
            {"fish": "Seer Fish", "supplier": "Riverline Fisheries", "date_offset": 0, "packages": 11, "package_weight": "20", "price_per_kg": "430", "amount_paid": "50000", "labour_cost": "1300", "ice_cost": "700", "transport_cost": "1750"},
        ],
        "sales": [
            {"batch_index": 0, "buyer": "Blue Harbor Market", "date_offset": 7, "packages": 6, "weight_per_package": "22", "price_per_kg": "205", "amount_received": "18000", "delivery_status": "delivered"},
            {"batch_index": 0, "buyer": "FreshCatch Retail", "date_offset": 5, "packages": 3, "weight_per_package": "22", "price_per_kg": "214", "amount_received": "14124", "delivery_status": "delivered"},
            {"batch_index": 1, "buyer": "OceanView Restaurant", "date_offset": 4, "packages": 5, "weight_per_package": "24", "price_per_kg": "238", "amount_received": "14000", "delivery_status": "pending"},
            {"batch_index": 2, "buyer": "Sunrise Exporters", "date_offset": 3, "packages": 3, "weight_per_package": "18", "price_per_kg": "498", "amount_received": "18000", "delivery_status": "shipped"},
            {"batch_index": 3, "buyer": "Blue Harbor Market", "date_offset": 0, "packages": 4, "weight_per_package": "20", "price_per_kg": "560", "amount_received": "0", "delivery_status": "pending"},
        ],
    },
    "tenant2_admin": {
        "tier": "basic",
        "company": {
            "name": "Tenant 2 Company",
            "slug": "tenant2",
            "city": "Visakhapatnam",
            "state": "Andhra Pradesh",
            "phone": "9876500000",
            "email": "ops@tenant2.example.com",
            "address_line1": "14 Harbor Lane",
            "postal_code": "530001",
            "business_type": "partnership",
            "industry_type": "seafood_retail",
            "is_verified": True,
            "is_active": True,
        },
        "fish": [
            {"name": "Tilapia", "category": "Freshwater", "unit_type": "kg", "min_price_per_kg": "110", "max_price_per_kg": "170", "avg_price_per_kg": "140"},
            {"name": "Mackerel", "category": "Saltwater", "unit_type": "kg", "min_price_per_kg": "190", "max_price_per_kg": "260", "avg_price_per_kg": "225"},
        ],
        "suppliers": [
            {"name": "Eastern Net Supply", "phone": "9110000001", "supplier_type": "company", "place_of_origin": "Vizag Port", "payment_terms": "7_days", "credit_limit": "60000", "rating": "4.40"},
            {"name": "Coastal Family Boats", "phone": "9110000002", "supplier_type": "individual", "place_of_origin": "Bheemunipatnam", "payment_terms": "immediate", "credit_limit": "25000", "rating": "4.00"},
        ],
        "buyers": [
            {"name": "Harbor Retail Hub", "phone": "9770000001", "buyer_type": "retail", "credit_limit": "18000", "default_discount_percent": "0.5", "address": "Main Retail Arcade"},
            {"name": "Sailor's Kitchen", "phone": "9770000002", "buyer_type": "restaurant", "credit_limit": "25000", "default_discount_percent": "1.0", "address": "Beach Road"},
        ],
        "purchases": [
            {"fish": "Tilapia", "supplier": "Eastern Net Supply", "date_offset": 5, "packages": 12, "package_weight": "16", "price_per_kg": "118", "amount_paid": "15000", "labour_cost": "500", "ice_cost": "350", "transport_cost": "700"},
            {"fish": "Mackerel", "supplier": "Coastal Family Boats", "date_offset": 2, "packages": 8, "package_weight": "14", "price_per_kg": "198", "amount_paid": "22176", "labour_cost": "300", "ice_cost": "250", "transport_cost": "550"},
        ],
        "sales": [
            {"batch_index": 0, "buyer": "Harbor Retail Hub", "date_offset": 2, "packages": 4, "weight_per_package": "16", "price_per_kg": "155", "amount_received": "6500", "delivery_status": "delivered"},
            {"batch_index": 1, "buyer": "Sailor's Kitchen", "date_offset": 1, "packages": 3, "weight_per_package": "14", "price_per_kg": "245", "amount_received": "6000", "delivery_status": "delivered"},
        ],
    },
}


class Command(BaseCommand):
    help = "Seed end-to-end demo data for frontend and backend integration testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing demo trading records for seeded companies before recreating them.",
        )

    def handle(self, *args, **options):
        from django.conf import settings

        if not settings.DEBUG:
            raise CommandError("seed_demo_data is blocked when DEBUG=False.")

        self.stdout.write("Preparing demo data seed...")
        call_command("setup_groups_and_permissions")
        call_command("seed_subscription_tiers")
        call_command("create_default_users")

        with transaction.atomic():
            self._seed_categories()

            for username, config in TENANT_DATA.items():
                user = User.objects.get(username=username)
                company = self._sync_company(user, config["company"])
                self._sync_subscription(user, company, config["tier"])

                if options["reset"]:
                    self._reset_company_records(company)

                self._seed_company_records(user, company, config)

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write("Tenant admin login: admin / admin123")
        self.stdout.write("Second tenant login: tenant2_admin / tenant2123")
        self.stdout.write("Platform login: platform_operator / platform123")

    def _seed_categories(self):
        categories = [
            {
                "name": "Freshwater",
                "category_type": "freshwater",
                "description": "River and inland catch used for the daily wholesale desk.",
                "color_code": "#0EA5E9",
                "priority": 1,
                "is_featured": True,
                "is_active": True,
            },
            {
                "name": "Saltwater",
                "category_type": "saltwater",
                "description": "Coastal and marine stock for premium trading and exports.",
                "color_code": "#0F766E",
                "priority": 2,
                "is_featured": True,
                "is_active": True,
            },
        ]

        for payload in categories:
            FishCategory.objects.update_or_create(name=payload["name"], defaults=payload)

    def _sync_company(self, user, payload):
        company, _ = Company.objects.update_or_create(
            slug=payload["slug"],
            defaults={**payload, "admin": user},
        )
        needs_user_repair = (
            user.role != "tenant_admin"
            or user.is_superuser
            or user.company_id != company.id
        )
        if needs_user_repair:
            user.role = "tenant_admin"
            user.is_superuser = False
            user.company = company
            user.schema_name = company.slug
            user.save()
        if company.admin_id != user.id:
            company.admin = user
            company.save(update_fields=["admin"])
        return company

    def _sync_subscription(self, user, company, tier_name):
        tier = SubscriptionTier.objects.get(name=tier_name)
        expiry = timezone.now() + timedelta(days=30 if tier_name == "basic" else 60)
        Subscription.objects.update_or_create(
            company=company,
            tenant=user,
            defaults={
                "tier": tier,
                "status": "active",
                "billing_cycle": "monthly",
                "billing_email": company.email or user.email,
                "billing_address": company.get_full_address(),
                "last_payment_date": timezone.now() - timedelta(days=2),
                "last_payment_amount": tier.price_monthly,
                "total_paid_till_date": tier.price_monthly,
                "payment_method": "Bank Transfer",
                "expiry_date": expiry,
                "renewal_reminder_sent": False,
                "expiry_warning_sent": False,
            },
        )

    def _reset_company_records(self, company):
        Payment.objects.filter(company=company).delete()
        Sale.objects.filter(company=company).delete()
        Inventory.objects.filter(company=company).delete()
        PurchaseBatch.objects.filter(company=company).delete()
        Buyer.objects.filter(company=company).delete()
        Supplier.objects.filter(company=company).delete()
        Fish.objects.filter(company=company).delete()

    def _seed_company_records(self, user, company, config):
        fish_map = {}
        category_map = {category.name: category for category in FishCategory.objects.all()}
        supplier_map = {}
        buyer_map = {}

        for fish_payload in config["fish"]:
            fish, _ = Fish.objects.update_or_create(
                tenant=user,
                name=fish_payload["name"],
                defaults={
                    "company": company,
                    "category": category_map[fish_payload["category"]],
                    "unit_type": fish_payload["unit_type"],
                    "min_price_per_kg": Decimal(fish_payload["min_price_per_kg"]),
                    "max_price_per_kg": Decimal(fish_payload["max_price_per_kg"]),
                    "avg_price_per_kg": Decimal(fish_payload["avg_price_per_kg"]),
                    "is_active": True,
                },
            )
            fish_map[fish.name] = fish

        for supplier_payload in config["suppliers"]:
            supplier, _ = Supplier.objects.update_or_create(
                tenant=user,
                name=supplier_payload["name"],
                phone=supplier_payload["phone"],
                defaults={
                    "company": company,
                    "supplier_type": supplier_payload["supplier_type"],
                    "place_of_origin": supplier_payload["place_of_origin"],
                    "payment_terms": supplier_payload["payment_terms"],
                    "credit_limit": Decimal(supplier_payload["credit_limit"]),
                    "rating": Decimal(supplier_payload["rating"]),
                    "is_active": True,
                    "is_verified": True,
                },
            )
            supplier_map[supplier.name] = supplier

        for buyer_payload in config["buyers"]:
            buyer, _ = Buyer.objects.update_or_create(
                tenant=user,
                name=buyer_payload["name"],
                phone=buyer_payload["phone"],
                defaults={
                    "company": company,
                    "buyer_type": buyer_payload["buyer_type"],
                    "credit_limit": Decimal(buyer_payload["credit_limit"]),
                    "address": buyer_payload["address"],
                    "default_discount_percent": Decimal(buyer_payload["default_discount_percent"]),
                    "is_active": True,
                    "is_verified": True,
                    "is_preferred": buyer_payload["buyer_type"] in {"wholesale", "export", "restaurant"},
                },
            )
            buyer_map[buyer.name] = buyer

        # Make buyer preferences visible in the frontend.
        for buyer_name, buyer in buyer_map.items():
            preferred = [fish for fish in fish_map.values() if fish.name[0] == buyer_name[0] or buyer.buyer_type in {"wholesale", "export"}]
            buyer.preferred_fish_types.set(preferred[:2] or list(fish_map.values())[:1])

        base_date = timezone.localdate()
        batches = []

        for purchase_payload in config["purchases"]:
            fish = fish_map[purchase_payload["fish"]]
            supplier = supplier_map[purchase_payload["supplier"]]
            batch = PurchaseBatch.objects.create(
                tenant=user,
                company=company,
                purchase_type="kg",
                supplier=supplier,
                fish=fish,
                fish_category=fish.category,
                date=base_date - timedelta(days=purchase_payload["date_offset"]),
                number_of_packages=purchase_payload["packages"],
                package_weight=Decimal(purchase_payload["package_weight"]),
                price_per_kg=Decimal(purchase_payload["price_per_kg"]),
                labour_cost=Decimal(purchase_payload.get("labour_cost", "0")),
                ice_cost=Decimal(purchase_payload.get("ice_cost", "0")),
                transport_cost=Decimal(purchase_payload.get("transport_cost", "0")),
                commission_cost=Decimal(purchase_payload.get("commission_cost", "0")),
                amount_paid=Decimal(purchase_payload["amount_paid"]),
                place_of_buying=supplier.place_of_origin,
                quality_grade="A",
                freshness_score=Decimal("8.70"),
                quality_score=Decimal("8.40"),
                estimated_expiry_date=base_date + timedelta(days=max(1, 3 - purchase_payload["date_offset"] // 4)),
            )
            batches.append(batch)

            if batch.amount_paid > 0:
                Payment.objects.create(
                    tenant=user,
                    company=company,
                    payment_type="purchase",
                    payment_mode="bank_transfer",
                    purchase_batch=batch,
                    supplier=supplier,
                    amount=batch.amount_paid,
                    date=batch.date,
                    reference_number=f"PUR-{batch.batch_number}",
                    notes=f"Seeded supplier payment for {batch.batch_number}",
                    processed_by=user,
                )

        sales = []
        for sale_payload in config["sales"]:
            batch = batches[sale_payload["batch_index"]]
            buyer = buyer_map[sale_payload["buyer"]]
            sale = Sale.objects.create(
                tenant=user,
                company=company,
                batch=batch,
                buyer=buyer,
                sale_type=buyer.buyer_type if buyer.buyer_type in {"retail", "wholesale", "export"} else "retail",
                date=base_date - timedelta(days=sale_payload["date_offset"]),
                number_of_packages_sold=sale_payload["packages"],
                selling_weight_per_package=Decimal(sale_payload["weight_per_package"]),
                selling_price_per_kg=Decimal(sale_payload["price_per_kg"]),
                amount_received=Decimal(sale_payload["amount_received"]),
                delivery_status=sale_payload["delivery_status"],
                due_date=base_date + timedelta(days=7),
                notes=f"Seeded sale for {buyer.name}",
            )
            sales.append(sale)

            if sale.amount_received > 0:
                Payment.objects.create(
                    tenant=user,
                    company=company,
                    payment_type="sale",
                    payment_mode="upi" if buyer.buyer_type == "retail" else "bank_transfer",
                    sale=sale,
                    buyer=buyer,
                    amount=sale.amount_received,
                    date=sale.date,
                    reference_number=f"SAL-{sale.invoice_number}",
                    notes=f"Seeded customer payment for {sale.invoice_number}",
                    processed_by=user,
                )

        for batch in batches:
            inventory = Inventory.objects.create(
                tenant=user,
                company=company,
                fish=batch.fish,
                purchase_batch=batch,
                initial_packages=batch.number_of_packages,
                remaining_packages=batch.number_of_packages,
                sold_packages=0,
                initial_weight_kg=batch.total_weight,
                remaining_weight_kg=batch.total_weight,
                expiry_date=batch.estimated_expiry_date,
                storage_location="Cold Room A" if company.slug == "tenant1" else "Cold Room B",
                bin_number=f"BIN-{batch.id}",
                rack_number=f"R-{(batch.id % 5) + 1}",
                reorder_level=4,
            )
            sold_packages = sum(sale.number_of_packages_sold for sale in sales if sale.batch_id == batch.id)
            if sold_packages:
                inventory.update_stock(sold_packages)

        for supplier in supplier_map.values():
            supplier.total_deliveries = PurchaseBatch.objects.filter(supplier=supplier).count()
            supplier.on_time_deliveries = max(0, supplier.total_deliveries - 1)
            supplier.payment_due_date = base_date + timedelta(days=7)
            supplier.save(update_fields=["total_deliveries", "on_time_deliveries", "payment_due_date"])
            supplier.update_outstanding()

        for buyer in buyer_map.values():
            buyer_sales = Sale.objects.filter(buyer=buyer)
            buyer.total_orders = buyer_sales.count()
            buyer.total_purchases = sum((sale.final_amount for sale in buyer_sales), Decimal("0.00"))
            buyer.total_credit_allowed = buyer.total_purchases
            buyer.total_credit_repaid = sum((sale.amount_received for sale in buyer_sales), Decimal("0.00"))
            buyer.current_credit_balance = sum((sale.pending_amount for sale in buyer_sales), Decimal("0.00"))
            buyer.save(
                update_fields=[
                    "total_orders",
                    "total_purchases",
                    "total_credit_allowed",
                    "total_credit_repaid",
                    "current_credit_balance",
                ]
            )
