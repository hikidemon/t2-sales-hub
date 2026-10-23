"""
Разбор входа по ПИН на реальных данных: ищет сотрудника, сверяет
хеш и печатает, на каком шаге всё расходится.

Запуск: .venv-sheets/Scripts/python.exe scripts/debug_pin.py
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
from pathlib import Path

TARGET = Path(".data/employees.json")


def main() -> int:
    data = json.loads(TARGET.read_text(encoding="utf-8"))
    employees = data["employees"]

    print(f"записей: {len(employees)}")
    first = employees[0]
    print(f"первая запись: {json.dumps(first, ensure_ascii=False)[:220]}")
    print()

    for employee in employees[:3]:
        parts = employee["pinHash"].split("$")
        print(f"{employee['name']}:")
        print(f"  частей: {len(parts)}, префикс: {parts[0] if parts else '—'}")
        if len(parts) != 3:
            print("  !! хеш в неожиданном формате")
            continue
        salt = base64.b64decode(parts[1])
        expected = base64.b64decode(parts[2])
        derived = hashlib.scrypt(
            b"1234", salt=salt, n=16384, r=8, p=1, dklen=32
        )
        print(f"  соль {len(salt)} байт, хеш {len(expected)} байт")
        print(f"  совпадение с ПИН 1234: {derived == expected}")

    # Ищем по имени так, как это делает сервер.
    target = "исакова"
    matches = [
        employee
        for employee in employees
        if employee["name"].strip().lower().replace("ё", "е").startswith(target)
    ]
    print(f"\nпоиск по «{target}»: найдено {len(matches)}")
    for employee in matches:
        print(f"  {employee['id']} {employee['name']} активен={employee['active']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
