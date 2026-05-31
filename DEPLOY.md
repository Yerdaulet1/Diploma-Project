# Деплой ГосДок на Google Cloud (бесплатно, $300 trial)

Полный стек поднимается на **одной VM** через `docker compose` — то же окружение, что локально.
Наружу торчит только **Caddy** (HTTPS), он отдаёт собранный React и проксирует `/api` на Django.

```
Браузер ──HTTPS──> Caddy (VM:443) ──┬── /            → React SPA (dist)
                                     └── /api,/admin  → Django (gunicorn:8000)
                                                         ├── PostgreSQL+pgvector
                                                         ├── Redis + Celery
                                                         └── S3 (загрузка документов)
```

---

## Что нужно заранее
- Аккаунт Google + банковская карта (для активации trial; списаний не будет).
- Anthropic API-ключ (`CLAUDE_API_KEY`).
- S3-бакет (AWS или Yandex) с ключами — для загрузки документов.
- ~30–40 минут.

---

## Часть A. Google Cloud Console

1. Зайди на https://console.cloud.google.com → согласись на **Free Trial** ($300 / 90 дней), привяжи карту.
2. Вверху создай **новый проект**, например `gosdoc`.
3. **Compute Engine → VM instances → Create instance**:
   - Name: `gosdoc-vm`
   - Region: ближайший (например `europe-west1` или `asia-south1`)
   - Machine type: **e2-medium** (2 vCPU, 4 GB). Если при сборке будет OOM — пересоздай как `e2-standard-2` (8 GB).
   - Boot disk: **Ubuntu 24.04 LTS**, размер **30 GB**.
   - Firewall: отметь **Allow HTTP traffic** и **Allow HTTPS traffic**.
   - Create.
4. **VPC network → IP addresses**: у внешнего IP этой VM нажми **Reserve** (статический IP), чтобы он не менялся. Запиши IP.

---

## Часть B. Бесплатный домен (нужен для HTTPS и кнопки Google)

Google OAuth не работает по голому IP — нужен домен с HTTPS. Берём бесплатный:

1. https://www.duckdns.org → войди через Google.
2. Создай поддомен, например `gosdoc` → получится `gosdoc.duckdns.org`.
3. В поле **current ip** впиши **внешний IP твоей VM** → Update.

> Caddy сам выпустит и продлит бесплатный TLS-сертификат Let's Encrypt для этого домена.

---

## Часть C. Настройка на сервере

Подключись к VM (кнопка **SSH** в консоли GCP открывает терминал в браузере).

**1. Установить Docker:**
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker        # применить группу без релогина
```

**2. Получить код проекта** (через git или загрузить архив):
```bash
git clone <URL_твоего_репозитория> gosdoc
cd gosdoc/gosdoc-backend
```

**3. Создать prod `.env`:**
```bash
cp .env.prod.example .env
nano .env
```
Заполни обязательно:
- `DJANGO_SECRET_KEY` — сгенерируй: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`
- `DJANGO_ALLOWED_HOSTS=gosdoc.duckdns.org,<IP_VM>`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://gosdoc.duckdns.org`
- `SITE_ADDRESS=gosdoc.duckdns.org`
- `POSTGRES_PASSWORD` — надёжный пароль
- `CLAUDE_API_KEY`, `GOOGLE_CLIENT_ID`
- `AWS_*` (ключи и бакет S3)
- `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `MEILISEARCH_KEY` — длинная случайная строка

**4. Запустить стек:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Первая сборка идёт долго (≈10–20 мин: ставится torch). Следи за логами:
```bash
docker compose -f docker-compose.prod.yml logs -f backend caddy
```

**5. Создать суперпользователя (админку):**
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## Часть D. Google OAuth — добавить домен

В https://console.cloud.google.com → **APIs & Services → Credentials** → твой OAuth Client ID:
- **Authorized JavaScript origins**: добавь `https://gosdoc.duckdns.org`
- Сохрани (применяется за пару минут).

---

## Часть E. Проверка

- Сайт: **https://gosdoc.duckdns.org**
- Swagger: **https://gosdoc.duckdns.org/api/schema/swagger-ui/**
- Админка: **https://gosdoc.duckdns.org/admin/**

Зарегистрируйся / войди, проверь кнопку Google.

---

## Обновление кода
```bash
cd ~/gosdoc && git pull
cd gosdoc-backend && docker compose -f docker-compose.prod.yml up -d --build
```

## Чтобы не списали деньги
- Trial **не** переходит на платный автоматически — по истечении $300/90 дней сервисы просто остановятся.
- После защиты удали VM: **Compute Engine → VM instances → Delete**, и удали проект целиком, чтобы убрать все ресурсы.

---

## Если что-то не так

| Симптом | Причина / решение |
|---|---|
| Сборка падает с `Killed` / OOM | Мало RAM. Пересоздай VM как `e2-standard-2` (8 GB). |
| Caddy не выдаёт HTTPS | DuckDNS IP ≠ IP VM, или закрыты порты 80/443. Проверь firewall и A-запись. |
| `DisallowedHost` в логах backend | Добавь домен/IP в `DJANGO_ALLOWED_HOSTS`. |
| Кнопка Google: `origin_mismatch` | Не добавлен `https://gosdoc.duckdns.org` в Authorized JavaScript origins. |
| Документ не загружается | Проверь `AWS_*` и CORS бакета (разреши origin `https://gosdoc.duckdns.org`). |
| Векторный поиск молчит | Это норм при нехватке RAM — деградирует в Postgres FTS. Claude-функции работают. |
