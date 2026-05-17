# setup_db.ps1 — Создание БД и пользователя для локальной разработки
# Запуск: .\setup_db.ps1 -PgPassword "твой_пароль_postgres"

param(
    [Parameter(Mandatory=$true)]
    [string]$PgPassword
)

$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = $PgPassword
$psql = "psql -U postgres -h 127.0.0.1"

Write-Host "==> Создание пользователя gosdoc_user..." -ForegroundColor Cyan
Invoke-Expression "$psql -c `"CREATE USER gosdoc_user WITH PASSWORD 'gosdoc_pass';`"" 2>$null
Write-Host "    OK (или уже существует)"

Write-Host "==> Создание базы данных gosdoc..." -ForegroundColor Cyan
Invoke-Expression "$psql -c `"CREATE DATABASE gosdoc OWNER gosdoc_user ENCODING 'UTF8';`"" 2>$null
Write-Host "    OK (или уже существует)"

Write-Host "==> Подключение расширения pgvector..." -ForegroundColor Cyan
Invoke-Expression "$psql -d gosdoc -c `"CREATE EXTENSION IF NOT EXISTS vector;`"" 2>$null
Write-Host "    OK"

Write-Host ""
Write-Host "База данных готова!" -ForegroundColor Green
Write-Host "Теперь запусти миграции:" -ForegroundColor Yellow
Write-Host "  .\venv\Scripts\activate"
Write-Host "  python manage.py migrate"
Write-Host "  python manage.py createsuperuser"
Write-Host "  python manage.py runserver"
