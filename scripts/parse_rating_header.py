"""
Разбирает шапку листа «Ежедневный рейтинг выполнения фокусных
показателей»: какие группы показателей в ней есть и как устроены
колонки.

Запуск:
    .venv-sheets/Scripts/python.exe scripts/parse_rating_header.py
"""

from __future__ import annotations

import csv
import io
import sys
import urllib.request

SPREADSHEET_ID = "1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw"
GID = 1367354557


def read_rows(gid: int) -> list[list[str]]:
    url = (
        f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq"
        f"?tqx=out:csv&gid={gid}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8", errors="replace")
    return list(csv.reader(io.StringIO(text)))


def main() -> int:
    rows = read_rows(GID)
    if not rows:
        print("Пустой лист.")
        return 1

    header = rows[0]
    print(f"колонок в шапке: {len(header)}\n")

    # Группы показателей: «<Показатель> План», «Факт», «%», «М».
    groups: list[tuple[str, list[int]]] = []
    for index, cell in enumerate(header):
        name = cell.strip()
        if name.endswith(" План"):
            groups.append((name[: -len(" План")], [index]))
        elif groups:
            groups[-1][1].append(index)

    print("группы показателей:")
    for name, columns in groups:
        print(f"  {name:28} колонки {columns}")

    print("\nстроки данных (первые 5):")
    for row in rows[1:6]:
        print(f"  {row[0][:34]:36} " + " | ".join(row[2:10]))

    # Сколько торговых точек и какие показатели заполнены.
    print(f"\nвсего строк: {len(rows) - 1}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
