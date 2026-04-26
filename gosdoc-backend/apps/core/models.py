"""
ГосДок — Модели Core (apps/core/models.py)
"""

from django.db import models


class FAQ(models.Model):
    PLATFORM = "platform"
    TASKS = "tasks"
    ORGS = "orgs"
    TOPIC_CHOICES = [
        (PLATFORM, "About Platform"),
        (TASKS, "Task Management"),
        (ORGS, "Organization & Projects"),
    ]

    topic = models.CharField(max_length=50, choices=TOPIC_CHOICES, verbose_name="Раздел")
    question = models.TextField(verbose_name="Вопрос")
    answer = models.TextField(verbose_name="Ответ")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    is_active = models.BooleanField(default=True, verbose_name="Активен")

    class Meta:
        db_table = "faqs"
        ordering = ["topic", "order"]
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"

    def __str__(self):
        return f"[{self.topic}] {self.question[:60]}"
