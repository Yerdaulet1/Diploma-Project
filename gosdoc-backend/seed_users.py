"""Создание тестовых юзеров для проверки автокомплита."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.users.models import User

users = [
    ("alex.ivanov@test.kz",       "Александр Иванов"),
    ("aigerim.tolegen@test.kz",   "Айгерим Толеген"),
    ("anna.petrova@test.kz",      "Анна Петрова"),
    ("aslan.serikov@test.kz",     "Аслан Сериков"),
    ("dmitry.smirnov@test.kz",    "Дмитрий Смирнов"),
    ("dana.bekova@test.kz",       "Дана Бекова"),
    ("maria.kuznetsova@test.kz",  "Мария Кузнецова"),
    ("madiyar.kanat@test.kz",     "Мадияр Канат"),
    ("nurlan.zhumabek@test.kz",   "Нурлан Жумабек"),
    ("olga.sokolova@test.kz",     "Ольга Соколова"),
    ("john.smith@test.kz",        "John Smith"),
    ("jane.doe@test.kz",          "Jane Doe"),
]

created = 0
existed = 0
for email, name in users:
    obj, was_new = User.objects.get_or_create(
        email=email,
        defaults={"full_name": name, "is_active": True},
    )
    if was_new:
        obj.set_password("test12345")
        obj.save()
        created += 1
    else:
        existed += 1

print(f"created={created} existed={existed} total_users={User.objects.count()}")
