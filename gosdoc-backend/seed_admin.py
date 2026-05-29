"""
Создаёт админ-аккаунт для управления пользователями и организациями.

Запуск:
  ./venv/Scripts/python.exe seed_admin.py
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.users.models import User

EMAIL = "admin@test.kz"
PASSWORD = "admin12345"
NAME = "Admin User"

user, created = User.objects.get_or_create(
    email=EMAIL,
    defaults={"full_name": NAME, "is_active": True},
)
user.set_password(PASSWORD)
user.full_name = NAME
user.is_active = True
user.is_staff = True
user.is_superuser = True
user.save()

verb = "created" if created else "updated"
print("=" * 50)
print(f"Admin {verb}:")
print(f"  email:    {EMAIL}")
print(f"  password: {PASSWORD}")
print(f"  is_staff: {user.is_staff}")
print(f"  is_superuser: {user.is_superuser}")
print("=" * 50)
print("\nLog in at /login then go to /admin")
