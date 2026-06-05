from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
        ('permissions', '0001_initial'),
    ]
    operations = [
        migrations.AddField(
            model_name='user',
            name='tenant_role',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='users', to='permissions.TenantRole', help_text='Assigned role within tenant'),
        ),
    ]

