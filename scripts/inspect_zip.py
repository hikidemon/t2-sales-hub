"""
Что внутри XLSX-архивов: есть ли общие строки, графики, картинки.

Запуск: .venv-sheets/Scripts/python.exe scripts/inspect_zip.py
"""

import sys
import zipfile
from pathlib import Path

ATTACHMENTS = Path(r"C:\Users\nikyu\AppData\Local\hermes\attachments")

FILES = [
    "Копия  Планы продаж НР.xlsx",
    "г. Новосибирск, пр. Карла Маркса, д.7 (1).xlsx",
    "График НР 2026.xlsx",
    "Комбо НСК .xlsx",
    "Единый Калькулятор Combo .xlsx",
    "НР_ Обновленная мотивация Т2 15.10.2026.xlsx",
]


def main() -> int:
    for name in FILES:
        path = ATTACHMENTS / name
        if not path.exists():
            print(f"нет файла: {name}")
            continue

        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            interesting = [
                item
                for item in names
                if item.startswith(("xl/charts/", "xl/media/", "xl/drawings/"))
            ]
            print(f"\n{name}")
            print(f"  частей: {len(names)}")
            print(f"  sharedStrings: {'xl/sharedStrings.xml' in names}")
            print(f"  calcChain: {'xl/calcChain.xml' in names}")
            print(f"  графиков/картинок: {len(interesting)}")
            for item in interesting[:6]:
                print(f"    {item}")
            worksheets = [item for item in names if item.startswith("xl/worksheets/")]
            print(f"  листов: {len(worksheets)}")
            if "xl/sharedStrings.xml" in names:
                size = archive.getinfo("xl/sharedStrings.xml").file_size
                print(f"  размер sharedStrings: {size} байт")

    return 0


if __name__ == "__main__":
    sys.exit(main())
