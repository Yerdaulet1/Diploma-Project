"""
ГосДок — Сериализаторы задач (apps/tasks/serializers.py)
"""

from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)
    document_title = serializers.CharField(source="document.title", read_only=True)

    workspace_name = serializers.CharField(source="workspace.title", read_only=True)
    organization_id = serializers.UUIDField(source="workspace.organization_id", read_only=True)
    organization_name = serializers.CharField(source="workspace.organization.name", read_only=True)
    document_progress = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "workspace", "workspace_name",
            "organization_id", "organization_name",
            "document", "document_title",
            "assigned_to", "assigned_to_name",
            "step_order", "title", "status", "request_type",
            "document_progress",
            "due_date", "completed_at", "created_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at"]

    def get_document_progress(self, obj) -> int:
        """Прогресс согласования документа: выполнено шагов / всего, в %."""
        qs = Task.objects.filter(document_id=obj.document_id)
        total = qs.count()
        if not total:
            return 0
        done = qs.filter(status=Task.TaskStatus.DONE).count()
        return round(done / total * 100)
