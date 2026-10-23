"""
Перезагружает обезличенные книги на Google Диск с приведением к
формату Google Sheets и включает доступ по ссылке.

Почему так: приложение читает таблицу по ссылке через gviz, а gviz
умеет только Google Sheets. Обычный .xlsx приложение не прочитает.

Также убирает дубликаты: в папке остаётся ровно один экземпляр
каждой книги.

Запуск:
    .venv-sheets/Scripts/python.exe scripts/upload_to_drive.py --convert
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]
TOKEN = Path(".data/google_token.json")
SOURCE = Path("build/anonymized")
FOLDER_NAME = "T2 Sales Hub"
SUBFOLDER_NAME = "Обезличенные"
SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet"


def find_folder(drive, name: str, parent_id: str | None = None) -> str | None:
    query = (
        "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"
    response = drive.files().list(q=query, fields="files(id, name, parents)").execute()
    for item in response.get("files", []):
        if item["name"] == name:
            return item["id"]
    return None


def ensure_folder(drive, name: str, parent_id: str | None) -> str:
    existing = find_folder(drive, name, parent_id)
    if existing:
        return existing

    metadata: dict[str, object] = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]
    folder = drive.files().create(body=metadata, fields="id, name").execute()
    return folder["id"]


def delete_duplicates(drive, folder_id: str) -> int:
    """Убирает всё, что уже лежит в папке: загрузка будет чистой."""
    response = drive.files().list(
        q=f"'{folder_id}' in parents and trashed = false",
        fields="files(id, name, mimeType)",
        supportsAllDrives=True,
    ).execute()

    removed = 0
    for item in response.get("files", []):
        drive.files().delete(fileId=item["id"], supportsAllDrives=True).execute()
        print(f"  удалён дубль: {item['name'][:44]} ({item['id']})")
        removed += 1
    return removed


def upload_as_sheet(drive, path: Path, folder_id: str) -> str:
    """Загружает книгу с приведением к Google Sheets."""
    metadata = {
        "name": path.stem,
        "mimeType": SPREADSHEET_MIME,
        "parents": [folder_id],
    }
    media = MediaFileUpload(str(path), mimetype="application/octet-stream", resumable=True)

    result = (
        drive.files()
        .create(
            body=metadata,
            media_body=media,
            fields="id, name, mimeType",
            supportsAllDrives=True,
        )
        .execute()
    )
    return result["id"]


def wait_for_conversion(drive, file_id: str, attempts: int = 30) -> str:
    """Ждёт, пока Drive приведёт файл к формату Google Sheets."""
    for _ in range(attempts):
        file = drive.files().get(fileId=file_id, fields="id, mimeType").execute()
        if file.get("mimeType") == SPREADSHEET_MIME:
            return file["mimeType"]
        time.sleep(4)
    return file.get("mimeType", "unknown")


def main() -> int:
    if not TOKEN.exists():
        print(f"Нет токена: {TOKEN}")
        return 1

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    drive = build("drive", "v3", credentials=credentials)

    files = sorted(path for path in SOURCE.glob("*.xlsx"))
    if not files:
        print(f"В {SOURCE} нет книг — сначала выполните anonymize_sources.py")
        return 1

    parent_id = ensure_folder(drive, FOLDER_NAME, None)
    folder_id = ensure_folder(drive, SUBFOLDER_NAME, parent_id)

    print("Убираю прежние загрузки из папки:")
    removed = delete_duplicates(drive, folder_id)
    if removed == 0:
        print("  папка была пуста")

    print(f"\nЗагружаю {len(files)} книг с приведением к Google Sheets:")
    results = []
    for path in files:
        file_id = upload_as_sheet(drive, path, folder_id)
        print(f"  {path.name[:44]:46} → {file_id} … приведение…", flush=True)
        mime = wait_for_conversion(drive, file_id)
        ok = "готов" if mime == SPREADSHEET_MIME else f"ОСТАЛСЯ {mime}"
        print(f"      {ok}")

        # Доступ по ссылке: приложение читает таблицу анонимно.
        try:
            drive.permissions().create(
                fileId=file_id,
                body={"type": "anyone", "role": "reader"},
                supportsAllDrives=True,
            ).execute()
        except Exception as error:  # noqa: BLE001
            print(f"      доступ не выставлен: {error}")

        results.append(
            {
                "name": path.stem,
                "id": file_id,
                "url": f"https://docs.google.com/spreadsheets/d/{file_id}/edit",
                "mimeType": mime,
            }
        )

    Path(".data/drive-files.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("\nГОТОВО:")
    for item in results:
        print(f"  {item['name'][:44]:46} {item['id']}")
    print("\nИдентификаторы: .data/drive-files.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
