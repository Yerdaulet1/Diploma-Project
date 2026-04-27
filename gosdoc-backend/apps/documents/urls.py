"""
ГосДок — URL документов (apps/documents/urls.py)
Раздел 4.5 ТЗ

Маршруты:
  Загрузка (двухэтапная, без проксирования через Django):
    POST  /documents/request-upload/               — шаг 1: получить presigned POST URL
    POST  /documents/                              — шаг 2: подтверждение, создать запись
  Документы:
    GET   /documents/                              — список
    GET   /documents/{id}/                        — деталь
    PATCH /documents/{id}/                        — обновить title
    DELETE /documents/{id}/                       — архивировать
    GET   /documents/{id}/download/               — presigned GET URL
  Версии:
    GET   /documents/{id}/versions/               — список версий
    POST  /documents/{id}/versions/request-upload/— presigned POST для новой версии (шаг 1)
    POST  /documents/{id}/versions/               — подтверждение новой версии (шаг 2)
    GET   /documents/{id}/versions/{vid}/diff/    — AI-diff
  Workflow:
    POST  /documents/{id}/workflow/start/         — запустить workflow (draft → review)
  Комментарии (вложены в документ):
    GET   /documents/{id}/comments/               — список
    POST  /documents/{id}/comments/               — создать
  Подписи (вложены в документ):
    POST  /documents/{id}/sign/                   — подписать
    GET   /documents/{id}/signatures/             — список подписей
"""

from django.urls import path

from apps.signatures.views import SignDocumentView, SignatureListView
from .views import (
    AttachmentDetailView,
    AttachmentDownloadView,
    AttachmentListCreateView,
    AttachmentRequestUploadView,
    AttachmentServerUploadView,
    CommentListCreateView,
    DocumentApproveView,
    DocumentContentView,
    DocumentCopyView,
    DocumentDetailView,
    DocumentDownloadView,
    DocumentExtractContentView,
    DocumentListCreateView,
    DocumentServerUploadView,
    DocumentVersionCreateView,
    DocumentVersionDiffView,
    DocumentVersionListView,
    DocumentWorkflowStartView,
    RequestUploadView,
    RequestVersionUploadView,
    SubtaskDetailView,
    SubtaskListCreateView,
)

urlpatterns = [
    # ---- Двухэтапная загрузка ----
    path("request-upload/", RequestUploadView.as_view(), name="document-request-upload"),
    # ---- Серверная загрузка (без presigned URL) ----
    path("server-upload/", DocumentServerUploadView.as_view(), name="document-server-upload"),

    # ---- CRUD документов ----
    path("", DocumentListCreateView.as_view(), name="document-list"),
    path("<uuid:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("<uuid:pk>/download/", DocumentDownloadView.as_view(), name="document-download"),

    # ---- Версии ----
    path("<uuid:pk>/versions/", DocumentVersionListView.as_view(), name="document-version-list"),
    path(
        "<uuid:pk>/versions/request-upload/",
        RequestVersionUploadView.as_view(),
        name="document-version-request-upload",
    ),
    # Подтверждение новой версии (после загрузки в S3)
    path(
        "<uuid:pk>/versions/confirm/",
        DocumentVersionCreateView.as_view(),
        name="document-version-confirm",
    ),
    # AI-diff конкретной версии
    path(
        "<uuid:pk>/versions/<uuid:vid>/diff/",
        DocumentVersionDiffView.as_view(),
        name="document-version-diff",
    ),

    # ---- Content (Phase 7) ----
    path("<uuid:pk>/content/", DocumentContentView.as_view(), name="document-content"),
    # ---- Extract content from S3 binary (Phase 8) ----
    path("<uuid:pk>/extract/", DocumentExtractContentView.as_view(), name="document-extract"),

    # ---- Workflow ----
    path("<uuid:pk>/workflow/start/", DocumentWorkflowStartView.as_view(), name="document-workflow-start"),

    # ---- Комментарии ----
    path("<uuid:pk>/comments/", CommentListCreateView.as_view(), name="document-comment-list"),

    # ---- Подписи ----
    path("<uuid:pk>/sign/", SignDocumentView.as_view(), name="document-sign"),
    path("<uuid:pk>/signatures/", SignatureListView.as_view(), name="document-signatures"),

    # ---- Копирование в другой кабинет ----
    path("<uuid:pk>/copy/", DocumentCopyView.as_view(), name="document-copy"),

    # ---- Согласование ----
    path("<uuid:pk>/approve/", DocumentApproveView.as_view(), name="document-approve"),

    # ---- Подзадачи ----
    path("<uuid:pk>/subtasks/", SubtaskListCreateView.as_view(), name="document-subtask-list"),
    path("<uuid:pk>/subtasks/<uuid:sid>/", SubtaskDetailView.as_view(), name="document-subtask-detail"),

    # ---- Вложения ----
    path(
        "<uuid:pk>/attachments/request-upload/",
        AttachmentRequestUploadView.as_view(),
        name="document-attachment-request-upload",
    ),
    path(
        "<uuid:pk>/attachments/server-upload/",
        AttachmentServerUploadView.as_view(),
        name="document-attachment-server-upload",
    ),
    path("<uuid:pk>/attachments/", AttachmentListCreateView.as_view(), name="document-attachment-list"),
    path(
        "<uuid:pk>/attachments/<uuid:aid>/",
        AttachmentDetailView.as_view(),
        name="document-attachment-detail",
    ),
    path(
        "<uuid:pk>/attachments/<uuid:aid>/download/",
        AttachmentDownloadView.as_view(),
        name="document-attachment-download",
    ),
]
