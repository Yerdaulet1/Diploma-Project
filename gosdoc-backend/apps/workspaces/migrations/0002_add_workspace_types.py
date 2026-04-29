from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0001_workspace_organization_nullable"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workspace",
            name="type",
            field=models.CharField(
                choices=[
                    ("individual",   "Индивидуальный"),
                    ("corporate",    "Корпоративный"),
                    ("personal",     "Персональный"),
                    ("team",         "Команда"),
                    ("organization", "Организация"),
                ],
                max_length=20,
                verbose_name="Тип кабинета",
            ),
        ),
    ]
