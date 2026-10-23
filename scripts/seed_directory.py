"""
Наполняет справочник сотрудников из исходной книги «Карла Маркса»
(лист «график»).

Справочник — это список тех, кому разрешён вход в кабинет. Он лежит
в `.data/employees.json`, в `.gitignore`, и **никогда не отдаётся
браузеру**: по нему проверяется имя при входе.

ПИН здесь не задаётся — его выдаёт администратор в разделе
«Управление». Скрипт только готовит каркас и печатает список.

Запуск:
    .venv-sheets/Scripts/python.exe scripts/seed_directory.py [--limit N] [--pin PIN]
"""

from __future__ import annotations

import argparse
import base64
import datetime
import hashlib
import json
import os
import sys
from pathlib import Path

from openpyxl import load_workbook

SOURCE = Path(
    r"C:\Users\nikyu\AppData\Local\hermes\attachments"
    r"\г. Новосибирск, пр. Карла Маркса, д.7 (1).xlsx"
)
TARGET = Path(".data/employees.json")

# Роль в кабинете по должности в графе «Д-сть».
ROLE_BY_POSITION = {
    "ССП": "curator",
    "СП": "seller",
    "СТ": "manager",
    "Подмена": "seller",
}


def hash_pin(pin: str, salt: bytes | None = None) -> str:
    """Хеш ПИН в формате node:crypto — `scrypt$<salt>$<hash>`."""
    salt_bytes = salt if salt is not None else os.urandom(16)
    derived = hashlib.scrypt(
        pin.encode("utf-8"),
        salt=salt_bytes,
        n=16384,
        r=8,
        p=1,
        dklen=32,
    )
    return (
        f"scrypt${base64.b64encode(salt_bytes).decode()}$"
        f"{base64.b64encode(derived).decode()}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Наполнение справочника")
    parser.add_argument("--limit", type=int, default=0, help="0 — все")
    parser.add_argument("--pin", default="", help="ПИН для всех записей (для проверки)")
    arguments = parser.parse_args()

    if not SOURCE.exists():
        print(f"Нет исходной книги: {SOURCE}")
        return 1

    workbook = load_workbook(SOURCE, data_only=False, read_only=True)
    sheet = workbook["график"]

    office = None
    for row in sheet.iter_rows(min_col=2, max_col=2, max_row=3):
        value = row[0].value
        if isinstance(value, str) and value.strip().lower().startswith("г."):
            office = value.strip()
            break

    employees = []
    seen = set()

    for row in sheet.iter_rows(min_col=1, max_col=2):
        position = row[0].value
        name = row[1].value

        if not isinstance(name, str) or not name.strip():
            continue
        if not isinstance(position, str) or not position.strip():
            continue

        clean_name = name.strip()
        lowered = clean_name.lower()
        if lowered.startswith("фамилия") or lowered.startswith("ввести"):
            continue
        # The address of the trading point sits in the same column.
        if lowered.startswith("г.") or lowered.startswith("точка продаж"):
            continue
        if clean_name in seen:
            continue

        seen.add(clean_name)
        employees.append(
            {
                "id": f"EMP-{len(employees) + 1:03d}",
                "name": clean_name,
                "office": office,
                "position": position.strip(),
                "roles": [ROLE_BY_POSITION.get(position.strip(), "seller")],
                "pinHash": hash_pin(arguments.pin) if arguments.pin else "",
                "active": True,
            }
        )

    workbook.close()

    if arguments.limit:
        employees = employees[: arguments.limit]

    if not employees:
        print("В графе не нашлось ни одной фамилии.")
        return 1

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for employee in employees:
        employee["createdAt"] = now
        employee["updatedAt"] = now

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(
        json.dumps({"version": 1, "employees": employees}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Справочник: {len(employees)} сотрудников → {TARGET}")
    print(f"Торговая точка: {office}")
    print()
    for employee in employees[:12]:
        print(
            f"  {employee['id']}  {employee['name'][:32]:34} "
            f"{employee['position']:10} {employee['roles'][0]}"
        )
    if len(employees) > 12:
        print(f"  … ещё {len(employees) - 12}")

    if not arguments.pin:
        print(
            "\nПИН не задан: выдайте его в разделе «Управление» — "
            "там же можно сбросить или отключить сотрудника."
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
