# Generated manually

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('trading', '0011_marketfishprice_is_global_and_more'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['company', 'date'], name='trading_sal_company_3f78e4_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['company', 'payment_status'], name='trading_sal_company_ac65df_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['company', 'buyer'], name='trading_sal_company_1bd98e_idx'),
        ),
        migrations.AddIndex(
            model_name='purchasebatch',
            index=models.Index(fields=['company', 'date'], name='trading_pur_company_6c12f4_idx'),
        ),
        migrations.AddIndex(
            model_name='purchasebatch',
            index=models.Index(fields=['company', 'status'], name='trading_pur_company_db3a8f_idx'),
        ),
        migrations.AddIndex(
            model_name='purchasebatch',
            index=models.Index(fields=['company', 'supplier'], name='trading_pur_company_2de81c_idx'),
        ),
        migrations.AddIndex(
            model_name='purchasebatch',
            index=models.Index(fields=['company', 'fish'], name='trading_pur_company_9a01bf_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['company', 'date', 'payment_type'], name='trading_pay_company_ab123c_idx'),
        ),
    ]
