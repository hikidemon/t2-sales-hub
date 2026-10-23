"""
Перечисляет листы сводной таблицы «Общие» с их gid — через API
Google Sheets (нужен токен, чтобы увидеть и закрытые листы).

Запуск:
    .venv-sheets/Scripts/python.exe scripts/list_obshie_tabs.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
TOKEN = Path(".data/google_token.json")
SPREADSHEET_ID = "1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw"

DANGEROUS = ("stale", "dangerous", "danger")


def main() -> int:
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError:
        print("Нет пакетов Google API")
        return 1

    if not TOKEN.exists():
        print(f"Нет токена: {TOKEN}")
        return 1

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    sheets = build("sheets", "v4", credentials=credentials)
    meta = sheets.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()

    print(f"Таблица: {meta.get('properties', {}).get('title')}")
    print(f"Листов: {len(meta.get('sheets', []))}\n")

    for sheet in meta.get("sheets", []):
        properties = sheet["properties"]
        title = properties["title"]
        gid = properties["sheetId"]
        grid = properties.get("gridProperties", {})
        size = f"{grid.get('rowCount', 0)}×{grid.get('columnCount', 0)}"

        flags = []
        if properties.get("hidden"):
            flags.append("скрыт")
        if properties.get("protectedRanges"):
            flags.append("защищён")
        if title.strip().lower() in DANGEROUS:
            flags.append("⚠")

        print(f"  gid {gid:>12}  {size:>12}  {title}  {' '.join(flags)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
