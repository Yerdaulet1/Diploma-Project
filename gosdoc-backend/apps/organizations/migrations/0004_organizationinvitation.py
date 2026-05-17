import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0003_rename_organizatio_owner_idx_organizatio_owner_i_0051c7_idx_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OrganizationInvitation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("pending","Ожидает"),("accepted","Принята"),("declined","Отклонена")], db_index=True, default="pending", max_length=20, verbose_name="Статус")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invitations", to="organizations.organization", verbose_name="Организация")),
                ("invitee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="org_invitations", to=settings.AUTH_USER_MODEL, verbose_name="Приглашённый")),
                ("inviter", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sent_org_invitations", to=settings.AUTH_USER_MODEL, verbose_name="Пригласивший")),
            ],
            options={"db_table": "organization_invitations", "ordering": ["-created_at"]},
        ),
        migrations.AlterUniqueTogether(
            name="organizationinvitation",
            unique_together={("organization", "invitee")},
        ),
    ]
