"""
ГосДок — Настройки для production (config/settings/production.py)
"""

import sentry_sdk
from decouple import config
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration

from .base import *  # noqa: F401, F403

# ============================================================
# Безопасность (раздел 6 ТЗ)
# ============================================================
DEBUG = False
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="api.gosdoc.gov.kz").split(",")

# HTTPS (раздел 6 ТЗ: TLS 1.2+)
# SSL-redirect можно отключить через env, если фронт-прокси (Caddy) ещё без HTTPS.
SECURE_SSL_REDIRECT = config("DJANGO_SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_HSTS_SECONDS = 31_536_000 if SECURE_SSL_REDIRECT else 0  # 1 год
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_SSL_REDIRECT
SECURE_HSTS_PRELOAD = SECURE_SSL_REDIRECT
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT

# Caddy завершает HTTPS и проксирует на backend по своему домену —
# Django должен доверять этому источнику для CSRF.
CSRF_TRUSTED_ORIGINS = config(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    default="https://" + ALLOWED_HOSTS[0],
).split(",")

# ============================================================
# Хранилища (Django 5.1: настройка через STORAGES, старые
# DEFAULT_FILE_STORAGE/STATICFILES_STORAGE в 5.1 удалены)
# ============================================================
STORAGES = {
    # Медиа (загружаемые документы) — AWS S3 / Yandex Object Storage (presigned POST)
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    # Статика (admin, Swagger UI) — WhiteNoise, отдаётся самим gunicorn без S3
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# WhiteNoise — middleware сразу после SecurityMiddleware
MIDDLEWARE.insert(  # noqa: F405
    MIDDLEWARE.index("django.middleware.security.SecurityMiddleware") + 1,  # noqa: F405
    "whitenoise.middleware.WhiteNoiseMiddleware",
)

# ============================================================
# Sentry — мониторинг ошибок
# ============================================================
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style="url"),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment="production",
        release=config("APP_VERSION", default="1.0.0"),
    )

# ============================================================
# Логирование — минимальный уровень INFO
# ============================================================
LOGGING["loggers"]["apps"]["level"] = "INFO"  # noqa: F405
