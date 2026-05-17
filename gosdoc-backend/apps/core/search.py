"""
ГосДок — MeiliSearch service (apps/core/search.py)
Индексирование и поиск документов, workspace'ов, пользователей.
"""

import logging

import meilisearch
from django.conf import settings

logger = logging.getLogger(__name__)

MEILI_URL     = getattr(settings, "MEILISEARCH_URL",    "http://127.0.0.1:7700")
MEILI_KEY     = getattr(settings, "MEILISEARCH_KEY",    "gosdoc-meili-key-2026")
IDX_DOCUMENTS = "documents"
IDX_WORKSPACES = "workspaces"


def get_client() -> meilisearch.Client:
    return meilisearch.Client(MEILI_URL, MEILI_KEY)


def _ensure_indexes():
    client = get_client()
    try:
        # Documents index
        client.create_index(IDX_DOCUMENTS, {"primaryKey": "id"})
    except Exception:
        pass
    try:
        client.index(IDX_DOCUMENTS).update_searchable_attributes(
            ["title", "content_text", "file_type", "workspace_title", "uploaded_by_name"]
        )
        client.index(IDX_DOCUMENTS).update_filterable_attributes(
            ["workspace_id", "status", "file_type", "uploaded_by_id"]
        )
        client.index(IDX_DOCUMENTS).update_sortable_attributes(["created_at", "updated_at"])
        client.index(IDX_DOCUMENTS).update_ranking_rules([
            "words", "typo", "proximity", "attribute", "sort", "exactness"
        ])
    except Exception as e:
        logger.warning("MeiliSearch index setup: %s", e)

    try:
        client.create_index(IDX_WORKSPACES, {"primaryKey": "id"})
    except Exception:
        pass
    try:
        client.index(IDX_WORKSPACES).update_searchable_attributes(["title", "description", "type"])
        client.index(IDX_WORKSPACES).update_filterable_attributes(["member_ids", "created_by_id"])
    except Exception as e:
        logger.warning("MeiliSearch workspace index setup: %s", e)


def _doc_to_record(document) -> dict:
    content_text = ""
    try:
        if document.content and isinstance(document.content, dict):
            content_text = document.content.get("html", "") or ""
            # Strip basic HTML tags
            import re
            content_text = re.sub(r"<[^>]+>", " ", content_text)[:2000]
    except Exception:
        pass
    return {
        "id":              str(document.id),
        "title":           document.title or "",
        "file_type":       document.file_type or "",
        "status":          document.status or "",
        "workspace_id":    str(document.workspace_id),
        "workspace_title": document.workspace.title if document.workspace else "",
        "uploaded_by_id":  str(document.uploaded_by_id) if document.uploaded_by_id else "",
        "uploaded_by_name": document.uploaded_by.full_name if document.uploaded_by else "",
        "content_text":    content_text,
        "created_at":      document.created_at.isoformat() if document.created_at else "",
        "updated_at":      document.updated_at.isoformat() if document.updated_at else "",
    }


def _ws_to_record(workspace) -> dict:
    member_ids = list(workspace.members.values_list("user_id", flat=True))
    return {
        "id":            str(workspace.id),
        "title":         workspace.title or "",
        "description":   workspace.description or "",
        "type":          workspace.type or "",
        "created_by_id": str(workspace.created_by_id) if workspace.created_by_id else "",
        "member_ids":    [str(m) for m in member_ids],
    }


# ── Public API ──────────────────────────────────────────────────────────────

def index_document(document):
    """Индексирует или обновляет документ в MeiliSearch."""
    try:
        _ensure_indexes()
        get_client().index(IDX_DOCUMENTS).add_documents([_doc_to_record(document)])
        logger.debug("MeiliSearch: indexed document %s", document.id)
    except Exception as e:
        logger.warning("MeiliSearch index_document error: %s", e)


def delete_document(document_id: str):
    """Удаляет документ из индекса."""
    try:
        get_client().index(IDX_DOCUMENTS).delete_document(str(document_id))
    except Exception as e:
        logger.warning("MeiliSearch delete_document error: %s", e)


def index_workspace(workspace):
    """Индексирует или обновляет workspace."""
    try:
        _ensure_indexes()
        get_client().index(IDX_WORKSPACES).add_documents([_ws_to_record(workspace)])
    except Exception as e:
        logger.warning("MeiliSearch index_workspace error: %s", e)


def search_documents(query: str, workspace_ids: list, limit: int = 20, offset: int = 0) -> dict:
    """
    Ищет документы по query в рамках доступных workspace_ids.
    Возвращает словарь с hits и totalHits.
    """
    try:
        filters = " OR ".join(f'workspace_id = "{wid}"' for wid in workspace_ids)
        result = get_client().index(IDX_DOCUMENTS).search(query, {
            "filter":           filters if workspace_ids else None,
            "limit":            limit,
            "offset":           offset,
            "attributesToHighlight": ["title", "content_text"],
            "highlightPreTag":  "<mark>",
            "highlightPostTag": "</mark>",
        })
        return result
    except Exception as e:
        logger.error("MeiliSearch search error: %s", e)
        return {"hits": [], "estimatedTotalHits": 0}


def search_workspaces(query: str, user_id: str, limit: int = 10) -> dict:
    """Ищет workspace'ы, доступные пользователю."""
    try:
        result = get_client().index(IDX_WORKSPACES).search(query, {
            "filter": f'member_ids = "{user_id}" OR created_by_id = "{user_id}"',
            "limit":  limit,
        })
        return result
    except Exception as e:
        logger.error("MeiliSearch workspace search error: %s", e)
        return {"hits": [], "estimatedTotalHits": 0}


def reindex_all():
    """Переиндексирует все документы и workspace'ы. Запускать из management command."""
    from apps.documents.models import Document
    from apps.workspaces.models import Workspace

    _ensure_indexes()
    client = get_client()

    docs = list(
        Document.objects.exclude(status="archived")
        .select_related("workspace", "uploaded_by")
    )
    if docs:
        records = [_doc_to_record(d) for d in docs]
        client.index(IDX_DOCUMENTS).add_documents(records)
        logger.info("MeiliSearch: reindexed %d documents", len(docs))

    workspaces = list(Workspace.objects.prefetch_related("members").all())
    if workspaces:
        records = [_ws_to_record(w) for w in workspaces]
        client.index(IDX_WORKSPACES).add_documents(records)
        logger.info("MeiliSearch: reindexed %d workspaces", len(workspaces))
