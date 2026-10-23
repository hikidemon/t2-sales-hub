"""
Открывает доступ по ссылке на загруженные таблицы и печатает их
идентификаторы со ссылками.

Смысл: приложение читает таблицу по ссылке (gviz), поэтому у каждой
книги должен быть публичный доступ на чтение.

Запуск:
    .venv-sheets/Scripts/python.exe scripts/share_drive_files.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]
TOKEN = Path(".data/google_token.json")
FOLDER_NAME = "T2 Sales Hub"
SUBFOLDER_NAME = "Обезличенные"


def main() -> int:
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError:
        print("Нет пакетов Google API — pip install google-api-python-client google-auth")
        return 1

    if not TOKEN.exists():
        print(f"Нет токена: {TOKEN} — сначала выполните upload_to_drive.py --interactive")
        return 1

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    drive = build("drive", "v3", credentials=credentials)
    sheets = build("sheets", "v4", credentials=credentials)

    # Находим папку по точному имени: поиск Drive по имени похож на
    # префиксный, поэтому «T2 Sales Hub» может вернуть «Обезличенные».
    response = drive.files().list(
        q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields="files(id, name, parents)",
    ).execute()
    folders = [
        item for item in response.get("files", []) if item["name"] == FOLDER_NAME
    ]
    if not folders:
        print("Папка не найдена — загрузите книги заново.")
        return 1

    parent_id = folders[0]["id"]

    response = drive.files().list(
        q=(
            f"'{parent_id}' in parents and "
            "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        ),
        fields="files(id, name)",
    ).execute()
    subfolders = [
        item for item in response.get("files", []) if item["name"] == SUBFOLDER_NAME
    ]
    folder_id = subfolders[0]["id"] if subfolders else parent_id

    response = drive.files().list(
        q=f"'{folder_id}' in parents and trashed = false",
        fields="files(id, name, mimeType, webViewLink)",
        supportsAllDrives=True,
    ).execute()
    files = response.get("files", [])

    print(f"В папке «{FOLDER_NAME}/{SUBFOLDER_NAME}»: {len(files)} файлов\n")

    results = []
    for item in files:
        # Доступ по ссылке: любой, у кого есть ссылка, — читатель.
        try:
            drive.permissions().create(
                fileId=item["id"],
                body={"type": "anyone", "role": "reader"},
                supportsAllDrives=True,
            ).execute()
            shared = "открыт по ссылке"
        except Exception as error:  # noqa: BLE001
            shared = f"не удалось: {error}"

        # Идентификатор таблицы (для Google Sheets) и её листы.
        spreadsheet_id = item["id"]
        tabs: list[str] = []
        try:
            meta = sheets.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
            tabs = [
                f"{sheet['properties']['title']} (gid {sheet['properties']['sheetId']})"
                for sheet in meta.get("sheets", [])
            ]
        except Exception:  # noqa: BLE001
            tabs = []

        results.append(
            {
                "name": item["name"],
                "id": spreadsheet_id,
                "url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit",
                "shared": shared,
                "tabs": tabs,
            }
        )

        print(f"{item['name']}")
        print(f"  id:  {spreadsheet_id}")
        print(f"  url: {results[-1]['url']}")
        print(f"  доступ: {shared}")
        if tabs:
            print(f"  листов: {len(tabs)}")
            for tab in tabs[:6]:
                print(f"    - {tab}")
        print()

    Path(".data/drive-files.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("Список сохранён: .data/drive-files.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
