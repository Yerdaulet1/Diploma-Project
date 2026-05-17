"""
Сигналы: автоиндексация в MeiliSearch + blockchain верификация.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender="documents.Document")
def on_document_save(sender, instance, **kwargs):
    from apps.core.search import index_document, delete_document
    if instance.status == "archived":
        delete_document(str(instance.id))
    else:
        try:
            # Ensure workspace and uploaded_by are loaded
            from apps.documents.models import Document
            doc = Document.objects.select_related("workspace", "uploaded_by").get(pk=instance.pk)
            index_document(doc)
        except Exception:
            pass


@receiver(post_save, sender="workspaces.Workspace")
def on_workspace_save(sender, instance, **kwargs):
    from apps.core.search import index_workspace
    try:
        from apps.workspaces.models import Workspace
        ws = Workspace.objects.prefetch_related("members").get(pk=instance.pk)
        index_workspace(ws)
    except Exception:
        pass


@receiver(post_save, sender="tasks.Task")
def on_task_complete_blockchain(sender, instance, **kwargs):
    """Создаёт blockchain блок при завершении задачи."""
    if instance.status not in ("done", "skipped"):
        return
    if not instance.document_id:
        return
    try:
        from apps.documents.blockchain import record_task_completion
        record_task_completion(instance)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("blockchain signal error: %s", exc)
