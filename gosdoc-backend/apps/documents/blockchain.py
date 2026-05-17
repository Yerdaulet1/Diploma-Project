"""
ГосДок — Blockchain-верификация целостности документов.

Реализует hash chain (как в Bitcoin):
  block_hash = SHA-256(previous_hash + document_hash + task_id + timestamp)

Каждый раз когда задача завершается, создаётся новый блок.
Если хеш документа изменился с предыдущего блока — документ был модифицирован.
"""

import hashlib
import logging
import tempfile
import time
from datetime import datetime

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

GENESIS_HASH = "0" * 64  # Первый блок не имеет предыдущего


def _compute_document_hash(storage_key: str) -> str | None:
    """
    Скачивает файл из S3 и вычисляет SHA-256.
    Возвращает None если файл недоступен.
    """
    try:
        from apps.documents.storage import get_s3_client, _is_local_storage, _local_path

        if _is_local_storage():
            local = _local_path(storage_key)
            import os
            if not os.path.exists(local):
                return None
            sha256 = hashlib.sha256()
            with open(local, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    sha256.update(chunk)
            return sha256.hexdigest()

        s3 = get_s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            s3.download_fileobj(bucket, storage_key, tmp)
            tmp_path = tmp.name

        sha256 = hashlib.sha256()
        with open(tmp_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        import os
        os.unlink(tmp_path)
        return sha256.hexdigest()

    except Exception as exc:
        logger.warning("blockchain: cannot compute document hash for %s: %s", storage_key, exc)
        return None


def _compute_block_hash(previous_hash: str, document_hash: str, task_id: str, timestamp: str) -> str:
    """Вычисляет хеш блока из его данных."""
    payload = f"{previous_hash}{document_hash}{task_id}{timestamp}"
    return hashlib.sha256(payload.encode()).hexdigest()


def record_task_completion(task) -> "BlockchainBlock | None":
    """
    Создаёт новый блок при завершении задачи.
    Сравнивает хеш документа с предыдущим блоком.
    Возвращает созданный блок.
    """
    from apps.documents.models import BlockchainBlock, Document

    document = task.document
    if not document:
        return None

    # Получаем текущую версию документа
    version = document.current_version
    if not version:
        return None

    # Если checksum уже вычислен — используем его
    doc_hash = None
    if version.checksum and version.checksum not in ("pending", "s3-not-configured", ""):
        doc_hash = version.checksum
    else:
        # Вычисляем хеш напрямую
        doc_hash = _compute_document_hash(version.storage_key)

    if not doc_hash:
        logger.warning("blockchain: could not get document hash for task %s", task.id)
        return None

    # Находим предыдущий блок этого документа
    prev_block = (
        BlockchainBlock.objects
        .filter(document=document)
        .order_by("-created_at")
        .first()
    )
    previous_hash = prev_block.block_hash if prev_block else GENESIS_HASH

    # Проверяем изменение
    tampered = False
    if prev_block and prev_block.document_hash != doc_hash:
        tampered = True
        logger.warning(
            "blockchain: TAMPERED document %s between step %s and step %s!",
            document.id, prev_block.step_order, task.step_order,
        )

    now = timezone.now()
    # Use microsecond-truncated timestamp for reproducible hash
    timestamp_str = now.strftime("%Y-%m-%dT%H:%M:%S")
    block_hash = _compute_block_hash(previous_hash, doc_hash, str(task.id), timestamp_str)

    block = BlockchainBlock.objects.create(
        document=document,
        task=task,
        step_order=task.step_order or 0,
        document_hash=doc_hash,
        previous_hash=previous_hash,
        block_hash=block_hash,
        timestamp=now,
        tampered=tampered,
    )

    logger.info(
        "blockchain: block #%s created for doc %s (task %s, step %s, tampered=%s)",
        block.id, document.id, task.id, task.step_order, tampered,
    )
    return block


def verify_chain(document_id: str) -> list:
    """
    Верифицирует всю цепочку блоков для документа.
    Возвращает список блоков с полем chain_valid.
    """
    from apps.documents.models import BlockchainBlock

    blocks = list(
        BlockchainBlock.objects
        .filter(document_id=document_id)
        .select_related("task", "task__assigned_to")
        .order_by("created_at")
    )

    prev_hash = GENESIS_HASH
    for block in blocks:
        # Пересчитываем хеш блока
        expected = _compute_block_hash(
            prev_hash,
            block.document_hash,
            str(block.task_id) if block.task_id else "",
            block.timestamp.strftime("%Y-%m-%dT%H:%M:%S") if block.timestamp else "",
        )
        block.chain_valid = (block.block_hash == expected) and (block.previous_hash == prev_hash)
        prev_hash = block.block_hash

    return blocks
