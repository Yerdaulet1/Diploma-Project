from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_email_verification_code"),
    ]

    operations = [
        # avatar fields on User
        migrations.AddField(
            model_name="user",
            name="avatar_key",
            field=models.TextField(blank=True, null=True, verbose_name="Ключ аватара S3"),
        ),
        migrations.AddField(
            model_name="user",
            name="avatar_url",
            field=models.TextField(blank=True, null=True, verbose_name="URL аватара"),
        ),
        # EMAIL_CHANGE choice (choices-only, no DB column change)
        migrations.AlterField(
            model_name="emailverificationcode",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("registration", "Регистрация"),
                    ("password_reset", "Сброс пароля"),
                    ("email_change", "Смена email"),
                ],
                max_length=20,
            ),
        ),
        # UserSettings table
        migrations.CreateModel(
            name="UserSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notification_email", models.BooleanField(default=True, verbose_name="Email-уведомления")),
                ("notification_push", models.BooleanField(default=True, verbose_name="Push-уведомления")),
                ("language", models.CharField(default="ru", max_length=10, verbose_name="Язык интерфейса")),
                ("theme", models.CharField(default="light", max_length=20, verbose_name="Тема")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Обновлено")),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="settings",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Пользователь",
                    ),
                ),
            ],
            options={"verbose_name": "Настройки пользователя", "verbose_name_plural": "Настройки пользователей", "db_table": "user_settings"},
        ),
    ]
