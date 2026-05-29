"""
Сидинг тестовых данных для проверки логики подписи.

Создаёт:
  - owner@test.kz (пароль: test12345) — роль owner
  - signer@test.kz (пароль: test12345) — роль signer
  - Workspace "Signer Test Org"
  - Документ "Контракт на подпись.docx" со status=in_review
  - DocumentContent с HTML, готовый к подписи

Запуск:
  ./venv/Scripts/python.exe seed_signer_test.py
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.users.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.documents.models import Document, DocumentVersion


def get_or_create_user(email, name, password="test12345"):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={"full_name": name, "is_active": True},
    )
    if created:
        user.set_password(password)
        user.save()
        print(f"  + created user {email}")
    else:
        # Reset password so we always know it
        user.set_password(password)
        user.full_name = name
        user.is_active = True
        user.save()
        print(f"  ~ updated user {email}")
    return user


print("=" * 60)
print("SEED: Signer flow test")
print("=" * 60)

print("\n[1/4] Users")
owner = get_or_create_user("owner@test.kz",  "Owner User")
signer = get_or_create_user("signer@test.kz", "Signer User")

print("\n[2/4] Workspace")
ws, created = Workspace.objects.get_or_create(
    title="Signer Test Org",
    defaults={
        "type": Workspace.WorkspaceType.ORGANIZATION,
        "status": Workspace.WorkspaceStatus.ACTIVE,
        "created_by": owner,
    },
)
if created:
    print(f"  + created workspace {ws.id}")
else:
    print(f"  ~ workspace already exists {ws.id}")

print("\n[3/4] Members")
WorkspaceMember.objects.update_or_create(
    workspace=ws, user=owner,
    defaults={"role": WorkspaceMember.Role.OWNER},
)
print(f"  [OK]{owner.email}: owner")

WorkspaceMember.objects.update_or_create(
    workspace=ws, user=signer,
    defaults={"role": WorkspaceMember.Role.SIGNER, "step_order": 1},
)
print(f"  [OK]{signer.email}: signer (step 1)")

print("\n[4/4] Document")
sample_html = """
<h1>Договор оказания услуг</h1>
<p><strong>Дата:</strong> 30 мая 2026 г.</p>
<p>Настоящий договор заключается между сторонами на оказание консультационных услуг.</p>
<h2>1. Предмет договора</h2>
<p>Исполнитель обязуется оказать Заказчику услуги в соответствии с техническим заданием.</p>
<h2>2. Стоимость и порядок оплаты</h2>
<p>Общая стоимость услуг составляет <strong>500 000 тенге</strong>. Оплата производится по факту выполнения работ.</p>
<h2>3. Подписи сторон</h2>
<p>Место для подписи (только signer может вставить):</p>
<p>&nbsp;</p>
""".strip()

doc, doc_created = Document.objects.get_or_create(
    workspace=ws,
    title="Контракт на подпись",
    defaults={
        "file_type": "docx",
        "storage_key": f"test/{ws.id}/contract-for-signer.docx",
        "uploaded_by": owner,
        "status": Document.DocumentStatus.REVIEW,
        "content": {"html": sample_html},
    },
)
if not doc_created:
    doc.content = {"html": sample_html}
    doc.status = Document.DocumentStatus.REVIEW
    doc.save(update_fields=["content", "status"])

# Ensure a version exists
ver, ver_created = DocumentVersion.objects.get_or_create(
    document=doc,
    version_number=1,
    defaults={
        "storage_key": doc.storage_key,
        "checksum": "test-checksum",
        "created_by": owner,
    },
)
if ver_created or not doc.current_version_id:
    doc.current_version = ver
    doc.save(update_fields=["current_version"])

print(f"  [OK]document {doc.id}  title='{doc.title}'  status={doc.status}")

print("\n" + "=" * 60)
print("READY. Test scenarios:")
print("=" * 60)
print(f"""
1. Log in as SIGNER:
     email:    signer@test.kz
     password: test12345
   → Open Documents → "Контракт на подпись" → see signature button in top-right.
     (Requires a saved signature in the signer's profile.)

2. Log in as OWNER:
     email:    owner@test.kz
     password: test12345
   → Open the same document → signature button should NOT appear.

Workspace ID: {ws.id}
Document ID:  {doc.id}
""")
