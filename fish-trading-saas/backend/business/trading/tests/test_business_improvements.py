import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.companies.models import Company
from business.trading.models import (
    FishCategory, Fish, Buyer, PurchaseBatch, Inventory, 
    MarketFishPrice, StockMovement, WhatsAppConfig
)
from services.trading.credit_service import CreditService
from services.trading.ai_engine import AISuggestionEngine
from tests.factories import SubscriptionFactory

User = get_user_model()
pytestmark = pytest.mark.django_db

# Helper methods matching test conventions
def _make_company(slug=None):
    import uuid
    slug = slug or f"co-{uuid.uuid4().hex[:8]}"
    return Company.objects.create(slug=slug, name="Test Co", is_active=True)

def _make_user(role="tenant_admin", company=None):
    import uuid
    username = f"user_{uuid.uuid4().hex[:8]}"
    company = company or _make_company()
    user = User(username=username, email=f"{username}@test.com", role=role, company=company)
    user.set_password("pass1234")
    user.save()
    return user

def _make_fish(tenant=None, company=None, name="vanjaram"):
    tenant = tenant or _make_user()
    company = company or tenant.company
    cat = FishCategory.objects.create(name="Cat-Test")
    return Fish.objects.create(
        name=name,
        category=cat,
        unit_type="kg",
        tenant=tenant,
        company=company,
    )

def _make_buyer(tenant=None, company=None, **kwargs):
    tenant = tenant or _make_user()
    company = company or tenant.company
    return Buyer.objects.create(
        name="Buyer Test",
        tenant=tenant,
        company=company,
        **kwargs
    )

def _make_purchase_batch(fish=None, tenant=None, **kwargs):
    tenant = tenant or _make_user()
    fish = fish or _make_fish(tenant=tenant)
    defaults = dict(
        purchase_type="package",
        fish=fish,
        number_of_packages=20,
        package_weight=Decimal("37.00"),
        price_per_kg=Decimal("100.00"),
        labour_cost=Decimal("0.00"),
        ice_cost=Decimal("0.00"),
        transport_cost=Decimal("0.00"),
        commission_cost=Decimal("0.00"),
        other_cost=Decimal("0.00"),
        amount_paid=Decimal("0.00"),
        tenant=tenant,
        company=tenant.company,
    )
    defaults.update(kwargs)
    return PurchaseBatch.objects.create(**defaults)

def _make_inventory(purchase_batch, fish=None, tenant=None):
    tenant = tenant or purchase_batch.tenant
    fish = fish or purchase_batch.fish
    company = purchase_batch.company
    inv, _ = Inventory.objects.get_or_create(
        purchase_batch=purchase_batch,
        fish=fish,
        defaults=dict(
            tenant=tenant,
            company=company,
            initial_packages=purchase_batch.number_of_packages,
            remaining_packages=purchase_batch.number_of_packages,
            sold_packages=0,
            initial_weight_kg=purchase_batch.total_weight,
            remaining_weight_kg=purchase_batch.total_weight,
        ),
    )
    return inv

# ----------------------------------------------------
# 1. Voice Parser NLP API Test
# ----------------------------------------------------
class TestVoiceParserAPI:
    def test_voice_parse_tamil_tanglish_success(self):
        user = _make_user()
        fish = _make_fish(tenant=user, name="vanjaram")
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        payload = {
            "text": "20 box vanjaram rate 420 ice 1000 transport 500",
            "language": "ta-IN"
        }
        response = client.post("/api/voice/parse/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["success"] is True
        assert data["entities"]["packages"] == 20
        assert data["entities"]["price_per_kg"] == 420
        assert data["entities"]["ice_cost"] == 1000
        assert data["entities"]["transport_cost"] == 500
        assert data["entities"]["fish_name"].lower() == "vanjaram"
        assert data["confidence_score"] >= 0.8
        assert "Save purchase ah?" in data["next_prompt"]

# ----------------------------------------------------
# 2. Customer Credit Risk System Test
# ----------------------------------------------------
class TestCreditRiskSystem:
    def test_credit_limit_validation_blocks_over_limit_sale(self):
        user = _make_user()
        SubscriptionFactory(company=user.company)
        batch = _make_purchase_batch(tenant=user)
        # Buyer with 5,000 credit limit
        buyer = _make_buyer(tenant=user, credit_limit=Decimal("5000.00"))
        _make_inventory(batch)

        client = APIClient()
        client.force_authenticate(user=user)

        # Create a sale of 5 packages @ 37kg each @ 150/kg = 37.5 * 150 = 27,750 (Exceeds 5,000 limit)
        payload = {
            "batch": batch.id,
            "buyer": buyer.id,
            "sale_type": "retail",
            "number_of_packages_sold": 5,
            "selling_weight_per_package": "37.00",
            "selling_price_per_kg": "150.00",
            "amount_received": "0.00",
        }
        response = client.post("/api/trading/sales/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "buyer" in response.data
        assert "Credit limit exceeded" in str(response.data["buyer"])

    def test_buyer_risk_score_recalculation(self):
        user = _make_user()
        buyer = _make_buyer(tenant=user, credit_limit=Decimal("10000.00"))
        
        # Calculate risk score metrics
        service = CreditService(user)
        buyer = service.calculate_buyer_metrics(buyer)
        
        # No overdue, no utilization -> Green/Low risk (<= 30)
        assert buyer.risk_score <= 30
        assert buyer.risk_category == 'green'

# ----------------------------------------------------
# 3. StockMovement Audited Ledger Test
# ----------------------------------------------------
class TestStockMovementLedger:
    def test_stock_movement_logged_on_sale(self):
        user = _make_user()
        SubscriptionFactory(company=user.company)
        batch = _make_purchase_batch(tenant=user)
        buyer = _make_buyer(tenant=user)
        inventory = _make_inventory(batch)

        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            "batch": batch.id,
            "buyer": buyer.id,
            "sale_type": "retail",
            "number_of_packages_sold": 2,
            "selling_weight_per_package": "37.00",
            "selling_price_per_kg": "120.00",
            "amount_received": "0.00",
        }
        
        # Verify no movements yet
        assert StockMovement.objects.filter(company=user.company).count() == 0
        
        response = client.post("/api/trading/sales/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify StockMovement generated automatically by signal
        movements = StockMovement.objects.filter(company=user.company)
        assert movements.count() == 1
        mv = movements.first()
        assert mv.movement_type == 'sale'
        assert mv.quantity_packages == -2
        assert mv.weight_kg == Decimal("-74.00")

# ----------------------------------------------------
# 4. AI Profit Suggestion Engine Test
# ----------------------------------------------------
class TestAISuggestionEngine:
    def test_ai_suggests_markdown_for_slow_moving_stock(self):
        import datetime
        from django.utils import timezone
        
        user = _make_user()
        batch = _make_purchase_batch(tenant=user)
        inventory = _make_inventory(batch)
        
        # Set creation date to 5 days ago to simulate slow moving stock
        five_days_ago = timezone.now() - datetime.timedelta(days=5)
        Inventory.objects.filter(id=inventory.id).update(created_at=five_days_ago)
        
        engine = AISuggestionEngine(user.company, user)
        suggestions = engine.generate_suggestions()
        
        assert len(suggestions) > 0
        slow_sug = next(s for s in suggestions if s['category'] == 'pricing')
        assert "stock moving slowly" in slow_sug["title"]
        assert slow_sug["value"] == 20.00
