"""
Demo data seeder — consolidates organizations, workspaces, assigned-doc tasks
and FAQs (EN/RU/KK) into a single idempotent Django management command.

Usage:
    python manage.py seed_demo                       # seed everything
    python manage.py seed_demo --only=faqs           # only FAQs
    python manage.py seed_demo --only=orgs,assigned  # only orgs + assigned docs
    python manage.py seed_demo --me=user@example.com # treat this email as "me"
"""
from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core.models import FAQ
from apps.documents.models import Document
from apps.organizations.models import Organization
from apps.tasks.models import Task
from apps.workspaces.models import Workspace, WorkspaceMember

User = get_user_model()


DEFAULT_ME_EMAIL = "220103248@stu.sdu.edu.kz"

# (org_name, [workspace_titles]) — workspaces are linked to org if found by title
ORGS = [
    ("Suleyman Demirel University", ["Cooperation Agreement WS", "Edok"]),
    ("Ministry of Justice RK",      ["Procurement Order WS", "NDA Contract for Review"]),
    ("Astana Hub Foundation",       ["Partnership Memorandum WS", "Momentum"]),
]

# Each FAQ entry: (q_en, a_en, q_ru, a_ru, q_kk, a_kk)
# Kept inline for self-contained reproducibility on a fresh clone.
FAQ_PLATFORM = [
    (
        "What is the purpose of this platform?",
        "This platform is designed to simplify and digitalize the document management process. "
        "It allows users to create, edit, sign, and manage documents entirely online without the "
        "need for physical presence.",
        "Какова цель этой платформы?",
        "Платформа создана для того, чтобы упростить и перевести в цифровой формат процесс "
        "управления документами. Она позволяет создавать, редактировать, подписывать и вести "
        "документы полностью онлайн.",
        "Платформаның мақсаты қандай?",
        "Бұл платформа құжат айналымы үдерісін жеңілдетуге және толық цифрлық форматқа көшіруге "
        "арналған.",
    ),
    (
        "How can I register?",
        "Users can register by providing basic information such as their phone number or email. "
        "After a quick verification users gain access to their account.",
        "Как зарегистрироваться?",
        "Зарегистрироваться можно, указав номер телефона или email. После быстрой верификации "
        "пользователь получает доступ к личному кабинету.",
        "Қалай тіркелуге болады?",
        "Тіркелу үшін негізгі деректерді көрсету жеткілікті. Жылдам растаудан кейін пайдаланушы "
        "жеке кабинетке қол жеткізеді.",
    ),
    (
        "How does the electronic signature work?",
        "The platform uses a secure electronic signature system that lets users sign documents "
        "digitally with legal validity.",
        "Как работает электронная подпись?",
        "Платформа использует защищённую систему электронной подписи. Подпись юридически "
        "значима.",
        "Электрондық қолтаңба қалай жұмыс істейді?",
        "Платформа цифрлық қол қоюға мүмкіндік беретін қорғалған электрондық қолтаңба жүйесін "
        "пайдаланады. Бұл қолтаңба заңды күшке ие.",
    ),
    (
        "Do I need to print documents?",
        "No, the platform is fully digital — creation, signing and approval all happen online.",
        "Нужно ли распечатывать документы?",
        "Нет, платформа полностью цифровая — создание, подписание и согласование происходят "
        "онлайн.",
        "Құжаттарды басып шығару қажет пе?",
        "Жоқ, платформа толығымен цифрлық: барлық қадамдар онлайн режимде орындалады.",
    ),
    (
        "Is the platform secure?",
        "Yes — all information is encrypted, securely stored and protected by authentication.",
        "Безопасна ли платформа?",
        "Да, информация шифруется и хранится защищённо, доступ ограничен авторизованными "
        "пользователями.",
        "Платформа қауіпсіз бе?",
        "Иә, ақпарат шифрланады және қорғалған түрде сақталады.",
    ),
    (
        "How can I track my document status?",
        "Each document has a status (in progress / signed / completed) visible in your dashboard.",
        "Как отслеживать статус документа?",
        "Каждому документу присваивается статус, видимый в личном кабинете.",
        "Құжаттың мәртебесін қалай бақылауға болады?",
        "Әр құжатқа мәртебе беріледі, оны жеке кабинеттен көруге болады.",
    ),
    (
        "How long does it take to process a document?",
        "Time depends on type, complexity and number of participants, but is significantly "
        "shorter than paper-based workflows.",
        "Сколько времени занимает обработка документа?",
        "Зависит от типа, сложности и количества участников, но существенно короче бумажного "
        "документооборота.",
        "Құжатты өңдеу қанша уақыт алады?",
        "Уақыт құжаттың түрі мен қатысушылар санына байланысты, бірақ қағаз айналымынан "
        "әлдеқайда қысқа.",
    ),
    (
        "Can multiple people sign the same document?",
        "Yes — multi-signature is supported with roles and signing order per participant.",
        "Могут ли несколько человек подписывать один документ?",
        "Да, поддерживается мультиподпись с ролями и порядком подписания.",
        "Бір құжатқа бірнеше адам қол қоя ала ма?",
        "Иә, көп қолтаңба қолдау табады.",
    ),
    (
        "Who can use this platform?",
        "Individuals, small businesses and large organizations — for personal or corporate use.",
        "Кто может пользоваться платформой?",
        "Частные лица, малый бизнес и крупные организации — для личных и корпоративных задач.",
        "Платформаны кім қолдана алады?",
        "Жеке тұлғалар, шағын бизнес және ірі ұйымдар.",
    ),
    (
        "Is the platform free to use?",
        "Basic features are free; advanced tools require a paid subscription.",
        "Платформа бесплатная?",
        "Базовые функции бесплатны, расширенные возможности — по подписке.",
        "Платформа тегін бе?",
        "Негізгі функциялар тегін, кеңейтілген мүмкіндіктер — жазылым арқылы.",
    ),
]

FAQ_TASKS = [
    (
        "What is a task?",
        "A task is an action assigned to a user during the document workflow.",
        "Что такое задача?",
        "Задача — это действие, назначенное пользователю в рамках workflow документа.",
        "Тапсырма дегеніміз не?",
        "Тапсырма — құжат айналымы барысында пайдаланушыға тағайындалған әрекет.",
    ),
    (
        "What types of actions can a task include?",
        "Reviewing, editing, approving or signing a document.",
        "Какие действия может включать задача?",
        "Проверка, редактирование, согласование или подписание документа.",
        "Тапсырма қандай әрекеттерден тұра алады?",
        "Қарап шығу, өңдеу, мақұлдау немесе қол қою.",
    ),
    (
        "How are tasks connected to documents?",
        "Tasks are created inside documents and represent steps in the workflow.",
        "Как задачи связаны с документами?",
        "Задачи создаются внутри документов и являются шагами workflow.",
        "Тапсырмалар құжаттармен қалай байланысты?",
        "Тапсырмалар құжат ішінде құрылады және workflow қадамдары болып табылады.",
    ),
    (
        "What is a subtask?",
        "A smaller step within a task — breaks complex tasks into manageable pieces.",
        "Что такое подзадача?",
        "Меньший шаг внутри задачи — разбивает сложные задачи на простые части.",
        "Қосымша тапсырма дегеніміз не?",
        "Тапсырманың ішіндегі шағын қадам.",
    ),
    (
        "How do I assign a task?",
        "Pick any organisation member when creating or editing the task.",
        "Как назначить задачу?",
        "Выбрать участника организации при создании или редактировании задачи.",
        "Тапсырманы қалай тағайындауға болады?",
        "Тапсырманы жасау немесе өңдеу кезінде ұйым мүшесін таңдау керек.",
    ),
    (
        "How do I track task progress?",
        "Statuses: To Do, In Progress, Completed.",
        "Как отслеживать прогресс задачи?",
        "Статусы: To Do, In Progress, Completed.",
        "Тапсырманың орындалу барысын қалай қадағалауға болады?",
        "Мәртебелер: To Do, In Progress, Completed.",
    ),
]

FAQ_ORGS = [
    (
        "What is a workspace?",
        "Your main working environment with organisation, members, projects and documents.",
        "Что такое workspace?",
        "Основная рабочая среда: организация, участники, проекты и документы.",
        "Workspace дегеніміз не?",
        "Негізгі жұмыс ортасы: ұйым, қатысушылар, жобалар мен құжаттар.",
    ),
    (
        "What is a project?",
        "A structured space for related documents and tasks.",
        "Что такое проект?",
        "Структурированное пространство для связанных документов и задач.",
        "Жоба дегеніміз не?",
        "Байланысты құжаттар мен тапсырмаларға арналған құрылымдалған кеңістік.",
    ),
    (
        "What are assigned documents?",
        "Documents given to you or your team requiring an action.",
        "Что такое назначенные документы?",
        "Документы, переданные вам или команде, требующие действия.",
        "Тағайындалған құжаттар деген не?",
        "Сізге немесе командаға жұмыс істеуге берілген, әрекет талап ететін құжаттар.",
    ),
    (
        "How are workspace, projects, and assigned documents connected?",
        "Workspace → Projects → Documents → Tasks assigned to users.",
        "Как связаны workspace, проекты и назначенные документы?",
        "Workspace → Проекты → Документы → Задачи пользователей.",
        "Workspace, жобалар және тағайындалған құжаттар қалай байланысты?",
        "Workspace → Жобалар → Құжаттар → Пайдаланушылардың тапсырмалары.",
    ),
    (
        "How do I get assigned to a document?",
        "When another team member selects you for a task within a document workflow.",
        "Как меня назначают на документ?",
        "Когда другой участник команды выбирает вас для задачи в рамках workflow.",
        "Маған құжатқа тапсырма қалай тағайындалады?",
        "Команда мүшесі сізді workflow ішіндегі тапсырмаға таңдағанда.",
    ),
    (
        "What should I do when a document is assigned to me?",
        "Open it and complete the required action (review, edit, approve or sign).",
        "Что делать, когда мне назначили документ?",
        "Открыть и выполнить требуемое действие (проверить, отредактировать, согласовать, "
        "подписать).",
        "Маған құжат тағайындалғанда не істеу керек?",
        "Оны ашып, тиісті әрекетті орындау керек.",
    ),
    (
        "Can multiple users work on the same document?",
        "Yes — each may have a different role or action in the workflow.",
        "Могут ли несколько пользователей работать над одним документом?",
        "Да, у каждого может быть своя роль или действие в workflow.",
        "Бір құжатпен бірнеше пайдаланушы жұмыс істей ала ма?",
        "Иә, әрқайсысының жеке рөлі немесе әрекеті болуы мүмкін.",
    ),
]


class Command(BaseCommand):
    help = "Seed demo data: organisations, demo assigned documents and FAQs (EN/RU/KK)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            default="orgs,assigned,faqs",
            help="Comma-separated set of seeds to run: orgs, assigned, faqs.",
        )
        parser.add_argument(
            "--me",
            default=DEFAULT_ME_EMAIL,
            help="Email of the user treated as 'me' for assigned-doc seeds.",
        )

    def handle(self, *args, **opts):
        only = {p.strip() for p in opts["only"].split(",") if p.strip()}
        me_email = opts["me"]

        if "orgs" in only:
            self._seed_orgs(me_email)
        if "assigned" in only:
            self._seed_assigned(me_email)
        if "faqs" in only:
            self._seed_faqs()

        self.stdout.write(self.style.SUCCESS("Done."))

    # ------------------------------------------------------------------
    @transaction.atomic
    def _seed_orgs(self, me_email: str):
        me = User.objects.filter(email=me_email).first()
        for org_name, ws_titles in ORGS:
            org, created = Organization.objects.update_or_create(
                name=org_name,
                defaults={
                    "type": Organization.OrgType.CORPORATE,
                    "owner": me,
                },
            )
            self.stdout.write(f"[orgs] {'+' if created else '*'} {org_name}")
            for title in ws_titles:
                affected = Workspace.objects.filter(
                    title=title, organization__isnull=True,
                ).update(organization=org)
                if affected:
                    self.stdout.write(f"       linked ws '{title}' x{affected}")

    # ------------------------------------------------------------------
    @transaction.atomic
    def _seed_assigned(self, me_email: str):
        me = User.objects.filter(email=me_email).first()
        if not me:
            self.stdout.write(self.style.WARNING(
                f"[assigned] user {me_email} not found — skipped."
            ))
            return
        other = User.objects.exclude(pk=me.pk).first()
        if not other:
            self.stdout.write(self.style.WARNING(
                "[assigned] need at least one other user — skipped."
            ))
            return

        # Idempotent: drop prior demo docs/workspaces by exact title
        demo_titles = ["Cooperation Agreement", "Procurement Order"]
        Document.objects.filter(title__in=demo_titles).delete()
        Workspace.objects.filter(title__in=[
            "Cooperation Agreement WS", "Procurement Order WS",
        ]).delete()

        demos = [
            ("Cooperation Agreement WS", "Cooperation Agreement", "docx",
             Task.RequestType.SIGNATURE, 14),
            ("Procurement Order WS",     "Procurement Order",     "pdf",
             Task.RequestType.APPROVAL, 7),
        ]
        for ws_title, doc_title, file_type, req_type, due_offset in demos:
            ws = Workspace.objects.create(
                title=ws_title,
                type=Workspace.WorkspaceType.CORPORATE,
                created_by=other,
                status=Workspace.WorkspaceStatus.ACTIVE,
            )
            WorkspaceMember.objects.create(
                workspace=ws, user=other, role=WorkspaceMember.Role.EDITOR, step_order=1,
            )
            WorkspaceMember.objects.create(
                workspace=ws, user=me, role=WorkspaceMember.Role.SIGNER, step_order=2,
            )
            doc = Document.objects.create(
                workspace=ws,
                title=doc_title,
                file_type=file_type,
                storage_key=f"demo/{doc_title.replace(' ', '_').lower()}.{file_type}",
                status=Document.DocumentStatus.REVIEW,
                uploaded_by=other,
                priority=Document.Priority.HIGH,
                due_date=date.today() + timedelta(days=due_offset),
                metadata={
                    "description": "Demo document seeded by `seed_demo` command.",
                },
            )
            Task.objects.create(
                workspace=ws, document=doc, assigned_to=other, step_order=1,
                title=f"Step 1: Edit {doc_title}",
                status=Task.TaskStatus.DONE,
                request_type=Task.RequestType.REVIEW,
            )
            Task.objects.create(
                workspace=ws, document=doc, assigned_to=me, step_order=2,
                title=f"Step 2: {req_type.label} {doc_title}",
                status=Task.TaskStatus.IN_PROGRESS,
                request_type=req_type,
                due_date=date.today() + timedelta(days=due_offset),
            )
            self.stdout.write(f"[assigned] + {doc_title} (ws={ws.title})")

    # ------------------------------------------------------------------
    @transaction.atomic
    def _seed_faqs(self):
        catalog = {
            FAQ.PLATFORM: FAQ_PLATFORM,
            FAQ.TASKS:    FAQ_TASKS,
            FAQ.ORGS:     FAQ_ORGS,
        }
        for topic, items in catalog.items():
            FAQ.objects.filter(topic=topic).delete()
            FAQ.objects.bulk_create([
                FAQ(
                    topic=topic,
                    question=q_en, answer=a_en,
                    question_ru=q_ru, answer_ru=a_ru,
                    question_kk=q_kk, answer_kk=a_kk,
                    order=i, is_active=True,
                )
                for i, (q_en, a_en, q_ru, a_ru, q_kk, a_kk) in enumerate(items, start=1)
            ])
            self.stdout.write(f"[faqs] {topic}: {len(items)}")
