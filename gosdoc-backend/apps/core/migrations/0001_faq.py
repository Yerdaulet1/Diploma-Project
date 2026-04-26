"""
ГосДок — Migration: create faqs table + seed initial data.
"""

from django.db import migrations, models


FAQ_SEED = [
    # platform
    ("platform", "What usage limits apply when using this platform?",
     "You can use the platform and its features with limited access depending on your plan or usage level. "
     "Free users may have daily or monthly limits on certain tools and actions.\n"
     "We may show a notification when you are approaching your usage limit and inform you once the limit has been reached.\n"
     "To continue using all features without interruption, you can upgrade your access or continue using the platform in the next available period.",
     0),
    ("platform", "What file formats are supported for documents?",
     "The platform supports ODT (editable word documents), ODS (editable spreadsheets), PDF, and DOCX for upload. "
     "Editable documents (ODT/ODS) can be opened directly in the built-in editor.",
     1),
    ("platform", "Is my data secure on this platform?",
     "Yes. All documents and user data are encrypted at rest and in transit using industry-standard protocols. "
     "Files are stored in a secure cloud object storage with access control.",
     2),
    ("platform", "Can I access the platform from mobile devices?",
     "The platform is designed as a responsive web application and can be accessed from any modern browser on mobile, tablet, or desktop.",
     3),
    ("platform", "How do I contact support?",
     "You can use the AI Assistant on this page to get instant answers, or send a message through the Help & Support section. "
     "Our team responds within one business day.",
     4),
    # tasks
    ("tasks", "How do I create a new task?",
     "Go to a project and click 'Add Document' or '+ New Task' to create a new task. Fill in the title, description, deadline, and assign it to a team member.",
     0),
    ("tasks", "How do I assign a task to someone?",
     "Open the task, click on the Assignees field, and select a team member from the dropdown list.",
     1),
    ("tasks", "How do I track task progress?",
     "Each task has a progress bar and status indicator. You can also view all tasks in Table or Timeline view from the project page.",
     2),
    ("tasks", "Can I add subtasks?",
     "Yes. Open any task and scroll to the Subtasks section. Click the blue Enter button to add a new subtask and assign it to a team member.",
     3),
    ("tasks", "How do I set a deadline?",
     "In the task detail panel, click the 'Due date' field and select a date from the calendar.",
     4),
    # orgs
    ("orgs", "How do I create a new organization?",
     "During sign-up, you can create an organization. Later you can invite team members from the Projects page.",
     0),
    ("orgs", "How do I create a new project?",
     "Click '+ New project' in the sidebar, fill in project details, upload a document, and invite team members.",
     1),
    ("orgs", "How do I invite members to a project?",
     "When creating a project, step 2 asks you to enter member emails and roles. You can add 1–7 members.",
     2),
    ("orgs", "Can I archive completed projects?",
     "Yes. Completed projects appear in the Archived tab on the Projects page.",
     3),
    ("orgs", "How many projects can I have?",
     "There's no hard limit on the number of projects per organization on standard plans.",
     4),
]


def seed_faqs(apps, schema_editor):
    FAQ = apps.get_model("core", "FAQ")
    for topic, question, answer, order in FAQ_SEED:
        FAQ.objects.create(topic=topic, question=question, answer=answer, order=order)


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="FAQ",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("topic", models.CharField(
                    choices=[("platform", "About Platform"), ("tasks", "Task Management"), ("orgs", "Organization & Projects")],
                    max_length=50,
                    verbose_name="Раздел",
                )),
                ("question", models.TextField(verbose_name="Вопрос")),
                ("answer", models.TextField(verbose_name="Ответ")),
                ("order", models.PositiveIntegerField(default=0, verbose_name="Порядок")),
                ("is_active", models.BooleanField(default=True, verbose_name="Активен")),
            ],
            options={"db_table": "faqs", "ordering": ["topic", "order"], "verbose_name": "FAQ", "verbose_name_plural": "FAQs"},
        ),
        migrations.RunPython(seed_faqs, migrations.RunPython.noop),
    ]
