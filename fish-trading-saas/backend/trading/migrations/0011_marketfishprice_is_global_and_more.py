# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trading', '0010_sale_status_salespermissionconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='marketfishprice',
            name='is_global',
            field=models.BooleanField(default=False, help_text='True if this is a platform-managed global price.'),
        ),
        migrations.RemoveIndex(
            model_name='marketfishprice',
            name='trading_mar_company_28cccd_idx',
        ),
        migrations.RemoveIndex(
            model_name='marketfishprice',
            name='trading_mar_city_6b00c9_idx',
        ),
        migrations.AddIndex(
            model_name='marketfishprice',
            index=models.Index(fields=['company', 'fish', 'city', 'recorded_at'], name='trading_mar_company_3f972b_idx'),
        ),
        migrations.AddIndex(
            model_name='marketfishprice',
            index=models.Index(fields=['fish', 'city', 'recorded_at'], name='trading_mar_fish_id_ac459d_idx'),
        ),
        migrations.AddIndex(
            model_name='marketfishprice',
            index=models.Index(fields=['company', 'fish'], name='trading_mar_company_28cccd_idx'),
        ),
        migrations.AddIndex(
            model_name='marketfishprice',
            index=models.Index(fields=['city', 'recorded_at'], name='trading_mar_city_6b00c9_idx'),
        ),
    ]
