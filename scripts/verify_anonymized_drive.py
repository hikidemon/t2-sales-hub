"""
Проверяет, что в обезличенных таблицах на Диске вместо фамилий стоят
псевдонимы, и что в текущем источнике данных сайта персональных
данных нет.

Запуск: .venv-sheets/Scripts/python.exe scripts/verify_anonymized_drive.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

FILES = Path(".data/drive-files.json")

# Текущий источник данных сайта: сводная таблица «Общие».
CURRENT_SOURCE = "1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw"
CURRENT_REPORT_GID = 515868842

SURNAME_HINTS = (
    "исакова",
    "кононович",
    "гофман",
    "комардина",
    "дегтярева",
    "юрков",
    "саидова",
    "габдуллина",
    "елезова",
    "золотов",
    "абраменко",
    "малоземов",
    "журавлева",
)


def gviz_read(spreadsheet_id: str, gid: int) -> str:
    url = (
        f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/gviz/tq"
        f"?tqx=out:csv&gid={gid}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def find_sheet(tabs, title: str) -> int | None:
    for tab in tabs:
        if tab["properties"]["title"].strip().lower() == title.strip().lower():
            return tab["properties"]["sheetId"]
    return None


def main() -> int:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials.from_authorized_user_file(
        str(TOKEN := Path(".data/google_token.json")),
        ["https://www.googleapis.com/auth/spreadsheets"],
    )
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    sheets = build("sheets", "v4", credentials=credentials)
    items = json.loads(FILES.read_text(encoding="utf-8"))

    print("=== 1. Графа фамилий в обезличенной таблице на Диске ===")
    store = next(
        (item for item in items if item["name"].startswith("г. Новосибирск")),
        None,
    )
    if store:
        meta = sheets.spreadsheets().get(spreadsheetId=store["id"]).execute()
        gid = find_sheet(meta.get("sheets", []), "график")
        if gid is not None:
            text = gviz_read(store["id"], gid)
            print("  первые строки листа «график»:")
            for line in text.splitlines()[:14]:
                print(f"    {line[:90]}")
        else:
            print("  лист «график» не найден")

    print("\n=== 2. Текущий источник данных сайта (сводная «Общие») ===")
    try:
        meta = sheets.spreadsheets().get(spreadsheetId=CURRENT_SOURCE).execute()
        titles = [
            tab["properties"]["title"] for tab in meta.get("sheets", [])
        ]
        print(f"  листы: {', '.join(titles[:8])}")
        text = gviz_read(CURRENT_SOURCE, CURRENT_REPORT_GID)
        lines = text.splitlines()
        print(f"  строк в «Отчёт»: {len(lines)}")
        for line in lines[:6]:
            print(f"    {line[:110]}")

        lowered = text.lower()
        found = [name for name in SURNAME_HINTS if name in lowered]
        print(f"\n  фамилии продавцов в сводной таблице: {found or 'не найдены'}")
    except Exception as error:  # noqa: BLE001
        print(f"  не удалось прочитать: {error}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
