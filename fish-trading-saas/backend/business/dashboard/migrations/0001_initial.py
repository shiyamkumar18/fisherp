# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyInventorySummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('stock_value', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('low_stock_count', models.IntegerField(default=0)),
                ('spoilage_loss', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_inventory', to='companies.company')),
            ],
        ),
        migrations.CreateModel(
            name='DailyPurchaseSummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('purchase_count', models.IntegerField(default=0)),
                ('total_weight', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('total_cost', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('pending_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_purchases', to='companies.company')),
            ],
        ),
        migrations.CreateModel(
            name='DailySalesSummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('sales_count', models.IntegerField(default=0)),
                ('total_revenue', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('total_cost', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('total_profit', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('pending_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('avg_margin_percent', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('total_packages_sold', models.IntegerField(default=0)),
                ('total_weight_sold', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_sales', to='companies.company')),
            ],
        ),
        migrations.AddIndex(
            model_name='dailyinventorysummary',
            index=models.Index(fields=['company', 'date'], name='dashboard_d_company_8a66a1_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='dailyinventorysummary',
            unique_together={('company', 'date')},
        ),
        migrations.AddIndex(
            model_name='dailypurchasesummary',
            index=models.Index(fields=['company', 'date'], name='dashboard_d_company_5f1a5f_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='dailypurchasesummary',
            unique_together={('company', 'date')},
        ),
        migrations.AddIndex(
            model_name='dailysalessummary',
            index=models.Index(fields=['company', 'date'], name='dashboard_d_company_e4ba43_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='dailysalessummary',
            unique_together={('company', 'date')},
        ),
    ]
