import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from saas_platform.support.models import SupportTicket
from saas_platform.companies.models import Company
from saas_platform.accounts.models import User

def seed():
    companies = list(Company.objects.all())
    if not companies:
        print("No companies found.")
        return
        
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        print("No admin user found.")
        return

    tickets_data = [
        {"subject": "API sync failing on POST /orders", "priority": "high", "status": "open", "minutes_ago": 10, "sla_hours": 2, "category": "technical"},
        {"subject": "Cannot assign branch manager role", "priority": "medium", "status": "open", "minutes_ago": 60, "sla_hours": 6, "category": "staff", "assignee": admin_user},
        {"subject": "Voice assistant failing on Tamil dialect", "priority": "low", "status": "in_progress", "minutes_ago": 180, "sla_hours": 24, "category": "voice", "assignee": admin_user},
        {"subject": "Billing failed for Pro tier", "priority": "critical", "status": "escalated", "minutes_ago": 300, "sla_hours": -2, "category": "billing", "assignee": admin_user},
        {"subject": "Missing purchase batch from ledger", "priority": "medium", "status": "resolved", "minutes_ago": 1440, "sla_hours": 6, "category": "bug", "assignee": admin_user},
    ]

    for data in tickets_data:
        company = random.choice(companies)
        creator = company.owner or User.objects.filter(company=company).first()
        if not creator:
            continue
            
        ticket = SupportTicket.objects.create(
            tenant=company,
            creator=creator,
            subject=data["subject"],
            description="Generated demo ticket for testing.",
            priority=data["priority"],
            status=data["status"],
            category=data["category"],
            assignee=data.get("assignee"),
        )
        
        # Override timestamps
        ticket.created_at = timezone.now() - timedelta(minutes=data["minutes_ago"])
        ticket.sla_resolution_at = timezone.now() + timedelta(hours=data["sla_hours"])
        
        if data["status"] == "resolved":
            ticket.resolved_at = timezone.now() - timedelta(minutes=data["minutes_ago"] - 120)
            ticket.closed_at = ticket.resolved_at
            
        if data["status"] == "escalated":
            ticket.is_escalated = True
            ticket.escalation_level = 2
            
        ticket.save()
        
    print(f"Successfully seeded {len(tickets_data)} support tickets!")

if __name__ == '__main__':
    seed()
