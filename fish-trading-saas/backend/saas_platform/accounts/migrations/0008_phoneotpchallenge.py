from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_impersonationlog_impersonated_user_and_session_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='PhoneOTPChallenge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone', models.CharField(db_index=True, max_length=20)),
                ('purpose', models.CharField(choices=[('login', 'Login'), ('register', 'Register')], default='login', max_length=20)),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('code_hash', models.CharField(max_length=255)),
                ('expires_at', models.DateTimeField()),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('is_used', models.BooleanField(default=False)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
