"""
ГосДок — Сериализаторы задач (apps/tasks/serializers.py)
"""

from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)
    document_title = serializers.CharField(source="document.title", read_only=True)

    workspace_name = serializers.CharField(source="workspace.title", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "workspace", "workspace_name", "document", "document_title",
            "assigned_to", "assigned_to_name",
            "step_order", "title", "status", "request_type",
            "due_date", "completed_at", "created_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at"]
