"""
Показывает, где лежат оставшиеся .xlsx и кому они принадлежат:
созданы скриптом загрузки (наш Google-клиент) или были в аккаунте
до этого.

Запуск: .venv-sheets/Scripts/python.exe scripts/inspect_leftovers.py
"""

from __future__ import annotations

import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN = Path(".data/google_token.json")
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def main() -> int:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    drive = build("drive", "v3", credentials=credentials)

    # Все папки — чтобы понять, где лежит файл.
    folders = drive.files().list(
        q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields="files(id, name)",
    ).execute()
    folder_names = {item["id"]: item["name"] for item in folders.get("files", [])}

    response = drive.files().list(
        q=f"mimeType = '{XLSX_MIME}' and trashed = false",
        fields="files(id, name, parents, createdTime, owners(emailAddress))",
        supportsAllDrives=True,
        orderBy="createdTime",
    ).execute()

    print(f"{'создан':22} {'в папке':22} файл")
    print("-" * 96)
    for item in response.get("files", []):
        parents = item.get("parents") or []
        where = ", ".join(folder_names.get(parent, "корень") for parent in parents)
        created = item.get("createdTime", "")[:19].replace("T", " ")
        print(f"{created:22} {where[:20]:22} {item['name'][:44]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
