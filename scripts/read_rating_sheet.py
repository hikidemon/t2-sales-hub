"""
Читает скрытый лист «Ежедневный рейтинг выполнения фокусных
показателей» сводной таблицы «Общие».

Запуск:
    .venv-sheets/Scripts/python.exe scripts/read_rating_sheet.py [gid] [rows]
"""

from __future__ import annotations

import sys
import urllib.request

SPREADSHEET_ID = "1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw"
GID = 1367354557


def read_sheet(gid: int) -> str:
    url = (
        f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq"
        f"?tqx=out:csv&gid={gid}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def main() -> int:
    gid = int(sys.argv[1]) if len(sys.argv) > 1 else GID
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 40

    text = read_sheet(gid)
    lines = text.splitlines()
    print(f"строк: {len(lines)}\n")

    for index, line in enumerate(lines[:limit], start=1):
        print(f"{index:>3} | {line[:220]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
