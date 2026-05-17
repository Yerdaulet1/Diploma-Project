"""
eDoc — AI-сервис на базе Claude (apps/ai/services.py)

Централизованный класс для всех LLM-операций:
  - generate_document:  генерация текста официального документа по описанию
  - summarize_document: резюме и ключевые тезисы документа
  - analyze_diff:       анализ изменений между двумя версиями (используется в ai_diff.py)
  - embed_document:     индексация документа в pgvector (чанки + embeddings)
  - search_documents:   семантический поиск по кабинету через cosine similarity
  - chat_with_document: чат с конкретным документом (RAG по чанкам документа)
  - general_chat:       общий AI ассистент (RAG по кабинету + свободный режим)
  - classify_document:  ML-классификация типа документа (TF-IDF + keyword fallback)

SDK: anthropic >= 0.40.0
"""

import logging
import os
import tempfile
from typing import Optional

import anthropic
from django.conf import settings

logger = logging.getLogger(__name__)

# Параметры чанкинга текста для RAG
_CHUNK_SIZE = 500
_CHUNK_OVERLAP = 50

# Кэш SentenceTransformer на уровне процесса.
# Модель ~80MB и грузится ~7 сек — без кэша блокирует воркер на каждом AI-запросе.
_encoder_cache = None


def _get_encoder():
    """Singleton SentenceTransformer('all-MiniLM-L6-v2') на процесс."""
    global _encoder_cache
    if _encoder_cache is None:
        from sentence_transformers import SentenceTransformer
        _encoder_cache = SentenceTransformer("all-MiniLM-L6-v2")
    return _encoder_cache


# Человекочитаемые названия типов документов для промптов
DOC_TYPE_LABELS = {
    "contract": "договор",
    "order":    "приказ",
    "act":      "акт",
    "invoice":  "счёт-фактура",
}

# Системный промпт платформы — стабильная часть, выигрывает от кэширования
_PLATFORM_CONTEXT = (
    "eDoc — система электронного документооборота для государственных органов "
    "Республики Казахстан. Платформа обеспечивает создание, согласование, подписание "
    "и архивирование официальных документов в соответствии с требованиями "
    "делопроизводства РК."
)


class AIService:
    """Обёртка над Anthropic Claude API для всех LLM-операций платформы eDoc."""

    def __init__(self):
        self._claude_key = getattr(settings, "CLAUDE_API_KEY", "")
        self._model_name = getattr(settings, "CLAUDE_MODEL", "claude-opus-4-7")

        if self._claude_key:
            self._client = anthropic.Anthropic(api_key=self._claude_key)
            self._backend = "claude"
        else:
            self._backend = "none"
            logger.warning("CLAUDE_API_KEY не задан — AI-функции недоступны")

    # ------------------------------------------------------------------
    # Внутренние хелперы
    # ------------------------------------------------------------------

    def _make_system(self, instruction: str) -> list:
        """
        Собирает system-блок с cache_control.

        Кэшируемый блок включает контекст платформы + инструкцию.
        Первый запрос пишет кэш, последующие читают его за ~0.1× цены.
        """
        return [
            {
                "type": "text",
                "text": f"{_PLATFORM_CONTEXT}\n\n{instruction}",
                "cache_control": {"type": "ephemeral"},
            }
        ]

    def _generate(
        self,
        system_instruction: str,
        prompt: str,
        max_output_tokens: int = 1024,
    ) -> str:
        """Однократный запрос с системным промптом."""
        if self._backend == "none":
            return "AI недоступен: настройте CLAUDE_API_KEY."
        response = self._client.messages.create(
            model=self._model_name,
            max_tokens=max_output_tokens,
            system=self._make_system(system_instruction),
            messages=[{"role": "user", "content": prompt}],
        )
        block = next((b for b in response.content if b.type == "text"), None)
        return block.text.strip() if block else ""

    def _chat(
        self,
        system_instruction: str,
        history: list,
        message: str,
        max_output_tokens: int = 2048,
    ) -> str:
        """Multi-turn чат с историей диалога."""
        if self._backend == "none":
            return "AI недоступен: настройте CLAUDE_API_KEY."
        messages = _build_claude_history(history)
        messages.append({"role": "user", "content": message})

        response = self._client.messages.create(
            model=self._model_name,
            max_tokens=max_output_tokens,
            system=self._make_system(system_instruction),
            messages=messages,
        )
        block = next((b for b in response.content if b.type == "text"), None)
        return block.text.strip() if block else ""

    # ------------------------------------------------------------------
    # Генерация документа
    # ------------------------------------------------------------------

    def generate_document(self, description: str, doc_type: str) -> str:
        """
        Генерирует текст официального документа по описанию.

        Args:
            description: произвольное описание содержания документа
            doc_type:    тип документа (contract | order | act | invoice)

        Returns:
            Сгенерированный текст документа в виде строки.
        """
        label = DOC_TYPE_LABELS.get(doc_type, doc_type)

        system_instruction = (
            "Ты — юридический ассистент для государственных органов Казахстана. "
            "Составляй официальные документы строго в соответствии "
            "с требованиями делопроизводства РК. Используй деловой стиль, "
            "стандартные реквизиты (дата, номер, исполнитель, утверждающее лицо) "
            "и формальные юридические формулировки. "
            "Возвращай ТОЛЬКО текст документа — без пояснений, комментариев и вступлений."
        )

        prompt = (
            f"Составь {label} на основании следующего описания:\n\n"
            f"{description}\n\n"
            "Структура документа:\n"
            "1. Шапка: наименование органа, дата, номер документа\n"
            "2. Заголовок документа\n"
            "3. Преамбула / основание\n"
            "4. Основная часть с пронумерованными пунктами\n"
            "5. Реквизиты сторон / подписи\n\n"
            "Используй только официально-деловой стиль. "
            "Не добавляй пояснений от себя."
        )

        return self._generate(system_instruction, prompt, max_output_tokens=3000)

    # ------------------------------------------------------------------
    # Резюме документа
    # ------------------------------------------------------------------

    def summarize_document(self, text: str) -> dict:
        """
        Создаёт краткое резюме и список ключевых тезисов документа.

        Args:
            text: извлечённый текст документа

        Returns:
            {"summary": str, "key_points": list[str]}
        """
        truncated = text[:15_000] if len(text) > 15_000 else text

        system_instruction = (
            "Ты — аналитик официальных государственных документов. "
            "Отвечай строго на русском языке, кратко и по делу. "
            "Выделяй суть, ключевые обязательства и сроки."
        )

        prompt = (
            "Проанализируй документ и верни ответ точно в следующем формате:\n\n"
            "РЕЗЮМЕ:\n"
            "<одно-два предложения: суть документа, стороны, предмет>\n\n"
            "КЛЮЧЕВЫЕ ТЕЗИСЫ:\n"
            "- <тезис 1 — конкретный факт или обязательство>\n"
            "- <тезис 2>\n"
            "- <тезис 3>\n"
            "(от 3 до 7 тезисов; каждый — законченное утверждение)\n\n"
            f"Документ:\n{truncated}"
        )

        raw = self._generate(system_instruction, prompt, max_output_tokens=700)
        return _parse_summary_response(raw)

    # ------------------------------------------------------------------
    # Анализ diff между версиями (используется в ai_diff.py)
    # ------------------------------------------------------------------

    def analyze_diff(self, old_text: str, new_text: str) -> Optional[str]:
        """
        Генерирует краткое резюме изменений между двумя версиями документа.

        Args:
            old_text: текст предыдущей версии
            new_text: текст новой версии

        Returns:
            Строка с резюме изменений (2–3 предложения) или None при ошибке.
        """
        old_trunc = old_text[:6_000] if len(old_text) > 6_000 else old_text
        new_trunc = new_text[:6_000] if len(new_text) > 6_000 else new_text

        system_instruction = (
            "Ты — ассистент для анализа изменений в официальных документах. "
            "Отвечай на русском языке, кратко и по существу. "
            "Указывай только значимые изменения по смыслу и содержанию."
        )

        prompt = (
            "Сравни две версии документа и напиши краткое резюме изменений "
            "(2–3 предложения). Укажи конкретно: что добавлено, что удалено, "
            "что изменилось по смыслу. Игнорируй орфографические правки.\n\n"
            f"=== ПРЕДЫДУЩАЯ ВЕРСИЯ ===\n{old_trunc}\n\n"
            f"=== НОВАЯ ВЕРСИЯ ===\n{new_trunc}"
        )

        return self._generate(system_instruction, prompt, max_output_tokens=400)

    # ------------------------------------------------------------------
    # RAG: индексация документа в pgvector
    # ------------------------------------------------------------------

    def embed_document(self, document_id: str) -> None:
        """
        Читает текст документа из S3, разбивает на чанки, генерирует
        embeddings через sentence-transformers и сохраняет в DocumentEmbedding.

        Удаляет старые embeddings перед созданием новых (идемпотентная операция).

        Args:
            document_id: UUID строкой для documents.Document
        """
        from apps.documents.models import Document
        from apps.ai.models import DocumentEmbedding

        try:
            document = Document.objects.select_related("workspace").get(pk=document_id)
        except Document.DoesNotExist:
            logger.error("embed_document: Document %s не найден", document_id)
            return

        text = _download_and_extract_text(document)
        if not text:
            logger.warning(
                "embed_document: текст не извлечён для документа %s (тип=%s)",
                document_id, document.file_type,
            )
            return

        chunks = _chunk_text(text, _CHUNK_SIZE, _CHUNK_OVERLAP)
        if not chunks:
            logger.warning("embed_document: нет чанков для документа %s", document_id)
            return

        encoder = _get_encoder()
        vectors = encoder.encode(chunks, show_progress_bar=False, normalize_embeddings=True)

        DocumentEmbedding.objects.filter(document_id=document_id).delete()
        DocumentEmbedding.objects.bulk_create([
            DocumentEmbedding(
                document=document,
                chunk_text=chunk,
                chunk_index=idx,
                embedding=vector.tolist(),
            )
            for idx, (chunk, vector) in enumerate(zip(chunks, vectors))
        ])

        logger.info(
            "embed_document: документ '%s' проиндексирован (%d чанков)",
            document.title, len(chunks),
        )

    # ------------------------------------------------------------------
    # RAG: семантический поиск по кабинету
    # ------------------------------------------------------------------

    def search_documents(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 5,
    ) -> list:
        """
        Ищет top_k наиболее релевантных чанков по cosine similarity.

        Args:
            query:        поисковый запрос
            workspace_id: UUID кабинета
            top_k:        количество результатов

        Returns:
            list[dict] с ключами: document_id, title, chunk_text, score
        """
        from pgvector.django import CosineDistance
        from apps.ai.models import DocumentEmbedding

        encoder = _get_encoder()
        query_vector = encoder.encode(query, normalize_embeddings=True).tolist()

        results = (
            DocumentEmbedding.objects
            .annotate(distance=CosineDistance("embedding", query_vector))
            .filter(document__workspace_id=workspace_id)
            .select_related("document")
            .order_by("distance")[:top_k]
        )

        return [
            {
                "document_id": str(row.document_id),
                "title": row.document.title,
                "chunk_text": row.chunk_text,
                "score": round(max(0.0, 1.0 - float(row.distance)), 4),
            }
            for row in results
        ]

    # ------------------------------------------------------------------
    # Чат с конкретным документом (RAG)
    # ------------------------------------------------------------------

    def chat_with_document(
        self,
        document_id: str,
        message: str,
        chat_history: list,
    ) -> dict:
        """
        Отвечает на вопрос по конкретному документу, используя RAG.

        Алгоритм:
          1. Ищет top-5 релевантных чанков по cosine similarity
          2. Формирует контекст из найденных чанков
          3. Отправляет в Claude chat с историей диалога
          4. Возвращает {"reply": str, "context_chunks": list[dict]}

        Args:
            document_id:  UUID строкой для documents.Document
            message:      текущее сообщение пользователя
            chat_history: список {"role": "user"|"assistant", "content": "..."}

        Returns:
            {"reply": str, "context_chunks": [{"chunk_text": str, "chunk_index": int}]}
        """
        context_chunks = []
        try:
            from pgvector.django import CosineDistance
            from apps.ai.models import DocumentEmbedding
            encoder = _get_encoder()
            query_vector = encoder.encode(message, normalize_embeddings=True).tolist()
            chunk_rows = (
                DocumentEmbedding.objects
                .annotate(distance=CosineDistance("embedding", query_vector))
                .filter(document_id=document_id)
                .order_by("distance")[:5]
            )
            context_chunks = [
                {"chunk_text": row.chunk_text, "chunk_index": row.chunk_index}
                for row in chunk_rows
            ]
        except Exception as emb_exc:
            logger.warning("Document embedding unavailable (pgvector?): %s", emb_exc)

        context_text = "\n\n---\n\n".join(c["chunk_text"] for c in context_chunks)

        system_instruction = (
            "Ты — помощник для анализа официальных документов в системе ГосДок. "
            "Отвечай на вопросы, опираясь ТОЛЬКО на предоставленный текст документа. "
            "Если ответ отсутствует в документе — прямо сообщи об этом. "
            "Язык ответа: соответствует языку вопроса пользователя (русский или казахский). "
            "Ответы должны быть точными, конкретными и ссылаться на конкретные положения документа."
        )

        if context_text:
            prompt = (
                f"Фрагменты документа:\n\n{context_text}\n\n"
                f"Вопрос: {message}"
            )
        else:
            prompt = (
                f"Документ не содержит проиндексированных фрагментов. "
                f"Вопрос: {message}\n\n"
                "Сообщи пользователю, что документ ещё не проиндексирован."
            )

        reply = self._chat(
            system_instruction=system_instruction,
            history=chat_history,
            message=prompt,
            max_output_tokens=2048,
        )

        return {
            "reply": reply,
            "context_chunks": context_chunks,
        }

    # ------------------------------------------------------------------
    # ML-классификация типа документа
    # ------------------------------------------------------------------

    def classify_document(self, document_id: str) -> dict:
        """
        Классифицирует тип документа (TF-IDF + keyword fallback).

        Args:
            document_id: UUID строкой для documents.Document

        Returns:
            {"type": str, "confidence": float, "label": str}
        """
        from apps.documents.models import Document
        from apps.ai.classifier import DocumentClassifier, TYPE_LABELS

        try:
            document = Document.objects.get(pk=document_id)
        except Document.DoesNotExist:
            logger.error("classify_document: Document %s не найден", document_id)
            return {"type": "other", "confidence": 0.0, "label": TYPE_LABELS["other"]}

        text = _download_and_extract_text(document)
        if not text:
            logger.warning(
                "classify_document: текст не извлечён для документа %s",
                document_id,
            )
            return {"type": "other", "confidence": 0.0, "label": TYPE_LABELS["other"]}

        result = DocumentClassifier().classify(text)

        metadata = document.metadata or {}
        metadata["classification"] = result
        document.metadata = metadata
        document.save(update_fields=["metadata", "updated_at"])

        logger.info(
            "classify_document: документ '%s' → %s (confidence=%.2f)",
            document.title, result["type"], result["confidence"],
        )
        return result

    # ------------------------------------------------------------------
    # Общий AI ассистент (RAG по кабинету + свободный режим)
    # ------------------------------------------------------------------

    def general_chat(
        self,
        message: str,
        workspace_id: str,
        chat_history: list,
    ) -> dict:
        """
        Общий AI ассистент с поддержкой RAG по документам кабинета.

        Алгоритм:
          1. Ищет релевантные документы (top 3)
          2. Если нашёл — использует как контекст
          3. Если нет — отвечает как общий ассистент
          4. Возвращает {"reply": str, "sources": list[dict]}

        Args:
            message:      текущее сообщение пользователя
            workspace_id: UUID кабинета
            chat_history: список {"role": "user"|"assistant", "content": "..."}

        Returns:
            {"reply": str, "sources": [...]}
        """
        system_instruction = (
            "Ты — умный AI ассистент системы ГосДок для государственных служащих РК. "
            "Твои задачи:\n"
            "• Отвечать на вопросы о документах кабинета, используя предоставленный контекст\n"
            "• Помогать составлять и редактировать официальные документы\n"
            "• Разъяснять требования делопроизводства РК\n"
            "• Объяснять функции платформы ГосДок\n\n"
            "Правила:\n"
            "• Если вопрос касается конкретного документа — опирайся на предоставленный контекст\n"
            "• Если контекста нет — отвечай как общий ассистент, но укажи это\n"
            "• Отвечай на языке пользователя (русский или казахский)\n"
            "• Давай конкретные, структурированные ответы"
        )

        try:
            sources = self.search_documents(message, workspace_id, top_k=3)
        except Exception as search_exc:
            logger.warning("search_documents unavailable (pgvector?): %s", search_exc)
            sources = []

        if sources:
            context_parts = [
                f"[Документ: {s['title']}]\n{s['chunk_text']}"
                for s in sources
                if s["score"] > 0.3
            ]
            if context_parts:
                context_text = "\n\n---\n\n".join(context_parts)
                prompt = (
                    f"Контекст из документов кабинета:\n\n{context_text}\n\n"
                    f"Запрос пользователя: {message}"
                )
            else:
                prompt = message
                sources = []
        else:
            prompt = message

        reply = self._chat(
            system_instruction=system_instruction,
            history=chat_history,
            message=prompt,
            max_output_tokens=2048,
        )

        return {
            "reply": reply,
            "sources": sources,
        }


# ------------------------------------------------------------------
# Вспомогательные функции
# ------------------------------------------------------------------

def _build_claude_history(chat_history: list) -> list:
    """
    Конвертирует chat_history из {"role": "user"|"assistant", "content": "..."}
    в формат messages для Claude API.

    Claude использует те же роли "user" и "assistant".
    """
    result = []
    for msg in chat_history:
        role = "assistant" if msg["role"] == "assistant" else "user"
        result.append({"role": role, "content": msg["content"]})
    return result


def _chunk_text(text: str, chunk_size: int, overlap: int) -> list:
    """
    Разбивает текст на перекрывающиеся чанки.

    Args:
        text:       исходный текст
        chunk_size: максимальный размер чанка в символах
        overlap:    перекрытие между соседними чанками в символах

    Returns:
        Список непустых строк-чанков.
    """
    chunks = []
    stride = chunk_size - overlap
    start = 0
    while start < len(text):
        chunk = text[start: start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += stride
    return chunks


def _download_and_extract_text(document) -> str:
    """
    Скачивает файл документа из S3 во временный файл и извлекает текст.
    Возвращает пустую строку при ошибке или отсутствии S3.
    """
    from apps.documents.ai_diff import extract_text

    file_type = document.file_type.lower()
    if file_type not in {"pdf", "docx", "odt"}:
        logger.info(
            "_download_and_extract_text: тип '%s' не поддерживается (doc=%s)",
            file_type, document.id,
        )
        return ""

    if not settings.AWS_ACCESS_KEY_ID:
        logger.warning(
            "_download_and_extract_text: S3 не настроен — пропускаем (doc=%s)",
            document.id,
        )
        return ""

    from apps.documents.storage import get_s3_client

    tmp_path = None
    try:
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        s3 = get_s3_client()

        fd, tmp_path = tempfile.mkstemp(suffix=f".{file_type}")
        os.close(fd)

        s3.download_file(bucket, document.storage_key, tmp_path)
        return extract_text(tmp_path, file_type)

    except Exception as exc:
        logger.error(
            "_download_and_extract_text: ошибка S3/извлечения для doc=%s: %s",
            document.id, exc,
        )
        return ""

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _parse_summary_response(text: str) -> dict:
    """
    Разбирает ответ Claude в формате РЕЗЮМЕ / КЛЮЧЕВЫЕ ТЕЗИСЫ.
    Возвращает {"summary": str, "key_points": list[str]}.
    При ошибке разбора — возвращает весь текст как summary.
    """
    summary = ""
    key_points = []

    try:
        parts = text.split("КЛЮЧЕВЫЕ ТЕЗИСЫ:")
        if len(parts) == 2:
            summary_part, points_part = parts
            summary = summary_part.replace("РЕЗЮМЕ:", "").strip()
            for line in points_part.splitlines():
                line = line.strip()
                if line.startswith("- "):
                    key_points.append(line[2:].strip())
                elif line:
                    key_points.append(line)
        else:
            summary = text
    except Exception:
        summary = text

    return {"summary": summary, "key_points": key_points}


def get_ai_service() -> AIService:
    """Фабрика: возвращает экземпляр AIService. Бросает RuntimeError, если CLAUDE_API_KEY не задан."""
    if not getattr(settings, "CLAUDE_API_KEY", ""):
        raise RuntimeError(
            "CLAUDE_API_KEY не настроен. "
            "Добавьте переменную окружения и перезапустите сервис."
        )
    return AIService()
