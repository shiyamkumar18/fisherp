from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from saas_platform.companies.models import Company
from saas_platform.support.models import SupportTicket, TicketMessage

User = get_user_model()

class SupportTestCase(TestCase):
    def setUp(self):
        # Setup companies
        self.company1 = Company.objects.create(name="Company 1", slug="company-1")
        self.company2 = Company.objects.create(name="Company 2", slug="company-2")
        
        # Setup users
        self.tenant_user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="pwd", company=self.company1, role="tenant_admin"
        )
        self.tenant_user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="pwd", company=self.company2, role="tenant_admin"
        )
        self.platform_user = User.objects.create_user(
            username="support", email="support@fisherp.com", password="pwd", role="platform_support"
        )
        
        # Setup tickets
        self.ticket1 = SupportTicket.objects.create(
            tenant=self.company1, creator=self.tenant_user1, subject="Issue 1", description="Help 1"
        )
        self.ticket2 = SupportTicket.objects.create(
            tenant=self.company2, creator=self.tenant_user2, subject="Issue 2", description="Help 2"
        )
        
        self.client = APIClient()

class TestSupportTicketViewSet(SupportTestCase):
    def test_tenant_can_only_see_own_tickets(self):
        self.client.force_authenticate(user=self.tenant_user1)
        response = self.client.get('/api/support/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        items = data['results'] if 'results' in data else data
        
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['subject'], "Issue 1")
        
    def test_platform_user_can_see_all_tickets(self):
        self.client.force_authenticate(user=self.platform_user)
        response = self.client.get('/api/support/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        items = data['results'] if 'results' in data else data
        
        self.assertEqual(len(items), 2)

    def test_tenant_cannot_add_internal_message(self):
        self.client.force_authenticate(user=self.tenant_user1)
        url = f'/api/support/tickets/{self.ticket1.id}/add_message/'
        response = self.client.post(url, {'content': 'Internal Note', 'is_internal': True})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_platform_can_add_internal_message(self):
        self.client.force_authenticate(user=self.platform_user)
        url = f'/api/support/tickets/{self.ticket1.id}/add_message/'
        response = self.client.post(url, {'content': 'Internal Note', 'is_internal': True})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TicketMessage.objects.filter(ticket=self.ticket1, is_internal=True).exists())
