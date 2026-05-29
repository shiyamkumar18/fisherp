import pytest
from django.core.exceptions import ValidationError
from trading.models import MarketFishPrice, Fish
from companies.models import Company
from accounts.models import User
from decimal import Decimal

@pytest.mark.django_db
class TestMarketFishPriceIsolation:

    @pytest.fixture
    def setup_data(self):
        # Platform company / None
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.fish_a = Fish.objects.create(name="Vanjaram A", company=self.company_a)
        self.fish_b = Fish.objects.create(name="Vanjaram B", company=self.company_b)

        # Global Price
        self.global_price = MarketFishPrice.objects.create(
            fish=self.fish_a,
            city="chennai",
            market_name="Kasimedu",
            price_per_kg=Decimal("700.00"),
            is_global=True,
            company=None
        )

        # Company A override
        self.tenant_price_a = MarketFishPrice.objects.create(
            fish=self.fish_a,
            city="chennai",
            market_name="Kasimedu A",
            price_per_kg=Decimal("750.00"),
            company=self.company_a
        )

    def test_effective_price_resolution(self, setup_data):
        # Company A queries Vanjaram A in Chennai -> should get tenant price
        eff_price_a = MarketFishPrice.objects.get_effective_price(self.fish_a, "chennai", self.company_a)
        assert eff_price_a.price_per_kg == Decimal("750.00")
        assert eff_price_a.is_global is False

        # Company B queries Vanjaram A in Chennai -> should get global price fallback (no override)
        eff_price_b = MarketFishPrice.objects.get_effective_price(self.fish_a, "chennai", self.company_b)
        assert eff_price_b.price_per_kg == Decimal("700.00")
        assert eff_price_b.is_global is True

    def test_market_average_calculation(self, setup_data):
        # Add price for another city
        MarketFishPrice.objects.create(
            fish=self.fish_a,
            city="tuticorin",
            market_name="Tuti Market",
            price_per_kg=Decimal("650.00"),
            is_global=True,
            company=None
        )

        # Average for Company A: Chennai (750) + Tuticorin (650) / 2 = 700
        avg_a = MarketFishPrice.objects.get_market_average(self.fish_a, self.company_a)
        assert avg_a == Decimal("700.00")

        # Average for Company B: Chennai (700) + Tuticorin (650) / 2 = 675
        avg_b = MarketFishPrice.objects.get_market_average(self.fish_a, self.company_b)
        assert avg_b == Decimal("675.00")

    def test_safety_constraints(self, setup_data):
        # Ensure we cannot create a global price assigned to a company
        with pytest.raises(ValidationError):
            MarketFishPrice.objects.create(
                fish=self.fish_a,
                city="chennai",
                market_name="Invalid",
                price_per_kg=Decimal("800.00"),
                is_global=True,
                company=self.company_a
            )
