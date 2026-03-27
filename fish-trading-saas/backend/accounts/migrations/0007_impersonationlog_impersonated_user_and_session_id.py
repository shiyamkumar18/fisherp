from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_rbac_role_and_company_alignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='impersonationlog',
            name='impersonated_user',
            field=models.ForeignKey(
                blank=True,
                help_text='Specific tenant user being impersonated',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='impersonated_sessions',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='impersonationlog',
            name='session_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='Session identifier used for this impersonation audit trail',
                max_length=64,
            ),
        ),
    ]
