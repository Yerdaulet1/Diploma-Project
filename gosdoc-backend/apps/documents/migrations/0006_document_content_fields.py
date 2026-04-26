from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0005_phase3_priority_subtasks_attachments"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="content",
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name="Содержимое (TipTap/Word)",
                help_text="HTML-контент TipTap для Word-документов",
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="sheet_data",
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name="Данные таблицы (Excel)",
                help_text="Структура ячеек для Excel-документов",
            ),
        ),
    ]
