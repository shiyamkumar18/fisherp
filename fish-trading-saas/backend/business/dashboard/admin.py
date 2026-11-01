from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.utils import timezone


class DashboardAdminSite(admin.AdminSite):
    """Custom admin site for Dashboard analytics"""
    site_header = "Fish Trading Dashboard"
    site_title = "Dashboard Analytics"
    index_title = "Business Analytics & Reports"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name='dashboard-index'),
            path('dashboard/today/', self.admin_view(self.today_view), name='dashboard-today'),
            path('dashboard/monthly/', self.admin_view(self.monthly_view), name='dashboard-monthly'),
            path('dashboard/yearly/', self.admin_view(self.yearly_view), name='dashboard-yearly'),
            path('dashboard/pending-payments/', self.admin_view(self.pending_view), name='dashboard-pending'),
        ]
        return custom_urls + urls

    def index(self, request, extra_context=None):
        # Redirect to dashboard view instead of default admin index
        return self.dashboard_view(request)

    def dashboard_view(self, request, extra_context=None):
        from business.dashboard.models import DashboardManager
        
        today = timezone.now().date()
        
        # Get summary data
        today_summary = DashboardManager.get_today_summary(request.user)
        monthly_summary = DashboardManager.get_monthly_summary(
            year=today.year, 
            month=today.month, 
            user=request.user
        )
        pending = DashboardManager.get_pending_payments(request.user)
        
        context = {
            'title': 'Dashboard Overview',
            'today': today,
            'today_summary': today_summary,
            'monthly_summary': monthly_summary,
            'pending': pending,
        }
        return render(request, 'admin/dashboard/index.html', context)

    def today_view(self, request, extra_context=None):
        from business.dashboard.models import DashboardManager
        
        today = timezone.now().date()
        summary = DashboardManager.get_today_summary(request.user)
        
        context = {
            'title': "Today's Summary",
            'today': today,
            'summary': summary,
        }
        return render(request, 'admin/dashboard/today.html', context)

    def monthly_view(self, request, extra_context=None):
        from business.dashboard.models import DashboardManager
        
        year = int(request.GET.get('year', timezone.now().year))
        month = int(request.GET.get('month', timezone.now().month))
        
        summary = DashboardManager.get_monthly_summary(year=year, month=month, user=request.user)
        
        context = {
            'title': 'Monthly Summary',
            'year': year,
            'month': month,
            'summary': summary,
        }
        return render(request, 'admin/dashboard/monthly.html', context)

    def yearly_view(self, request, extra_context=None):
        from business.dashboard.models import DashboardManager
        
        year = int(request.GET.get('year', timezone.now().year))
        
        summary = DashboardManager.get_yearly_summary(year=year, user=request.user)
        
        context = {
            'title': 'Yearly Summary',
            'year': year,
            'summary': summary,
        }
        return render(request, 'admin/dashboard/yearly.html', context)

    def pending_view(self, request, extra_context=None):
        from business.dashboard.models import DashboardManager
        
        pending = DashboardManager.get_pending_payments(request.user)
        
        # Get detailed pending payments
        from business.trading.models import PurchaseBatch, Sale
        
        if request.user.is_superuser:
            pending_purchases = PurchaseBatch.objects.filter(pending_amount__gt=0)
            pending_sales = Sale.objects.filter(pending_amount__gt=0)
        else:
            scope = {'company': request.user.company} if request.user.company_id else {'tenant': request.user}
            pending_purchases = PurchaseBatch.objects.filter(
                **scope,
                pending_amount__gt=0
            )
            pending_sales = Sale.objects.filter(
                **scope,
                pending_amount__gt=0
            )
        
        context = {
            'title': 'Pending Payments',
            'pending': pending,
            'pending_purchases': pending_purchases[:20],
            'pending_sales': pending_sales[:20],
        }
        return render(request, 'admin/dashboard/pending.html', context)


# Create instance of custom admin site
dashboard_site = DashboardAdminSite(name='dashboard_admin')
