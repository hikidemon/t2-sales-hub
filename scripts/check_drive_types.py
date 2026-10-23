"""
Проверяет тип загруженных файлов: приложение читает таблицу по ссылке
через gviz, а gviz умеет только Google Sheets. Обычный .xlsx нужно
конвертировать при загрузке.

Запуск: .venv-sheets/Scripts/python.exe scripts/check_drive_types.py
"""

from __future__ import annotations

import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN = Path(".data/google_token.json")

SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet"
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def main() -> int:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    drive = build("drive", "v3", credentials=credentials)

    response = drive.files().list(
        q="trashed = false",
        fields="files(id, name, mimeType, parents)",
        supportsAllDrives=True,
        orderBy="name",
    ).execute()

    files = response.get("files", [])
    spreadsheets = [item for item in files if item["mimeType"] == SPREADSHEET_MIME]
    raw = [item for item in files if item["mimeType"] == XLSX_MIME]

    print(f"Google Sheets: {len(spreadsheets)}")
    for item in spreadsheets:
        print(f"  {item['name'][:50]:52} {item['id']}")

    print(f"\nОстались .xlsx (gviz их не прочитает): {len(raw)}")
    for item in raw:
        print(f"  {item['name'][:50]:52} {item['id']}")

    if raw:
        print(
            "\nИх нужно перезагрузить с приведением к Google Sheets "
            "(mimeType=application/vnd.google-apps.spreadsheet)."
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
