"""
Убирает неиспользуемый справочник имён из обезличивателя.

Запуск: .venv-sheets/Scripts/python.exe scripts/cleanup_given_names.py
"""

import re
from pathlib import Path

TARGET = Path("scripts/anonymize_sources.py")


def main() -> int:
    source = TARGET.read_text(encoding="utf-8")

    start_marker = "# Распространённые русские имена"
    end_marker = "# Заголовки колонок, где лежат персональные данные."

    start = source.index(start_marker)
    end = source.index(end_marker)

    cleaned = source[:start] + source[end:]

    if "GIVEN_NAMES" in cleaned:
        print("Справочник имён всё ещё где-то используется — не трогаю.")
        return 1

    TARGET.write_text(cleaned, encoding="utf-8")
    print("Справочник имён удалён.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
