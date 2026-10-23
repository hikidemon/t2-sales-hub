"""
Финальная проверка обезличивания: ищет фамилии сотрудников во всех
обезличенных книгах — включая места, куда не заглядывает проверка
отчёта (например, названия торговых точек «Ст <Фамилия>»).

Запуск: .venv-sheets/Scripts/python.exe scripts/final_leak_check.py
"""

import json
import re
import sys
import zipfile
from pathlib import Path

OUTPUT = Path("build/anonymized")
MAP = Path(".data/anonymization-map.json")

TEXT_TAG_RE = re.compile(r"(<t(?:\s[^>]*)?>)(.*?)(</t>)", re.DOTALL)


def unescape(text: str) -> str:
    return (
        text.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&amp;", "&")
    )


def main() -> int:
    if not MAP.exists():
        print("Карта псевдонимов не найдена — сначала выполните обезличивание.")
        return 1

    data = json.loads(MAP.read_text(encoding="utf-8"))
    names = list(data.get("entries", {}).keys())

    patterns = {
        name: re.compile(
            r"(?<![А-Яа-яЁёA-Za-z])" + re.escape(name) + r"(?![А-Яа-яЁёA-Za-z])",
            re.IGNORECASE,
        )
        for name in names
    }

    total_leaks = 0
    for path in sorted(OUTPUT.glob("*.xlsx")):
        leaks: list[tuple[str, str, str]] = []

        with zipfile.ZipFile(path) as archive:
            for part in archive.namelist():
                if not (
                    part == "xl/sharedStrings.xml"
                    or (part.startswith("xl/worksheets/") and part.endswith(".xml"))
                ):
                    continue
                xml = archive.read(part).decode("utf-8", errors="ignore")
                for tag in TEXT_TAG_RE.finditer(xml):
                    text = unescape(tag.group(2))
                    for name, pattern in patterns.items():
                        if pattern.search(text):
                            leaks.append((part, name, text[:70]))
                            break

        total_leaks += len(leaks)
        status = "чисто" if not leaks else f"НАЙДЕНО {len(leaks)}"
        print(f"{path.name[:48]:50} {status}")
        for part, name, text in leaks[:6]:
            print(f"    ! {name} в {part}: {text!r}")

    print()
    print(f"Всего утечек: {total_leaks}")
    return 0 if total_leaks == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
