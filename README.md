# ГосДок (eDoc) — Облачная платформа документооборота

Дипломный проект. Система электронного документооборота для государственных организаций Республики Казахстан с AI-проверкой версий и блокчейн-подтверждением целостности документов.

---

## Технологии

**Backend:** Python 3.12 · Django 5.1 · Django REST Framework · PostgreSQL 16 (pgvector) · Redis 7 · Celery 5.4 · AWS S3 / Yandex Object Storage · Anthropic Claude · WeasyPrint · Gunicorn

**Frontend:** React 19 · Vite 8 (JSX) · React Router 7 · TanStack Query · Zustand · axios · i18next (ru/kk/en)

---

## Структура репозитория

```
Edoc-Project/
├── gosdoc-backend/       # Django 5 REST API
└── gosdoc-frontend-new/  # React 19 SPA (Vite)
```

---

## Быстрый старт

Есть три способа поднять проект. Если просто хочется посмотреть — выбирайте **вариант 1**. Для активной разработки на Windows удобнее **вариант 3**.

### Вариант 1 — Полностью через Docker (рекомендуется)

Требуется [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```powershell
# 1. Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/Edoc-Project.git
cd Edoc-Project\gosdoc-backend

# 2. Настроить переменные окружения
copy .env.example .env
# Отредактируйте .env (см. раздел "Переменные окружения" ниже)

# 3. Поднять весь стек (БД + Redis + Django + Celery + Frontend)
docker compose up -d

# 4. Логи бэкенда
docker compose logs -f backend
```

После старта:
- Фронтенд: http://localhost:3000
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- Django admin: http://localhost:8000/admin/

> `docker compose` поднимает 6 сервисов: `db` (Postgres + pgvector), `redis`, `backend` (gunicorn), `celery`, `celery-beat`, `frontend` (Vite dev-server). Запускать `npm install` локально не нужно — фронт работает в своём контейнере.

---

### Вариант 2 — Полностью локально, без Docker

> ✅ **В dev-режиме нужны только Python, Node и PostgreSQL+pgvector.**
> Redis и Celery запускать **не нужно**: настройки `config.settings.development` (включаются автоматически)
> используют кэш в памяти, а Celery-задачи (уведомления, отчёты) выполняются синхронно.
> Письма (коды подтверждения, сброс пароля) печатаются прямо в консоль `runserver` — реальный SMTP не требуется.

Требуется: **Python 3.12**, **Node.js 20+**, **PostgreSQL 16 с расширением `pgvector`**.

#### 1. Установить и подготовить PostgreSQL

Установите PostgreSQL 16. Расширение `pgvector` нужно поставить отдельно (оно обязательно — модели используют векторные поля):
- **Windows:** скачайте установщик с [github.com/pgvector/pgvector-windows/releases](https://github.com/pgvector/pgvector-windows/releases)
- **macOS:** `brew install pgvector`
- **Linux:** `sudo apt install postgresql-16-pgvector`

Создайте БД и пользователя (через `psql -U postgres`):

```sql
CREATE DATABASE gosdoc;
CREATE USER gosdoc_user WITH PASSWORD 'gosdoc_pass';
GRANT ALL PRIVILEGES ON DATABASE gosdoc TO gosdoc_user;
\c gosdoc
CREATE EXTENSION vector;
GRANT ALL ON SCHEMA public TO gosdoc_user;
```

#### 2. Поднять Backend

```powershell
# Если PowerShell блокирует активацию venv (один раз):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

cd gosdoc-backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements/base.txt

# Скопировать .env
copy .env.example .env
```

Откройте `.env` и укажите локальную БД (остальное можно оставить как есть — Redis/Celery в dev не используются):

```env
DATABASE_URL=postgres://gosdoc_user:gosdoc_pass@localhost:5432/gosdoc
DJANGO_DEBUG=True
CLAUDE_API_KEY=ваш_ключ_anthropic      # нужен для AI-функций (diff, чат, классификация)
```

Затем:

```powershell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

`runserver` по умолчанию использует `config.settings.development` (это зашито в `manage.py`) — API на http://localhost:8000.

> Celery/Redis запускать не нужно. Если когда-нибудь понадобится прогнать задачи через реальный брокер — это уже отдельный сценарий, для разработки он не требуется.

#### 3. Поднять Frontend

```powershell
cd gosdoc-frontend-new

# (опционально) для кнопки «Войти через Google» создайте .env и впишите Client ID:
copy .env.example .env        # затем в .env задайте VITE_GOOGLE_CLIENT_ID=...

npm install
npm run dev
```

Vite поднимет дев-сервер на http://localhost:3000 и сам проксирует запросы `/api` на бэкенд (http://localhost:8000) — настраивать CORS не нужно.

---

### Вариант 3 — Гибридный (Docker для сервисов, код локально)

Самый удобный путь для активной разработки на Windows — Postgres с `pgvector` и Redis запущены в Docker, а Django и Vite работают на хосте (быстрый HMR, прямой доступ к отладчику).

```powershell
cd gosdoc-backend

# 1. Поднять только БД и Redis
docker compose up -d db redis

# 2. Подготовить .env (то же самое, что в варианте 2 — DATABASE_URL/REDIS_URL на localhost)
copy .env.example .env
# затем измените хосты в .env на localhost (см. вариант 2, шаг 2)

# 3. Backend локально
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements/base.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# 4. Celery (отдельные терминалы с активированным venv)
celery -A config worker -l info
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# 5. Frontend локально (отдельный терминал)
cd ..\gosdoc-frontend-new
npm install
npm run dev
```

> При этом варианте БД и `pgvector` уже настроены образом `pgvector/pgvector:pg16` — ничего вручную создавать не нужно. Учётные данные `gosdoc_user / gosdoc_pass / gosdoc` уже совпадают с `.env.example`.

---

## Переменные окружения

Шаблон — [gosdoc-backend/.env.example](gosdoc-backend/.env.example). Скопируйте в `.env` и заполните:

| Переменная | Назначение |
|---|---|
| `DJANGO_SECRET_KEY` | Случайная строка 50+ символов |
| `DJANGO_DEBUG` | `True` для разработки, `False` в проде |
| `DATABASE_URL` | `postgres://user:pass@host:5432/dbname` |
| `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Redis (БД 0, 1, 2). **В dev не используются** — нужны только в Docker/проде |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Ключи S3 |
| `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME` | Имя и регион бакета |
| `AWS_S3_ENDPOINT_URL` | Для Yandex Object Storage |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP (Gmail — App Password) |
| `CLAUDE_API_KEY` | Anthropic API ключ (нужен для AI-функций) |
| `CLAUDE_MODEL` | Модель Claude, по умолчанию `claude-sonnet-4-6` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID для входа через Google (на фронте — `VITE_GOOGLE_CLIENT_ID`, то же значение) |
| `SENTRY_DSN` | Опционально, мониторинг |
| `MEILISEARCH_URL`, `MEILISEARCH_KEY` | Опционально, ускоренный полнотекстовый поиск |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Жизнь токенов (по умолчанию 15 мин / 7 дней) |

### Получение Gmail App Password
1. Включите 2FA: [myaccount.google.com](https://myaccount.google.com) → Безопасность
2. Безопасность → **Пароли приложений** → создайте новый
3. Скопируйте 16-значный пароль в `EMAIL_HOST_PASSWORD`

### Настройка AWS S3
1. Создайте бакет в [AWS Console](https://console.aws.amazon.com/s3/) (приватный)
2. IAM → создайте пользователя с политикой `AmazonS3FullAccess`, сохраните Access/Secret ключи
3. На бакете настройте CORS: разрешите `POST`, `GET`, `PUT` с `http://localhost:3000` (для presigned upload)

---

## Архитектура

### Backend ([gosdoc-backend/apps/](gosdoc-backend/apps/))

Все API под префиксом `/api/v1/...`. Авторизация по умолчанию — JWT (`IsAuthenticated`).

| Приложение | URL | Что делает |
|---|---|---|
| [users](gosdoc-backend/apps/users/) | `/auth/`, `/users/` | Кастомная модель `User`, регистрация с email-кодом, JWT (rotation + blacklist), профили |
| [organizations](gosdoc-backend/apps/organizations/) | `/organizations/` | Организации с владельцами, система приглашений |
| [workspaces](gosdoc-backend/apps/workspaces/) | `/workspaces/` | Рабочие кабинеты с ролями (`owner`, `editor`, `signer`, `viewer`) |
| [documents](gosdoc-backend/apps/documents/) | `/documents/`, `/comments/` | Документы, версии, S3-storage, AI-diff, аудит-лог, блокчейн, комментарии, вложения, подзадачи |
| [tasks](gosdoc-backend/apps/tasks/) | `/tasks/` | Workflow-задачи согласования |
| [signatures](gosdoc-backend/apps/signatures/) | `/signatures/` | Электронные подписи (canvas) |
| [notifications](gosdoc-backend/apps/notifications/) | `/notifications/` | In-app уведомления + Celery-рассылки на email |
| [reports](gosdoc-backend/apps/reports/) | `/reports/` | Ежемесячные отчёты, экспорт PDF (WeasyPrint) и XLSX (openpyxl) |
| [ai](gosdoc-backend/apps/ai/) | `/ai/` | Классификатор документов, AI-чат на базе Claude |
| [core](gosdoc-backend/apps/core/) | `/help/`, `/search/` | FAQ, гибридный поиск (FTS + векторный pgvector + MeiliSearch) |

### Архитектурная схема

```
                ┌──────────────┐
                │  Браузер     │  React 19 + Vite (JSX)
                │  i18next     │  ru / kk / en
                └──────┬───────┘
                       │ HTTPS · JWT (access 15m / refresh 7d)
                       │
                  ┌────▼─────┐         ┌─────────────────┐
                  │  Nginx   │◀───────▶│ S3 / Yandex OS  │ presigned POST
                  │ (prod)   │         └─────────────────┘
                  └────┬─────┘
                       │
                ┌──────▼───────┐       ┌─────────────────┐
                │ Gunicorn +   │──────▶│  Anthropic      │  AI-diff,
                │ Django 5     │       │  Claude         │  чат
                │ DRF          │       └─────────────────┘
                └─┬───┬───┬───┘
                  │   │   │
        ┌─────────┘   │   └───────────┐
        ▼             ▼               ▼
┌──────────────┐ ┌──────────┐ ┌───────────────┐
│ PostgreSQL 16│ │ Redis 7  │ │ Celery worker │
│ + pgvector   │ │  cache/  │ │ + Celery beat │
│  FTS         │ │  broker  │ │  (отчёты,     │
└──────────────┘ └──────────┘ │   email)      │
                              └───────────────┘
```

### ER-диаграмма (ключевые модели)

```
User ──┬─< WorkspaceMember >── Workspace ─── Organization
       │                          │
       │                          └─< Document ─< DocumentVersion
       │                                │
       │                                ├─< Task (workflow)
       │                                ├─< Comment
       │                                ├─< Subtask
       │                                ├─< DocumentAttachment
       │                                ├─< BlockchainBlock (hash-chain)
       │                                └─< DocumentEmbedding (pgvector)
       │
       └─< Signature ── Document
```

- `Workspace.organization` — опциональный FK (workspace может быть и без организации)
- `WorkspaceMember.step_order` — порядок участника в workflow согласования
- `Task.step_order` совпадает с `WorkspaceMember.step_order` подписанта
- `BlockchainBlock.prev_hash` — указатель на предыдущий блок, обеспечивает chain-of-trust

### Frontend ([gosdoc-frontend-new/src/](gosdoc-frontend-new/src/))

Роутинг через `react-router-dom`, защищённые маршруты в [router.jsx](gosdoc-frontend-new/src/router.jsx):

| Путь | Компонент |
|---|---|
| `/login` | [AuthFlow.jsx](gosdoc-frontend-new/src/AuthFlow.jsx) — вход, регистрация (3 шага), восстановление пароля (3 шага) |
| `/inbox` | [Inbox.jsx](gosdoc-frontend-new/src/Inbox.jsx) — входящие/исходящие |
| `/projects` | [Projects.jsx](gosdoc-frontend-new/src/Projects.jsx) — рабочие кабинеты |
| `/documents` | [Documents.jsx](gosdoc-frontend-new/src/Documents.jsx) — документы пользователя |
| `/notifications` | [Notifications.jsx](gosdoc-frontend-new/src/Notifications.jsx) |
| `/analytics` | [Analytics.jsx](gosdoc-frontend-new/src/Analytics.jsx) — отчёты |
| `/help` | [HelpSupport.jsx](gosdoc-frontend-new/src/HelpSupport.jsx) — FAQ и AI-чат |
| `/organization/:id` | [Organization.jsx](gosdoc-frontend-new/src/Organization.jsx) |

Клиенты API под каждое backend-приложение — [src/api/](gosdoc-frontend-new/src/api/), общий axios-инстанс с JWT-интерсепторами в [client.js](gosdoc-frontend-new/src/api/client.js). Серверное состояние через React Query, клиентское — через Zustand ([store/authStore.js](gosdoc-frontend-new/src/store/authStore.js)).

---

## Ключевые особенности продукта

1. **AI-diff между версиями документа** — Claude сравнивает содержимое и выделяет значимые изменения перед согласованием ([apps/documents/ai_diff.py](gosdoc-backend/apps/documents/ai_diff.py))
2. **Блокчейн-цепочка хешей** — каждый блок связан хешем с предыдущим, обеспечивает проверку целостности всех документов ([apps/documents/blockchain.py](gosdoc-backend/apps/documents/blockchain.py))
3. **Workflow согласования** — пошаговая маршрутизация задач между ролями ([apps/tasks/workflow.py](gosdoc-backend/apps/tasks/workflow.py))
4. **Гибридный поиск** — PostgreSQL FTS + векторный (pgvector + sentence-transformers) + опциональный MeiliSearch
5. **Прямая загрузка в S3** — фронт получает presigned POST и грузит файл напрямую в бакет, минуя бэкенд (TTL 60 минут)
6. **Трёхъязычный UI** — русский, казахский, английский ([src/i18n/](gosdoc-frontend-new/src/i18n/)). Язык выбирается в правом верхнем углу страницы входа и сохраняется в `localStorage`
7. **Email-верификация** — 6-значный код при регистрации, сброс пароля через email
8. **Электронные подписи** — рисование на canvas, сохранение как прозрачный PNG
9. **Экспорт отчётов** — PDF (WeasyPrint) и XLSX (openpyxl)
10. **Мониторинг** — интеграция с Sentry (опционально)

### Технические ограничения
- Максимальный размер файла: **100 МБ**
- Разрешённые форматы: `docx`, `xlsx` (см. `ALLOWED_DOCUMENT_EXTENSIONS` в [settings/base.py](gosdoc-backend/config/settings/base.py))
- Локаль: `ru-ru`, часовой пояс: `Asia/Almaty`
- JWT: access — 15 мин, refresh — 7 дней (с rotation и blacklist)
- Rate limiting: 100 запросов/мин (стандартный пользователь), 10/мин (анонимные на `/auth/`), 20/мин (загрузка)

---

## Полезные команды

> **Без Docker** (Вариант 2): команды те же, но без префикса `docker compose exec backend` —
> просто `python manage.py ...` в активированном venv из папки `gosdoc-backend`.
> Например, после изменения моделей: `python manage.py makemigrations <app>` → `python manage.py migrate`.

```powershell
# Применить миграции внутри контейнера
docker compose exec backend python manage.py migrate

# Создать суперпользователя
docker compose exec backend python manage.py createsuperuser

# Сгенерировать миграцию для приложения
docker compose exec backend python manage.py makemigrations <app>

# Переиндексировать поиск
docker compose exec backend python manage.py reindex_search

# Открыть Django shell
docker compose exec backend python manage.py shell

# Загрузить демо-данные (организации + назначенные документы + FAQ на ru/kk/en)
docker compose exec backend python manage.py seed_demo
# Можно ограничить разделом: --only=faqs | --only=orgs,assigned
# По умолчанию "я" — 220103248@stu.sdu.edu.kz, можно переопределить: --me=user@example.com

# Тесты
docker compose exec backend pytest

# Логи Celery
docker compose logs -f celery
docker compose logs -f celery-beat

# Сборка фронтенда для прода
cd gosdoc-frontend-new
npm run build

# Линт фронта
npm run lint

# Остановить всё (с удалением данных БД)
docker compose down -v
```

---

## Тесты

Стек: **pytest + pytest-django + factory_boy + pytest-cov** (конфигурация в `gosdoc-backend/pytest.ini`).

```powershell
cd gosdoc-backend
venv\Scripts\activate

# Запустить весь suite (требуется PostgreSQL 16 для прод-конфигурации;
# тестовая конфигурация по умолчанию использует SQLite — не нужно ничего ставить)
pytest --no-cov                    # быстрый прогон без покрытия
pytest                             # с покрытием (требует ≥ 70%)
pytest tests/test_smoke_recent.py  # smoke-тесты последних правок
```

Smoke-suite (`tests/test_smoke_recent.py`) проверяет ключевые регрессии:
- `/users/me/` возвращает текущего пользователя
- `/documents/?organization=<uuid|_none|invalid>` корректно фильтрует/валидирует
- `/tasks/` отдаёт `organization_id`/`organization_name` и не утекает чужие задачи
- `/help/faqs/?topic=...` возвращает все три языка с fallback на EN
- `manage.py seed_demo` идемпотентен

CI-конфигурация (рекомендуется): GitHub Actions с матрицей Python 3.12 и Postgres 16 service, шаги — `ruff`, `pytest`, `npm ci`, `npm run lint`.

---

## API-документация

- **Swagger UI:** http://localhost:8000/api/schema/swagger-ui/
- **ReDoc:** http://localhost:8000/api/schema/redoc/
- **Базовый URL продакшна:** `https://api.gosdoc.gov.kz`
- Примеры запросов: [CURL_EXAMPLES.md](gosdoc-backend/CURL_EXAMPLES.md), [CURL_EXAMPLES_STAGE2.md](gosdoc-backend/CURL_EXAMPLES_STAGE2.md)

---

## Документация для разработчиков

Подробный гид для работы с проектом (соглашения по коду, миграциям, permissions, i18n) — в [CLAUDE.md](CLAUDE.md).
