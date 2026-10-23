"""
Показывает листы сводной таблицы «Общие» и первые строки каждого —
ищет источник данных для рейтингов.

Запуск: .venv-sheets/Scripts/python.exe scripts/scan_obshie_sheets.py
"""

from __future__ import annotations

import sys
import urllib.request

SPREADSHEET_ID = "1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw"


def read_sheet(gid: int) -> str:
    url = (
        f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq"
        f"?tqx=out:csv&gid={gid}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def main() -> int:
    # Известные gid'ы сводной таблицы.
    gids = {
        "Отчет": 515868842,
        "Выполнение планов": 0,
        "Дневной план": 1431075653,
        "Планы": 1101403177,
    }

    for name, gid in gids.items():
        print(f"\n{'=' * 76}\n{name} (gid {gid})\n{'=' * 76}")
        try:
            text = read_sheet(gid)
        except Exception as error:  # noqa: BLE001
            print(f"  не удалось прочитать: {error}")
            continue

        lines = text.splitlines()
        print(f"  строк: {len(lines)}")
        for line in lines[:8]:
            print(f"    {line[:150]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
