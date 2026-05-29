import pytest
from django.test import TestCase
from trading.models import Supplier
from companies.models import Company
from trading.services.supplier_resolution import SupplierResolutionService

class SupplierResolutionServiceTests(TestCase):
    
    def setUp(self):
        self.company = Company.objects.create(name="Test Company")
        self.supplier1 = Supplier.objects.create(
            company=self.company,
            name="Raja",
            supplier_type='individual'
        )

    def test_exact_match(self):
        """Should resolve to existing exact match ignoring case"""
        supplier = SupplierResolutionService.resolve_fisherman("RAJA", self.company)
        self.assertEqual(supplier.id, self.supplier1.id)

    def test_fuzzy_match(self):
        """Should resolve to existing match if similarity >= 80"""
        supplier = SupplierResolutionService.resolve_fisherman("Rajaa", self.company)
        self.assertEqual(supplier.id, self.supplier1.id)

    def test_auto_creation_for_new_name(self):
        """Should create a new supplier if no match found"""
        supplier = SupplierResolutionService.resolve_fisherman("John Fisher", self.company)
        self.assertNotEqual(supplier.id, self.supplier1.id)
        self.assertEqual(supplier.name, "John Fisher")
        self.assertTrue(supplier.is_auto_created)

    def test_token_sort_ratio(self):
        """Should handle out of order names"""
        Supplier.objects.create(
            company=self.company,
            name="John Doe",
            supplier_type='individual'
        )
        supplier = SupplierResolutionService.resolve_fisherman("Doe John", self.company)
        self.assertEqual(supplier.name, "John Doe")
