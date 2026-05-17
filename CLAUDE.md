# CLAUDE.md

Гид для Claude Code по проекту **ГосДок (eDoc)** — облачная платформа документооборота для государственных организаций (дипломный проект).

---

## Структура репозитория

Монорепо из двух независимых частей:

```
Edoc-Project/
├── gosdoc-backend/       # Django 5 REST API
└── gosdoc-frontend-new/  # React 19 SPA (Vite)
```

> Примечание: основной [README.md](README.md) упоминает путь `gosdoc-frontend/`, но реальная папка фронтенда — `gosdoc-frontend-new/`. docker-compose уже ссылается на правильный путь.

---

## Технологический стек

### Backend ([gosdoc-backend/](gosdoc-backend/))
- **Язык / фреймворк:** Python 3.12, Django 5.1, Django REST Framework 3.15
- **БД:** PostgreSQL 16 с расширением **pgvector** (векторный поиск)
- **Кэш / брокер:** Redis 7
- **Очереди:** Celery 5.4 + django-celery-beat (планировщик в БД)
- **Хранилище файлов:** AWS S3 / Yandex Object Storage (через `django-storages` + presigned POST)
- **Auth:** JWT через `djangorestframework-simplejwt` (access 15 мин, refresh 7 дней, rotation + blacklist)
- **AI:** Claude (Anthropic SDK `anthropic>=0.40.0`) — недавняя миграция с Gemini
- **Документы:** PyMuPDF, python-docx, mammoth
- **Эмбеддинги:** sentence-transformers + pgvector
- **Отчёты:** WeasyPrint (PDF), openpyxl (XLSX)
- **API-схема:** drf-spectacular (Swagger UI на `/api/schema/swagger-ui/`)
- **Мониторинг:** Sentry SDK
- **Поиск:** MeiliSearch (опционально) + Postgres FTS
- **WSGI:** Gunicorn

### Frontend ([gosdoc-frontend-new/](gosdoc-frontend-new/))
- **Фреймворк:** React 19 + Vite 8 (на **JSX**, не TypeScript — несмотря на то, что в корневом README указан TS)
- **Роутинг:** react-router-dom 7
- **Серверное состояние:** TanStack Query (React Query) 5
- **Клиентское состояние:** Zustand 5
- **HTTP:** axios
- **i18n:** i18next + react-i18next (3 языка: `ru`, `kk`, `en`)
- **UI:** react-signature-canvas (подпись), sonner (тосты), date-fns
- **Стилизация:** обычный CSS (`App.css`, `index.css`) — Tailwind в зависимостях НЕ установлен (README устарел)

---

## Команды разработки

### Backend (из `gosdoc-backend/`)

```powershell
# Полный стек через Docker (рекомендуется)
docker compose up -d                 # БД + Redis + backend + celery + celery-beat + frontend
docker compose logs -f backend
docker compose down -v               # остановить и удалить данные БД

# Локально (без Docker) — нужны Python 3.12, PostgreSQL 16, Redis
python -m venv venv
venv\Scripts\activate                # Windows
pip install -r requirements/base.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Celery (отдельные терминалы)
celery -A config worker -l info
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# Тесты
pytest                               # настройки в pytest.ini
DJANGO_SETTINGS_MODULE=config.settings.test pytest

# Переиндексация поиска
python manage.py reindex_search
```

### Frontend (из `gosdoc-frontend-new/`)

```powershell
npm install
npm run dev                          # Vite dev server на :3000
npm run build                        # production-сборка
npm run lint                         # ESLint
npm run preview                      # просмотр production-сборки
```

---

## Архитектура Backend

### Конфигурация ([gosdoc-backend/config/](gosdoc-backend/config/))
- [settings/base.py](gosdoc-backend/config/settings/base.py) — общая база
- [settings/development.py](gosdoc-backend/config/settings/development.py), [production.py](gosdoc-backend/config/settings/production.py), [test.py](gosdoc-backend/config/settings/test.py)
- [urls.py](gosdoc-backend/config/urls.py) — все эндпоинты под `/api/v1/...`
- [celery.py](gosdoc-backend/config/celery.py) — инициализация Celery

### Django-приложения ([gosdoc-backend/apps/](gosdoc-backend/apps/))

| Приложение | Префикс URL | Назначение |
|---|---|---|
| [users](gosdoc-backend/apps/users/) | `/api/v1/auth/`, `/api/v1/users/` | Кастомная модель `User`, регистрация с email-кодом, JWT, профили, подпись пользователя |
| [organizations](gosdoc-backend/apps/organizations/) | `/api/v1/organizations/` | Организации с владельцами и системой приглашений |
| [workspaces](gosdoc-backend/apps/workspaces/) | `/api/v1/workspaces/` | Рабочие кабинеты с ролями (`owner`, `editor`, `signer`, `viewer`) и приглашениями |
| [documents](gosdoc-backend/apps/documents/) | `/api/v1/documents/`, `/api/v1/comments/` | Документы, версии, S3-storage, AI-diff между версиями, аудит-лог, **блокчейн-цепочка хешей**, комментарии, вложения, подзадачи |
| [tasks](gosdoc-backend/apps/tasks/) | `/api/v1/tasks/` | Workflow-задачи согласования ([workflow.py](gosdoc-backend/apps/tasks/workflow.py)) |
| [signatures](gosdoc-backend/apps/signatures/) | `/api/v1/signatures/` | Электронные подписи (canvas) |
| [notifications](gosdoc-backend/apps/notifications/) | `/api/v1/notifications/` | In-app уведомления + Celery-рассылки |
| [reports](gosdoc-backend/apps/reports/) | `/api/v1/reports/` | Ежемесячные отчёты, экспорт PDF/XLSX |
| [ai](gosdoc-backend/apps/ai/) | `/api/v1/ai/` | Классификатор документов, AI-чат на базе Claude |
| [core](gosdoc-backend/apps/core/) | `/api/v1/help/`, `/api/v1/search/` | FAQ, поиск (FTS + векторный), пагинация, троттлинг, сигналы |

### Ключевые соглашения
- Все API под `/api/v1/...`
- Все эндпоинты по умолчанию требуют JWT (`IsAuthenticated`); анонимные исключения объявляются явно
- Пагинация: `apps.core.pagination.StandardResultsPagination`, размер страницы 20
- Rate-limit: `standard_user=100/min`, `auth_anon=10/min`, `upload=20/min` ([apps/core/throttling.py](gosdoc-backend/apps/core/throttling.py))
- Кастомная модель пользователя: `AUTH_USER_MODEL = "users.User"`
- Локаль `ru-ru`, часовой пояс `Asia/Almaty`
- Лимит загрузки: **100 МБ**, разрешённые форматы: `pdf, docx, xlsx, odt, ods`
- S3-бакет приватный, TTL presigned URL — 60 минут

---

## Архитектура Frontend ([gosdoc-frontend-new/src/](gosdoc-frontend-new/src/))

### Структура
- [main.jsx](gosdoc-frontend-new/src/main.jsx), [App.jsx](gosdoc-frontend-new/src/App.jsx), [router.jsx](gosdoc-frontend-new/src/router.jsx) — точка входа и роутинг
- [providers/QueryProvider.jsx](gosdoc-frontend-new/src/providers/QueryProvider.jsx) — React Query
- [store/authStore.js](gosdoc-frontend-new/src/store/authStore.js) — Zustand для авторизации
- [hooks/](gosdoc-frontend-new/src/hooks/) — `useAuth`, `useSidebarOpen`
- [i18n/](gosdoc-frontend-new/src/i18n/) — переводы `ru.json`, `kk.json`, `en.json`
- [api/](gosdoc-frontend-new/src/api/) — отдельный модуль на каждое backend-приложение (`auth`, `documents`, `ai`, `workspaces`, `organizations`, `tasks`, `reports`, `notifications`, `search`, `users`, `help`), общий [client.js](gosdoc-frontend-new/src/api/client.js) с axios-инстансом

### Страницы (плоско в `src/`)
`AuthFlow`, `Documents`, `Projects`, `Inbox`, `Organization`, `CreateWorkspaceModal`, `Notifications`, `Analytics`, `HelpSupport`, `Profile`.

---

## Ключевые особенности продукта

1. **AI-diff версий документов** — сравнение через Claude ([apps/documents/ai_diff.py](gosdoc-backend/apps/documents/ai_diff.py))
2. **Блокчейн-цепочка хешей** — каждый документ привязан хешем к предыдущему для проверки целостности ([apps/documents/blockchain.py](gosdoc-backend/apps/documents/blockchain.py), модель `BlockchainBlock` в миграции 0007)
3. **Workflow согласования** — пошаговая маршрутизация задач между ролями
4. **Гибридный поиск** — Postgres FTS + векторный (pgvector) + опциональный MeiliSearch
5. **Прямая загрузка в S3** — фронт получает presigned POST и грузит файл напрямую в бакет, минуя бэкенд
6. **Трёхъязычный UI** — ru / kk / en
7. **Email-верификация** — 6-значный код при регистрации, сброс пароля через email

---

## Переменные окружения

Backend читает конфиг из `gosdoc-backend/.env` (шаблон в [.env.example](gosdoc-backend/.env.example)). Критичные ключи:

| Переменная | Назначение |
|---|---|
| `DJANGO_SECRET_KEY` | Случайная строка 50+ символов |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Redis (БД 0, 1, 2) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME` | S3 |
| `AWS_S3_ENDPOINT_URL` | Для Yandex Object Storage |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP (Gmail app password) |
| `CLAUDE_API_KEY`, `CLAUDE_MODEL` | Anthropic API. По умолчанию в settings — `claude-opus-4-7`, в `.env.example` — `claude-sonnet-4-6` (рассинхрон, проверять перед запуском) |
| `SENTRY_DSN` | Опционально |
| `MEILISEARCH_URL`, `MEILISEARCH_KEY` | Опционально |

---

## API-документация
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/
- Базовый URL продакшна: `https://api.gosdoc.gov.kz`
- Примеры запросов: [CURL_EXAMPLES.md](gosdoc-backend/CURL_EXAMPLES.md), [CURL_EXAMPLES_STAGE2.md](gosdoc-backend/CURL_EXAMPLES_STAGE2.md)

---

## Гайдлайны для работы в этом репозитории

- **Платформа:** Windows + PowerShell. При выполнении shell-команд используй PowerShell-синтаксис (`$env:VAR`, `;` вместо `&&`).
- **Миграции:** после изменения моделей всегда генерируй миграцию (`python manage.py makemigrations <app>`) и проверяй, что она применяется. Не редактируй уже применённые миграции.
- **Новый эндпоинт:** регистрируй URL в `apps/<app>/urls.py` и убеждайся, что он подключён в [config/urls.py](gosdoc-backend/config/urls.py) под `/api/v1/`.
- **Permissions:** новый view-класс должен явно указать permission_classes или унаследовать дефолтный `IsAuthenticated`. Для ролей внутри workspace — используй [apps/organizations/permissions.py](gosdoc-backend/apps/organizations/permissions.py) и аналогичные.
- **Celery-таски:** размещай в `apps/<app>/tasks.py`, регистрируются автоматически (`config/celery.py` использует autodiscover).
- **Frontend API-клиенты:** новый ресурс — отдельный файл в [src/api/](gosdoc-frontend-new/src/api/), используй общий [client.js](gosdoc-frontend-new/src/api/client.js) (axios + интерсепторы JWT).
- **i18n:** любой пользовательский текст добавляй во все три файла переводов одновременно (`ru.json`, `kk.json`, `en.json`).
- **Серверное состояние** — через React Query, **клиентское** — через Zustand. Не дублируй API-данные в Zustand.
- **Загрузка файлов** — только через presigned POST в S3, не проксируй через бэкенд.
