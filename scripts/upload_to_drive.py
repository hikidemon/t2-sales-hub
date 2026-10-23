"""
Загрузка обезличенных таблиц на Google Диск.

Нужен OAuth-токен Google. Два пути:

  1. Интерактивно (рекомендуется):
        python scripts/upload_to_drive.py --interactive
     Скрипт сам откроет браузер, проведёт вход и сохранит токен
     в `.data/google_token.json`.

  2. Готовый токен:
        python scripts/upload_to_drive.py --token path/to/token.json

Загружает папку `build/anonymized` в `T2 Sales Hub / Обезличенные` на
Диске и печатает идентификаторы файлов и ссылки — их нужно вписать в
`.env` (GOOGLE_SHEETS_*), чтобы сайт читал данные по ссылке.

Карта псевдонимов (`.data/anonymization-map.json`) на Диск не попадает
и остаётся только у вас.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import sys
import time
from pathlib import Path

# Область Google Drive для файлов и Google Sheets для чтения данных.
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]

FOLDER_NAME = "T2 Sales Hub"
SUBFOLDER_NAME = "Обезличенные"


def load_credentials(token_path: Path, interactive: bool):
    """Готовит учётные данные Google."""
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print(
            "Не хватает пакетов Google API. Установите их:\n"
            "    pip install google-api-python-client google-auth-credentials "
            "google-auth-oauthlib",
            file=sys.stderr,
        )
        raise SystemExit(1)

    credentials = None

    if token_path.exists():
        credentials = Credentials.from_authorized_user_file(
            str(token_path), SCOPES
        )
        print(f"Токен прочитан: {token_path}")

    if credentials and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        print("Токен обновлён")

    if not credentials or not credentials.valid:
        if not interactive:
            print(
                "Токен отсутствует или недействителен. Запустите с --interactive.",
                file=sys.stderr,
            )
            raise SystemExit(1)

        client_secret = Path.home() / ".hermes" / "google_client_secret.json"
        if not client_secret.exists():
            print(
                f"Нужен файл клиента: {client_secret}\n"
                "Скачайте его в Google Cloud Console → APIs & Services → "
                "Credentials → OAuth 2.0 Client ID (Desktop app).",
                file=sys.stderr,
            )
            raise SystemExit(1)

        flow = InstalledAppFlow.from_client_secrets_file(
            str(client_secret), SCOPES
        )
        credentials = flow.run_local_server(port=0)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(credentials.to_json(), encoding="utf-8")
        print(f"Токен сохранён: {token_path}")

    return credentials


def ensure_folder(drive, parent_id: str | None, name: str) -> str:
    """Находит или создаёт папку по имени."""
    query = (
        f"name = '{name}' and mimeType = 'application/vnd.google-apps.folder' "
        f"and trashed = false"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"

    response = drive.files().list(
        q=query, fields="files(id, name, parents)", supportsAllDrives=True
    ).execute()

    for file in response.get("files", []):
        return file["id"]

    metadata: dict[str, object] = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = drive.files().create(
        body=metadata, fields="id, name", supportsAllDrives=True
    ).execute()
    print(f"Создана папка «{name}»")
    return folder["id"]


def upload_file(drive, path: Path, parent_id: str) -> dict:
    """Загружает один файл."""
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"

    metadata = {"name": path.name, "parents": [parent_id]}

    media = None
    try:
        from googleapiclient.http import MediaFileUpload

        media = MediaFileUpload(str(path), mimetype=mime_type, resumable=True)
    except ImportError:
        pass

    if media is None:
        result = (
            drive.files()
            .create(body=metadata, media_body=path, fields="id, name, webViewLink")
            .execute()
        )
    else:
        result = (
            drive.files()
            .create(
                body=metadata,
                media_body=media,
                fields="id, name, webViewLink",
                supportsAllDrives=True,
            )
            .execute()
        )

    print(f"  загружено: {result['name']}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Загрузка таблиц на Google Диск")
    parser.add_argument("--source", default="build/anonymized")
    parser.add_argument("--token", default=".data/google_token.json")
    parser.add_argument("--interactive", action="store_true")
    arguments = parser.parse_args()

    source = Path(arguments.source)
    if not source.exists():
        print(f"Нет папки {source} — сначала выполните обезличивание.", file=sys.stderr)
        return 1

    files = sorted(path for path in source.glob("*.xlsx"))
    if not files:
        print(f"В папке {source} нет файлов .xlsx", file=sys.stderr)
        return 1

    try:
        from googleapiclient.discovery import build
    except ImportError:
        print(
            "Не хватает google-api-python-client. Установите:\n"
            "    pip install google-api-python-client google-auth-credentials "
            "google-auth-oauthlib",
            file=sys.stderr,
        )
        return 1

    credentials = load_credentials(Path(arguments.token), arguments.interactive)
    drive = build("drive", "v3", credentials=credentials)
    sheets = build("sheets", "v4", credentials=credentials)

    parent_id = ensure_folder(drive, None, FOLDER_NAME)
    folder_id = ensure_folder(drive, parent_id, SUBFOLDER_NAME)

    print(f"\nЗагружаю {len(files)} файлов в «{FOLDER_NAME}/{SUBFOLDER_NAME}»:")

    uploaded = []
    for path in files:
        result = upload_file(drive, path, folder_id)
        uploaded.append(result)
        time.sleep(0.4)

    print("\nГотово. Ссылки на файлы:")
    for result in uploaded:
        print(f"  {result['name']}")
        print(f"    {result.get('webViewLink', '')}")

    print(
        "\nСледующий шаг: откройте каждый файл на Google Диске и включите\n"
        "«Доступ по ссылке» (кто угодно с ссылкой — просмотр), затем\n"
        "скопируйте идентификатор таблицы из адреса и впишите его в .env:\n"
        "  GOOGLE_SHEETS_SPREADSHEET_ID=...\n"
        "  GOOGLE_SHEETS_REPORT_GID=..."
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
