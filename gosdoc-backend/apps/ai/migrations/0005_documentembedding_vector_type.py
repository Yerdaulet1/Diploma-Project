"""
Конвертируем DocumentEmbedding.embedding из TEXT в vector(384).
Без этого pgvector-оператор `<=>` не работает и RAG-чат с документом возвращает 0 чанков.
"""
from django.db import migrations


SQL_TO_VECTOR = r"""
ALTER TABLE ai_documentembedding ALTER COLUMN embedding DROP DEFAULT;
ALTER TABLE ai_documentembedding ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384);
CREATE INDEX IF NOT EXISTS ai_documentembedding_embedding_idx
    ON ai_documentembedding USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
"""

SQL_TO_TEXT = r"""
DROP INDEX IF EXISTS ai_documentembedding_embedding_idx;
ALTER TABLE ai_documentembedding ALTER COLUMN embedding TYPE text USING embedding::text;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0004_documentembedding_ai_document_documen_a703d6_idx_and_more"),
    ]

    operations = [
        migrations.RunSQL(SQL_TO_VECTOR, reverse_sql=SQL_TO_TEXT),
    ]
