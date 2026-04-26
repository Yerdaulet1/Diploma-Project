from django.contrib import admin
from .models import Comment, Document, DocumentAttachment, DocumentAuditLog, DocumentVersion, Subtask


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "file_type", "status", "priority", "due_date", "workspace", "uploaded_by", "created_at"]
    list_filter = ["status", "file_type", "priority"]
    search_fields = ["title"]
    raw_id_fields = ["workspace", "uploaded_by", "current_version"]


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ["document", "version_number", "checksum", "ai_changes_detected", "created_by", "created_at"]
    list_filter = ["ai_changes_detected"]
    raw_id_fields = ["document", "created_by"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["document", "author", "is_resolved", "created_at"]
    list_filter = ["is_resolved"]
    raw_id_fields = ["document", "author", "parent"]


@admin.register(DocumentAuditLog)
class DocumentAuditLogAdmin(admin.ModelAdmin):
    """
    Аудит-лог действий с документами (раздел 6 ТЗ).
    Доступен только для просмотра — изменение записей аудита запрещено.
    """
    list_display = ["timestamp", "action", "document", "user", "ip_address"]
    list_filter = ["action"]
    search_fields = ["document__title", "user__email"]
    raw_id_fields = ["document", "user"]
    readonly_fields = ["id", "document", "user", "action", "details", "ip_address", "timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Subtask)
class SubtaskAdmin(admin.ModelAdmin):
    list_display = ["title", "document", "assignee", "status", "deadline", "created_at"]
    list_filter = ["status"]
    search_fields = ["title", "document__title"]
    raw_id_fields = ["document", "assignee"]


@admin.register(DocumentAttachment)
class DocumentAttachmentAdmin(admin.ModelAdmin):
    list_display = ["title", "document", "uploaded_by", "file_size", "created_at"]
    search_fields = ["title", "document__title"]
    raw_id_fields = ["document", "uploaded_by"]
