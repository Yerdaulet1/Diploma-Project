"""
eDoc — Настройки для разработки (config/settings/development.py)
"""

from .base import *  # noqa: F401, F403

# ============================================================
# Режим отладки
# ============================================================
DEBUG = True

ALLOWED_HOSTS = ["*"]

# ============================================================
# Email — console backend в dev (код виден в терминале Django)
# Чтобы использовать реальный SMTP, задай EMAIL_BACKEND=smtp в .env
# ============================================================
import os as _os
EMAIL_BACKEND = _os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)

# ============================================================
# CORS — в dev разрешаем все источники
# ============================================================
CORS_ALLOW_ALL_ORIGINS = True

# ============================================================
# Django Debug Toolbar (опционально, не включён в base deps)
# ============================================================
# INSTALLED_APPS += ["debug_toolbar"]
# MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
# INTERNAL_IPS = ["127.0.0.1"]

# ============================================================
# Логирование — более подробное для разработки
# ============================================================
LOGGING["loggers"]["apps"]["level"] = "DEBUG"  # noqa: F405

# ============================================================
# Кэш — локально используем in-memory (Redis не нужен)
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# ============================================================
# Celery
#   EAGER=True  — задачи выполняются синхронно в запросе (для локали без Redis).
#   EAGER=False — задачи уходят в celery-воркер (Docker: есть Redis + воркер).
# По умолчанию False, чтобы тяжёлые задачи (индексация эмбеддингов, SHA-256,
# AI-анализ) НЕ блокировали загрузку документа. Для локали без воркера
# можно выставить CELERY_TASK_ALWAYS_EAGER=true в окружении.
# ============================================================
CELERY_TASK_ALWAYS_EAGER = _os.environ.get("CELERY_TASK_ALWAYS_EAGER", "false").lower() == "true"
CELERY_TASK_EAGER_PROPAGATES = CELERY_TASK_ALWAYS_EAGER

# AI migrations applied manually via SQL (pgvector not installed locally)
# ChatMessage table created directly, DocumentEmbedding skipped
MIGRATION_MODULES = {}  # all migrations enabled
