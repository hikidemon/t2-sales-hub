"""
Проверяет, что загруженные книги читаются по ссылке — так, как читает
приложение (gviz), — и печатает их листы.

Запуск: .venv-sheets/Scripts/python.exe scripts/verify_drive_sheets.py
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

TOKEN = Path(".data/google_token.json")
FILES = Path(".data/drive-files.json")


def gviz_read(spreadsheet_id: str, gid: int = 0) -> tuple[int, str]:
    """Читает лист через gviz — тем же путём, что и приложение."""
    url = (
        f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/gviz/tq"
        f"?tqx=out:csv&gid={gid}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except Exception as error:  # noqa: BLE001
        return 0, str(error)


def main() -> int:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials.from_authorized_user_file(
        str(TOKEN), ["https://www.googleapis.com/auth/spreadsheets"]
    )
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    sheets = build("sheets", "v4", credentials=credentials)
    items = json.loads(FILES.read_text(encoding="utf-8"))

    print(f"{'файл':44} {'gviz':6} листов  первый лист")
    print("-" * 110)

    failures = 0
    for item in items:
        spreadsheet_id = item["id"]

        # Какие листы внутри.
        try:
            meta = sheets.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
            tabs = meta.get("sheets", [])
        except Exception as error:  # noqa: BLE001
            print(f"{item['name'][:42]:44} ОШИБКА  {error}")
            failures += 1
            continue

        # Читается ли по ссылке без входа.
        status, text = gviz_read(spreadsheet_id, 0)
        first_line = text.splitlines()[0][:60] if status == 200 and text else text[:60]
        mark = "OK" if status == 200 else "FAIL"

        print(
            f"{item['name'][:42]:44} {mark:6} {len(tabs):6}  {first_line}"
        )

        if status != 200:
            failures += 1
            for tab in tabs[:3]:
                print(f"      лист: {tab['properties']['title']}")
            continue

        if tabs:
            names = ", ".join(tab["properties"]["title"] for tab in tabs[:5])
            more = " …" if len(tabs) > 5 else ""
            print(f"      листы: {names}{more}")

    print()
    print(f"Ошибок: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
