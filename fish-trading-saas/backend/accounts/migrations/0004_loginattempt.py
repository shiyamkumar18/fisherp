# Generated migration for LoginAttempt model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_schema_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='LoginAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('ip_address', models.GenericIPAddressField()),
                ('status', models.CharField(choices=[('success', 'Successful Login'), ('failed', 'Failed Login'), ('locked', 'Account Locked')], default='failed', max_length=20)),
                ('attempted_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user_agent', models.TextField(blank=True, help_text='Browser/Client user agent')),
            ],
            options={
                'ordering': ['-attempted_at'],
            },
        ),
        migrations.AddIndex(
            model_name='loginattempt',
            index=models.Index(fields=['email', '-attempted_at'], name='accounts_lo_email_idx'),
        ),
        migrations.AddIndex(
            model_name='loginattempt',
            index=models.Index(fields=['ip_address', '-attempted_at'], name='accounts_lo_ip_idx'),
        ),
    ]
