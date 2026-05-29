"""
Smoke tests for changes introduced in the recent review pass:
- Org filter on /documents/?organization=<uuid|_none|invalid>
- TaskSerializer organization_id/organization_name fields
- FaqListView returning ru/kk translation fields
- DocumentListSerializer organization fields
- /users/me/ endpoint sanity
- seed_demo management command (FAQ portion only — no S3, no email)

Goal: catch regressions in the org-aware + i18n flows we added.
"""
import io

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from apps.core.models import FAQ
from apps.organizations.models import Organization

from tests.factories import (
    DocumentFactory, OrganizationFactory, TaskFactory,
    WorkspaceFactory, WorkspaceMemberFactory,
)

User = get_user_model()
pytestmark = pytest.mark.django_db


# ----------------------------------------------------------------------
# Auth + /users/me/
# ----------------------------------------------------------------------

def test_users_me_returns_current_user(auth_client, user):
    response = auth_client.get("/api/v1/users/me/")
    assert response.status_code == 200
    assert response.data["email"] == user.email


def test_users_me_unauthorized_returns_401(api_client):
    response = api_client.get("/api/v1/users/me/")
    assert response.status_code == 401


# ----------------------------------------------------------------------
# /documents/?organization=...
# ----------------------------------------------------------------------

def test_documents_list_includes_organization_fields(auth_client, workspace, user):
    org = OrganizationFactory(name="Acme Corp")
    workspace.organization = org
    workspace.save()
    DocumentFactory(workspace=workspace, uploaded_by=user, status="draft")

    response = auth_client.get("/api/v1/documents/")
    assert response.status_code == 200
    results = response.data.get("results", response.data)
    assert len(results) >= 1
    item = results[0]
    assert "organization_id" in item
    assert "organization_name" in item
    assert "workspace_title" in item
    assert str(item["organization_id"]) == str(org.id)
    assert item["organization_name"] == "Acme Corp"


def test_documents_filter_by_valid_organization(auth_client, workspace, user):
    org_a = OrganizationFactory(name="Org A")
    org_b = OrganizationFactory(name="Org B")
    ws_a = WorkspaceFactory(created_by=user, organization=org_a)
    WorkspaceMemberFactory(workspace=ws_a, user=user, role="owner")
    ws_b = WorkspaceFactory(created_by=user, organization=org_b)
    WorkspaceMemberFactory(workspace=ws_b, user=user, role="owner")
    DocumentFactory(workspace=ws_a, uploaded_by=user, title="Doc in A")
    DocumentFactory(workspace=ws_b, uploaded_by=user, title="Doc in B")

    response = auth_client.get(f"/api/v1/documents/?organization={org_a.id}")
    assert response.status_code == 200
    results = response.data.get("results", response.data)
    titles = [d["title"] for d in results]
    assert "Doc in A" in titles
    assert "Doc in B" not in titles


def test_documents_filter_organization_invalid_uuid_returns_200(auth_client):
    """Regression: previously hitting psycopg's UUID parse raised a 500."""
    response = auth_client.get("/api/v1/documents/?organization=not-a-uuid")
    assert response.status_code == 200
    assert response.data.get("results", response.data) == []


def test_documents_filter_organization_none_returns_unlinked(auth_client, workspace, user):
    # Workspace without organization
    workspace.organization = None
    workspace.save()
    DocumentFactory(workspace=workspace, uploaded_by=user, title="Orphan")

    response = auth_client.get("/api/v1/documents/?organization=_none")
    assert response.status_code == 200
    titles = [d["title"] for d in response.data.get("results", response.data)]
    assert "Orphan" in titles


# ----------------------------------------------------------------------
# /tasks/ — organization fields & assigned-to-me filtering
# ----------------------------------------------------------------------

def test_tasks_list_includes_organization_fields(auth_client, user):
    org = OrganizationFactory(name="My Org")
    ws = WorkspaceFactory(created_by=user, organization=org)
    WorkspaceMemberFactory(workspace=ws, user=user, role="owner")
    doc = DocumentFactory(workspace=ws, uploaded_by=user)
    TaskFactory(workspace=ws, document=doc, assigned_to=user,
                status="in_progress", step_order=1)

    response = auth_client.get("/api/v1/tasks/")
    assert response.status_code == 200
    results = response.data.get("results", response.data)
    assert len(results) >= 1
    item = results[0]
    assert "organization_id" in item
    assert "organization_name" in item
    assert item["organization_name"] == "My Org"


def test_tasks_only_returns_my_tasks(auth_client, auth_client_second, user, second_user):
    """Critical: tenancy — never leak another user's tasks."""
    org = OrganizationFactory()
    ws = WorkspaceFactory(created_by=user, organization=org)
    WorkspaceMemberFactory(workspace=ws, user=user, role="owner")
    WorkspaceMemberFactory(workspace=ws, user=second_user, role="signer")
    doc = DocumentFactory(workspace=ws, uploaded_by=user)
    TaskFactory(workspace=ws, document=doc, assigned_to=user,
                status="in_progress", step_order=1, title="Mine")
    TaskFactory(workspace=ws, document=doc, assigned_to=second_user,
                status="in_progress", step_order=2, title="Theirs")

    my_resp = auth_client.get("/api/v1/tasks/?status=in_progress")
    my_titles = [t["title"] for t in my_resp.data.get("results", my_resp.data)]
    assert "Mine" in my_titles
    assert "Theirs" not in my_titles

    their_resp = auth_client_second.get("/api/v1/tasks/?status=in_progress")
    their_titles = [t["title"] for t in their_resp.data.get("results", their_resp.data)]
    assert "Theirs" in their_titles
    assert "Mine" not in their_titles


# ----------------------------------------------------------------------
# /help/faqs/ — i18n fields
# ----------------------------------------------------------------------

def test_faq_list_returns_all_translation_fields(api_client):
    FAQ.objects.all().delete()  # core migration 0001_faq seeds rows
    FAQ.objects.create(
        topic=FAQ.PLATFORM, order=1, is_active=True,
        question="Q EN", answer="A EN",
        question_ru="Q RU", answer_ru="A RU",
        question_kk="Q KK", answer_kk="A KK",
    )

    response = api_client.get("/api/v1/help/faqs/?topic=platform")
    assert response.status_code == 200
    item = response.data[0]
    assert item["question"] == "Q EN"
    assert item["question_ru"] == "Q RU"
    assert item["question_kk"] == "Q KK"
    assert item["answer_ru"] == "A RU"
    assert item["answer_kk"] == "A KK"


def test_faq_missing_translation_falls_back_to_english(api_client):
    """When a RU/KK translation is empty, response should return the EN string."""
    FAQ.objects.all().delete()
    FAQ.objects.create(
        topic=FAQ.PLATFORM, order=1, is_active=True,
        question="Only English", answer="Only English Answer",
        # ru/kk left empty → expect fallback
    )
    response = api_client.get("/api/v1/help/faqs/?topic=platform")
    item = response.data[0]
    assert item["question_ru"] == "Only English"
    assert item["question_kk"] == "Only English"
    assert item["answer_ru"] == "Only English Answer"


def test_faq_topic_filter_isolates_topics(api_client):
    FAQ.objects.all().delete()
    FAQ.objects.create(topic=FAQ.PLATFORM, order=1, question="P", answer=".")
    FAQ.objects.create(topic=FAQ.TASKS,    order=1, question="T", answer=".")

    p = api_client.get("/api/v1/help/faqs/?topic=platform").data
    t = api_client.get("/api/v1/help/faqs/?topic=tasks").data
    assert [f["question"] for f in p] == ["P"]
    assert [f["question"] for f in t] == ["T"]


# ----------------------------------------------------------------------
# seed_demo command (FAQs only — no external deps)
# ----------------------------------------------------------------------

def test_seed_demo_faqs_idempotent(db):
    out = io.StringIO()
    call_command("seed_demo", "--only=faqs", stdout=out)
    first = {topic: FAQ.objects.filter(topic=topic).count()
             for topic in [FAQ.PLATFORM, FAQ.TASKS, FAQ.ORGS]}
    assert first[FAQ.PLATFORM] == 10
    assert first[FAQ.TASKS]    == 6
    assert first[FAQ.ORGS]     == 7

    # Run again — counts must stay identical (no duplicates)
    call_command("seed_demo", "--only=faqs", stdout=io.StringIO())
    second = {topic: FAQ.objects.filter(topic=topic).count()
              for topic in [FAQ.PLATFORM, FAQ.TASKS, FAQ.ORGS]}
    assert first == second


def test_seed_demo_orgs_creates_organizations(db, user):
    out = io.StringIO()
    call_command("seed_demo", f"--me={user.email}", "--only=orgs", stdout=out)
    assert Organization.objects.filter(name="Suleyman Demirel University").exists()
    assert Organization.objects.filter(name="Ministry of Justice RK").exists()
    assert Organization.objects.filter(name="Astana Hub Foundation").exists()
