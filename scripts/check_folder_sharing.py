"""
Проверяет, кто имеет доступ к папке с исходными таблицами: реальные
фамилии продавцов не должны быть видны по ссылке.

Запуск: .venv-sheets/Scripts/python.exe scripts/check_folder_sharing.py
"""

from __future__ import annotations

import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN = Path(".data/google_token.json")


def describe(permission: dict) -> str:
    kind = permission.get("type")
    role = permission.get("role")
    if kind == "anyone":
        return f"ЛЮБОЙ, у кого есть ссылка → {role}"
    if kind == "user":
        return f"пользователь {permission.get('emailAddress')} → {role}"
    if kind == "group":
        return f"группа {permission.get('emailAddress')} → {role}"
    if kind == "domain":
        return f"весь домен {permission.get('domain')} → {role}"
    return f"{kind} → {role}"


def main() -> int:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    drive = build("drive", "v3", credentials=credentials)

    folders = drive.files().list(
        q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields="files(id, name)",
    ).execute()

    for folder in folders.get("files", []):
        print(f"\nпапка «{folder['name']}»  ({folder['id']})")

        try:
            permissions = drive.permissions().list(
                fileId=folder["id"],
                fields="permissions(id, type, role, emailAddress, domain)",
                supportsAllDrives=True,
            ).execute()
        except Exception as error:  # noqa: BLE001
            print(f"  не удалось прочитать: {error}")
            continue

        public = False
        for permission in permissions.get("permissions", []):
            line = describe(permission)
            print(f"  {line}")
            if permission.get("type") == "anyone":
                public = True

        if public:
            print("  ⚠ доступ по ссылке открыт — содержимое видно всем")

    return 0


if __name__ == "__main__":
    sys.exit(main())
