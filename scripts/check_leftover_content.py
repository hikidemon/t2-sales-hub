"""
Скачивает книгу из Drive и проверяет, обезличена она или нет:
есть ли в графе «Фамилия СП» настоящие фамилии или псевдонимы.

Запуск: .venv-sheets/Scripts/python.exe scripts/check_leftover_content.py <fileId>
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN = Path(".data/google_token.json")

FAMOUS = ("исакова", "кононович", "гофман", "комардина", "дегтярева", "юрков")


def main() -> int:
    file_id = sys.argv[1] if len(sys.argv) > 1 else ""

    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    drive = build("drive", "v3", credentials=credentials)

    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory) / "book.xlsx"
        content = drive.files().get_media(fileId=file_id).execute()
        target.write_bytes(content)

        workbook = load_workbook(target, data_only=False, read_only=True)
        print("листы:", workbook.sheetnames[:12])

        if "график" in workbook.sheetnames:
            sheet = workbook["график"]
            for row in sheet.iter_rows(min_col=2, max_col=2, max_row=14):
                value = row[0].value
                if value:
                    print("  B:", repr(value))
        workbook.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
