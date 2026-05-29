"""
ГосДок — Начальная миграция AI-приложения (apps/ai/migrations/0001_initial.py)

Порядок операций:
  1. CREATE EXTENSION IF NOT EXISTS vector  — активирует pgvector в PostgreSQL
     (если pgvector не установлен — продолжаем без него, RAG-функции деградируют)
  2. CreateModel DocumentEmbedding          — таблица с VectorField(384) или TEXT fallback
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


# --------------------------------------------------------------------------
# Хелперы для условной работы с pgvector
# --------------------------------------------------------------------------

def _try_create_extension(apps, schema_editor):
    """Создаём расширение vector, если pgvector установлен в PostgreSQL.

    Оборачиваем в SAVEPOINT — иначе при сбое CREATE EXTENSION текущая транзакция
    миграции переходит в aborted state и следующие шаги падают.
    """
    from django.db import connection, transaction
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "pgvector не установлен — векторный поиск недоступен. Ошибка: %s", exc
        )


def _create_embedding_table(apps, schema_editor):
    """
    Создаём таблицу ai_documentembedding.
    Если pgvector доступен — используем vector(384), иначе TEXT (RAG деградирует).
    """
    from django.db import connection
    with connection.cursor() as cursor:
        # Проверяем наличие расширения
        cursor.execute(
            "SELECT 1 FROM pg_extension WHERE extname = 'vector';"
        )
        has_vector = cursor.fetchone() is not None

        if has_vector:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_documentembedding (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    chunk_text TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    embedding vector(384) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
                );
            """)
        else:
            # Fallback: храним embedding как TEXT (для совместимости без pgvector)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_documentembedding (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    chunk_text TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    embedding TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
                );
            """)


def _drop_embedding_table(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS ai_documentembedding;")


def _add_embedding_index(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ai_docembed_doc_chunk_idx
            ON ai_documentembedding (document_id, chunk_index);
        """)


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("documents", "0002_documentauditlog"),
    ]

    operations = [
        # Шаг 1: пытаемся активировать pgvector (ошибка не останавливает миграцию)
        migrations.RunPython(
            _try_create_extension,
            reverse_code=migrations.RunPython.noop,
        ),

        # Шаг 2: создаём таблицу (с vector(384) или TEXT fallback)
        migrations.RunPython(
            _create_embedding_table,
            reverse_code=_drop_embedding_table,
        ),

        # Шаг 3: индекс для поиска по документу + порядку чанка
        migrations.RunPython(
            _add_embedding_index,
            reverse_code=migrations.RunPython.noop,
        ),

        # Шаг 4: регистрируем модель в django_content_type (через SeparateDatabaseAndState)
        migrations.SeparateDatabaseAndState(
            database_operations=[],   # таблица уже создана выше
            state_operations=[
                migrations.CreateModel(
                    name="DocumentEmbedding",
                    fields=[
                        ("id", models.UUIDField(
                            default=uuid.uuid4,
                            editable=False,
                            primary_key=True,
                            serialize=False,
                        )),
                        ("chunk_text", models.TextField(verbose_name="Текст фрагмента")),
                        ("chunk_index", models.IntegerField(verbose_name="Порядковый номер фрагмента")),
                        ("embedding", models.TextField(verbose_name="Векторное представление")),
                        ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создан")),
                        ("document", models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name="embeddings",
                            to="documents.document",
                            verbose_name="Документ",
                        )),
                    ],
                    options={
                        "verbose_name": "Векторное представление документа",
                        "verbose_name_plural": "Векторные представления документов",
                        "ordering": ["document", "chunk_index"],
                        "db_table": "ai_documentembedding",
                    },
                ),
            ],
        ),
    ]
