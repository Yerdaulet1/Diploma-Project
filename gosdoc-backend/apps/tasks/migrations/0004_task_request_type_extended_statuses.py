from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0003_task_created_at"),
    ]

    operations = [
        # Расширяем choices статуса (только метаданные, не меняет колонку)
        migrations.AlterField(
            model_name="task",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Ожидает"),
                    ("in_progress", "В работе"),
                    ("done", "Завершена"),
                    ("skipped", "Пропущена"),
                    ("urgent", "Срочно"),
                    ("returned", "Возвращена"),
                    ("waiting", "Ожидает ответа"),
                ],
                db_index=True,
                default="pending",
                max_length=20,
                verbose_name="Статус",
            ),
        ),
        # Добавляем поле request_type
        migrations.AddField(
            model_name="task",
            name="request_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("review", "На рассмотрение"),
                    ("approval", "На согласование"),
                    ("signature", "На подпись"),
                ],
                db_index=True,
                max_length=20,
                null=True,
                verbose_name="Тип запроса",
            ),
        ),
        # Индекс для request_type
        migrations.AddIndex(
            model_name="task",
            index=models.Index(fields=["request_type"], name="tasks_reque_request_idx"),
        ),
    ]
