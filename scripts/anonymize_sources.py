"""
Обезличивание исходных таблиц T2 Sales Hub.

Задача: убрать реальные персональные данные (ФИО продавцов, телефоны,
почту), не сломав ни одной формулы и не потеряв графики, стили,
защиту листов и комментарии.

Почему не openpyxl: при сохранении он выбрасывает графики, картинки
и часть форматирования. Поэтому здесь работа ведётся на уровне
XLSX-архива: правится только текст, а всё остальное переносится
байт-в-байт.

Что меняется:
  * `xl/sharedStrings.xml`  — текстовые значения ячеек;
  * `xl/worksheets/*.xml`   — строки, записанные инлайн, и ссылки на
                              переименованные листы внутри формул;
  * `xl/workbook.xml`       — названия листов-ФИО и определённые имена.

Что НЕ меняется:
  * сами формулы (кроме ссылки на переименованный лист — это
    переименование, а не изменение расчёта);
  * кэшированные значения, стили, графики, валидации, защита.

Запуск:
    .venv-sheets/Scripts/python.exe scripts/anonymize_sources.py \
        --input-dir "C:/Users/nikyu/AppData/Local/hermes/attachments" \
        --output-dir "build/anonymized"
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

# --------------------------------------------------------------------------
# Правила распознавания персональных данных
# --------------------------------------------------------------------------

# Фамилия: основа + характерное окончание.
# Окончания отобраны строго: обычные слова («мотивация», «задача»,
# «продажа») под них не подходят.
SURNAME_SUFFIXES = (
    "ов",
    "ова",
    "ев",
    "ева",
    "ин",
    "ина",
    "ын",
    "ына",
    "ский",
    "ская",
    "ук",
    "юк",
    "ченко",
    "енко",
    "ич",
    "их",
    "ых",
    "чёк",
    "чек",
    "ор",
    "ман",
    "оглы",
    "кызы",
    "ч",
)

_SURNAME_ALTERNATION = "|".join(
    sorted(set(SURNAME_SUFFIXES), key=len, reverse=True)
)

# Регистр не важен: в таблицах фамилии записаны и строчными, и КАПСОМ.
# Окончание проверяется без учёта регистра — «ИСАКОВА» и «Исакова» одно.
SURNAME_RE = re.compile(
    r"^[А-ЯЁа-яё]{2,19}(?i:" + _SURNAME_ALTERNATION + r")$"
)

# Фамилии, которые не угадываются по окончанию. Список явный и
# проверяемый: это реальные фамилии из рабочих книг.
EXTRA_SURNAMES = frozenset(
    """
    тойля шам кальт дель бады сур гендлер лидер фурман тиссен хачатрян горобец
    дядюра реутская маховский подлужный железняк поляк пиллер шкарстан оглы
    зальцман ходорик шовкопляс картовец тытынок гофман соловьёв друнес манжула
    эрнст гукк лыгалов арабкин
    """.split()
)

# Слова, с которых начинается название служебного раздела, а не ФИО.
NON_PERSON_WORDS = frozenset(
    """
    мотивация бонус комбо план планы график контроль отчёт отчет список лист
    сток данные исходные продажи продаж правила проверки видеомониторинг буфер
    вмп зп импорт шаблон копия расчёт расчет смета склад выручка доход итог
    итоги свод сводка таблица журнал настройки справочник калькулятор выгрузка
    загрузка магазин торговая точка устройство оборудование сим симы мкп тп
    впр аладдин ртк мтр одо чеки касса смена смены сессия товар товары
    номенклатура категория категории группа группы инструкция памятка
    январь февраль март апрель май июнь июль август сентябрь октябрь ноябрь
    декабрь combo infinix dash лист16 sales test
    """.split()
)

# Отчество — второй элемент полного имени.
PATRONYMIC_RE = re.compile(r"^[А-ЯЁа-яё]{2,19}(?i:ич|вна|чна|ична|оглы|кызы)$")

# Заголовки колонок, где лежат персональные данные.
PERSON_HEADER_KEYWORDS = (
    "фио",
    "ф.и.о",
    "ф и о",
    "фамилия",
    "фамилии",
    "сотрудник",
    "сотрудники",
    "продавец",
    "продавцы",
    "менеджер",
    "табел",
    "телефон",
    "тел.",
    "почта",
    "email",
    "логин",
    "login",
)

PHONE_RE = re.compile(r"(?:\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}")
EMAIL_RE = re.compile(r"[\w.\-+]+@[\w.\-]+\.[A-Za-z]{2,}")

# «Фамилия Имя» и «Фамилия Имя Отчество» — только когда фамилия опознана.
FULL_NAME_RE = re.compile(
    r"\b([А-ЯЁ][а-яё]{1,18}(?:" + "|".join(sorted(set(SURNAME_SUFFIXES), key=len, reverse=True)) + r"))"
    r"(?:\s+([А-ЯЁ][а-яё]{1,18}))?"
    r"(?:\s+([А-ЯЁ][а-яё]{1,18}))?\b"
)

# Название листа-ФИО: «Фамилия Имя» или «Фамилия И.О.»
SHEET_PERSON_RE = re.compile(
    r"^[А-ЯЁ][а-яё]{1,18}\s+[А-ЯЁ][а-яё]{1,18}(\s+[А-ЯЁ][а-яё]{1,18})?$"
)


def is_person_header(text: str | None) -> bool:
    if not isinstance(text, str):
        return False
    lowered = text.strip().lower()
    if not lowered or len(lowered) > 40:
        return False
    return any(keyword in lowered for keyword in PERSON_HEADER_KEYWORDS)


def is_full_name(value: str) -> bool:
    """ФИО целиком: фамилия с опознанным окончанием + имя."""
    text = value.strip()
    if not text or " " not in text:
        return False
    parts = text.split()
    if not 2 <= len(parts) <= 3:
        return False
    if not all(part[:1].isupper() for part in parts):
        return False
    return bool(SURNAME_RE.match(parts[0]))


def is_surname_like(word: str) -> bool:
    """Похоже на фамилию: характерное окончание или явный список."""
    lowered = word.lower()
    if lowered in EXTRA_SURNAMES:
        return True
    return bool(SURNAME_RE.match(word))


def looks_like_sheet_person_name(title: str) -> bool:
    """
    Название листа — это ФИО.

    Проверяется первая часть: она должна выглядеть как фамилия и не
    должна быть служебным словом. Так «Мотивация Наставников» — это
    раздел правил, а не человек, и остаётся нетронутым.
    """
    text = title.strip()
    if not text or len(text) > 60:
        return False

    parts = text.split()

    # «Жукова Анна 2» — тот же человек, номер листа в конце.
    if len(parts) > 2 and parts[-1].isdigit():
        parts = parts[:-1]

    if not 2 <= len(parts) <= 3:
        return False
    if not all(part[:1].isupper() for part in parts):
        return False

    if parts[0].lower() in NON_PERSON_WORDS:
        return False

    if not is_surname_like(parts[0]):
        return False

    if len(parts) == 2:
        return True

    # «Фамилия Имя Отчество» — отчество опознаётся по окончанию.
    return bool(PATRONYMIC_RE.match(parts[2]))


# --------------------------------------------------------------------------
# Словарь псевдонимов
# --------------------------------------------------------------------------


class PseudonymMap:
    """Устойчивое соответствие «настоящее имя → псевдоним»."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.entries: dict[str, str] = {}
        self.counter = 0
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            self.entries = {key: value for key, value in data.get("entries", {}).items()}
            self.counter = data.get("counter", len(self.entries))

    def alias_for(self, original: str) -> str:
        key = original.strip()
        if key in self.entries:
            return self.entries[key]
        self.counter += 1
        alias = f"EMP-{self.counter:03d}"
        self.entries[key] = alias
        return alias

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(
                {"counter": self.counter, "entries": self.entries},
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            ),
            encoding="utf-8",
        )

    def sorted_entries(self) -> list[tuple[str, str]]:
        return sorted(self.entries.items(), key=lambda item: item[1])


# --------------------------------------------------------------------------
# Работа с XML
# --------------------------------------------------------------------------

TEXT_TAG_RE = re.compile(r"(<t(?:\s[^>]*)?>)(.*?)(</t>)", re.DOTALL)
SHEET_NAME_RE = re.compile(r'(<sheet\b[^>]*?\bname=")([^"]*)(")')
SHEET_REF_RE_TEMPLATE = r"(?<![A-Za-zА-Яа-яЁё0-9_])(?:'{old}'|{old})!"
FORMULA_RE = re.compile(r"(<f(?:\s[^>]*)?>)(.*?)(</f>)", re.DOTALL)
INLINE_STRING_RE = re.compile(
    r"(<is>)(.*?)(</is>)", re.DOTALL
)
CELL_REF_ATTR_RE = re.compile(r'\br="([A-Z]+\d+)"')


def unescape(text: str) -> str:
    return (
        text.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&amp;", "&")
    )


def escape_text(text: str) -> str:
    return escape(text)


def replace_in_text(value: str, mapping: PseudonymMap, stats: dict) -> str:
    """Заменяет персональные данные внутри одной строки."""
    original = value

    # Телефоны и почта.
    def phone_sub(match: re.Match) -> str:
        digits = re.sub(r"\D", "", match.group(0))
        tail = digits[-4:] if len(digits) >= 4 else digits
        stats["phones"] += 1
        return f"+7 *** *** {tail}"

    def email_sub(match: re.Match) -> str:
        local, _, domain = match.group(0).partition("@")
        stats["emails"] += 1
        return f"{local[:1]}***@{domain}"

    value = PHONE_RE.sub(phone_sub, value)
    value = EMAIL_RE.sub(email_sub, value)

    # Известные фамилии — целиком, с учётом регистра.
    for original_name, alias in mapping.sorted_entries():
        pattern = re.compile(
            r"(?<![А-Яа-яЁёA-Za-z])" + re.escape(original_name) + r"(?![А-Яа-яЁёA-Za-z])",
            re.IGNORECASE,
        )
        if pattern.search(value):
            value = pattern.sub(alias, value)
            stats["names"] += 1

    return value if value != original else original


def rewrite_shared_strings(xml: str, mapping: PseudonymMap, stats: dict) -> str:
    """Заменяет текст в общих строках, сохраняя разметку прогрес-текста."""

    def replace_si(match: re.Match) -> str:
        block = match.group(0)
        tags = list(TEXT_TAG_RE.finditer(block))
        if not tags:
            return block

        texts = [unescape(tag.group(2)) for tag in tags]
        full = "".join(texts)
        updated = replace_in_text(full, mapping, stats)
        if updated == full:
            return block

        # Простой текст — меняем целиком. Прогрес-текст — первым run.
        if len(tags) == 1:
            new_block = (
                block[: tags[0].start(2)]
                + escape_text(updated)
                + block[tags[0].end(2) :]
            )
            return new_block

        pieces: list[str] = []
        last = 0
        for index, tag in enumerate(tags):
            piece = block[last : tag.start(2)]
            if index == 0:
                piece += escape_text(updated)
            else:
                piece += ""
            pieces.append(piece)
            last = tag.end(2)
        pieces.append(block[last:])
        return "".join(pieces)

    return re.sub(r"<si>.*?</si>", replace_si, xml, flags=re.DOTALL)


def rewrite_inline_strings(xml: str, mapping: PseudonymMap, stats: dict) -> str:
    def replace_is(match: re.Match) -> str:
        block = match.group(0)
        tags = list(TEXT_TAG_RE.finditer(block))
        if not tags:
            return block
        texts = [unescape(tag.group(2)) for tag in tags]
        full = "".join(texts)
        updated = replace_in_text(full, mapping, stats)
        if updated == full:
            return block
        if len(tags) == 1:
            return block[: tags[0].start(2)] + escape_text(updated) + block[tags[0].end(2) :]
        pieces = []
        last = 0
        for index, tag in enumerate(tags):
            pieces.append(block[last : tag.start(2)])
            if index == 0:
                pieces.append(escape_text(updated))
            last = tag.end(2)
        pieces.append(block[last:])
        return "".join(pieces)

    return INLINE_STRING_RE.sub(replace_is, xml)


def rewrite_formula_refs(xml: str, renames: dict[str, str]) -> str:
    """Обновляет ссылки на переименованные листы внутри формул."""
    if not renames:
        return xml

    def replace_formula(match: re.Match) -> str:
        formula = match.group(2)
        updated = formula
        for old, new in renames.items():
            pattern = re.compile(
                r"(?<![A-Za-zА-Яа-яЁё0-9_.])'"
                + re.escape(old)
                + r"'!|(?<![A-Za-zА-Яа-яЁё0-9_.])"
                + re.escape(old)
                + r"!"
            )
            replacement = f"'{new}'!" if " " in new else f"{new}!"
            updated = pattern.sub(replacement, updated)
        return match.group(1) + updated + match.group(3)

    return FORMULA_RE.sub(replace_formula, xml)


# --------------------------------------------------------------------------
# Сбор словаря
# --------------------------------------------------------------------------


def collect_person_columns(path: Path) -> list[tuple[str, int]]:
    """Находит колонки с персональными данными: (лист, номер колонки)."""
    from openpyxl import load_workbook

    workbook = load_workbook(path, data_only=False, read_only=False)
    found: list[tuple[str, int]] = []
    try:
        for sheet in workbook.worksheets:
            for row in sheet.iter_rows(min_row=1, max_row=min(12, sheet.max_row)):
                for cell in row:
                    if is_person_header(cell.value if isinstance(cell.value, str) else None):
                        found.append((sheet.title, cell.column))
    finally:
        workbook.close()
    return found


def collect_names(path: Path, mapping: PseudonymMap, stats: dict) -> list[str]:
    """Собирает фамилии из колонок-персон и названий листов."""
    from openpyxl import load_workbook

    discovered: list[str] = []

    workbook = load_workbook(path, data_only=False, read_only=False)
    try:
        for sheet in workbook.worksheets:
            if looks_like_sheet_person_name(sheet.title):
                discovered.append(sheet.title.strip())

            person_columns = {
                column
                for row in sheet.iter_rows(min_row=1, max_row=min(12, sheet.max_row))
                for cell in row
                if is_person_header(cell.value if isinstance(cell.value, str) else None)
                for column in [cell.column]
            }

            for column in person_columns:
                for row in sheet.iter_rows(min_col=column, max_col=column):
                    for cell in row:
                        value = cell.value
                        if not isinstance(value, str):
                            continue
                        text = value.strip()
                        if not text or text.startswith("="):
                            continue
                        # В одной ячейке может быть несколько фамилий.
                        for part in re.split(r"[\n,;/]+", text):
                            part = part.strip()
                            if part and SURNAME_RE.match(part):
                                discovered.append(part)
    finally:
        workbook.close()

    for name in discovered:
        if name not in mapping.entries:
            mapping.alias_for(name)
            stats["discovered"] += 1

    return discovered


# --------------------------------------------------------------------------
# Обработка файла
# --------------------------------------------------------------------------


def anonymize_workbook(
    source: Path,
    target: Path,
    mapping: PseudonymMap,
    stats: dict,
) -> dict:
    """Создаёт обезличенную копию книги, не трогая расчёты."""
    from openpyxl import load_workbook

    # 1. Какие листы переименовать.
    workbook = load_workbook(source, data_only=False, read_only=True)
    sheet_renames: dict[str, str] = {}
    for title in workbook.sheetnames:
        if looks_like_sheet_person_name(title):
            alias = mapping.alias_for(title.strip())
            sheet_renames[title] = f"Продавец {alias.replace('EMP-', '')}"
    workbook.close()

    # 2. Имена этой книги уже есть в словаре — собираем новые.
    collect_names(source, mapping, stats)

    report = {
        "file": source.name,
        "renamed_sheets": sheet_renames,
        "changed_parts": [],
    }

    target.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(source) as src, zipfile.ZipFile(
        target, "w", zipfile.ZIP_DEFLATED
    ) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            original_size = len(data)

            if item.filename == "xl/sharedStrings.xml":
                xml = data.decode("utf-8")
                updated = rewrite_shared_strings(xml, mapping, stats)
                data = updated.encode("utf-8")

            elif item.filename == "xl/workbook.xml":
                xml = data.decode("utf-8")

                def rename_sheet(match: re.Match) -> str:
                    name = unescape(match.group(2))
                    if name in sheet_renames:
                        return match.group(1) + escape_text(sheet_renames[name]) + match.group(3)
                    return match.group(0)

                xml = SHEET_NAME_RE.sub(rename_sheet, xml)
                # Определённые имена тоже могут ссылаться на лист.
                xml = rewrite_formula_refs(xml, sheet_renames)
                data = xml.encode("utf-8")

            elif item.filename.startswith("xl/worksheets/") and item.filename.endswith(".xml"):
                xml = data.decode("utf-8")
                xml = rewrite_inline_strings(xml, mapping, stats)
                xml = rewrite_formula_refs(xml, sheet_renames)
                data = xml.encode("utf-8")

            elif item.filename.startswith("xl/calcChain"):
                # Расчётная цепочка не меняется: формулы те же.
                pass

            dst.writestr(item, data)
            if len(data) != original_size:
                report["changed_parts"].append(item.filename)

    report["renamed_sheets"] = sheet_renames
    return report


# --------------------------------------------------------------------------
# Проверка результата
# --------------------------------------------------------------------------


def count_formulas(path: Path) -> int:
    """Считает формулы прямо в XML — это на порядок быстрее openpyxl."""
    total = 0
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if name.startswith("xl/worksheets/") and name.endswith(".xml"):
                xml = archive.read(name).decode("utf-8", errors="ignore")
                total += len(re.findall(r"<f(?:\s[^>]*)?>", xml))
    return total


def collect_leaks(path: Path, mapping: PseudonymMap) -> list[str]:
    """
    Ищет остатки фамилий в тексте книги.

    Сканируются общие строки и инлайн-строки листов — это то, что видит
    пользователь. Формулы не проверяются: они не содержат фамилий.
    """
    names = [name for name, _ in mapping.sorted_entries()]
    if not names:
        return []

    patterns = [
        re.compile(
            r"(?<![А-Яа-яЁёA-Za-z])" + re.escape(name) + r"(?![А-Яа-яЁёA-Za-z])",
            re.IGNORECASE,
        )
        for name in names
    ]

    leaked: list[str] = []

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
                for pattern in patterns:
                    if pattern.search(text):
                        leaked.append(f"{part}: {text[:80]}")
                        break

    return leaked


def verify(source: Path, target: Path, mapping: PseudonymMap) -> dict:
    """Сверяет оригинал и результат: формулы, остатки персональных данных."""
    source_formulas = count_formulas(source)
    target_formulas = count_formulas(target)
    leaked = collect_leaks(target, mapping)

    return {
        "formulas_before": source_formulas,
        "formulas_after": target_formulas,
        "formulas_preserved": source_formulas == target_formulas,
        "leaked": leaked[:20],
        "leak_count": len(leaked),
    }


# --------------------------------------------------------------------------
# Точка входа
# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Обезличивание таблиц T2")
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--map", default=".data/anonymization-map.json")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="забыть прежнюю карту псевдонимов и начать заново",
    )
    parser.add_argument(
        "--files",
        nargs="*",
        default=[
            "Копия  Планы продаж НР.xlsx",
            "г. Новосибирск, пр. Карла Маркса, д.7 (1).xlsx",
            "г. Новосибирск, пр. Карла Маркса, д.7.xlsx",
            "График НР 2026.xlsx",
            "Комбо НСК .xlsx",
            "Единый Калькулятор Combo .xlsx",
            "НР_ Обновленная мотивация Т2 15.10.2026.xlsx",
        ],
    )
    arguments = parser.parse_args()

    input_dir = Path(arguments.input_dir)
    output_dir = Path(arguments.output_dir)

    map_path = Path(arguments.map)
    if arguments.reset and map_path.exists():
        map_path.unlink()

    mapping = PseudonymMap(map_path)

    overall = {"names": 0, "phones": 0, "emails": 0, "discovered": 0}
    reports = []

    # Первый проход: собираем фамилии из всех книг, чтобы словарь был
    # полным до того, как начнём заменять. Иначе фамилия из второй книги
    # осталась бы в первой.
    print("Собираю справочник фамилий из всех книг…")
    for name in arguments.files:
        source = input_dir / name
        if not source.exists():
            continue
        before = len(mapping.entries)
        collect_names(source, mapping, {"discovered": 0})
        added = len(mapping.entries) - before
        if added:
            print(f"  {name[:44]}: +{added}")

    print(f"Справочник: {len(mapping.entries)} фамилий\n")

    for name in arguments.files:
        source = input_dir / name
        if not source.exists():
            print(f"ПРОПУЩЕНО (нет файла): {name}")
            continue

        stats = {"names": 0, "phones": 0, "emails": 0, "discovered": 0}
        target = output_dir / name

        print(f"\n{'=' * 78}\n{name}\n{'=' * 78}")
        report = anonymize_workbook(source, target, mapping, stats)
        report["stats"] = stats
        report["verification"] = verify(source, target, mapping)
        reports.append(report)

        for key in overall:
            overall[key] += stats[key]

        verification = report["verification"]
        print(f"  формул: {verification['formulas_before']} → {verification['formulas_after']} "
              f"({'сохранены' if verification['formulas_preserved'] else 'РАЗЛИЧАЮТСЯ!'})")
        print(f"  переименовано листов: {len(report['renamed_sheets'])}")
        print(f"  заменено имён/телефонов/почт: "
              f"{stats['names']}/{stats['phones']}/{stats['emails']}")
        print(f"  остатков персональных данных: {verification['leak_count']}")
        for line in verification["leaked"][:5]:
            print(f"    ! {line}")

    mapping.save()
    print(f"\n{'=' * 78}")
    print(f"Всего псевдонимов: {len(mapping.entries)} (карта: {mapping.path})")
    print(f"Заменено значений: {overall['names']}, телефонов: {overall['phones']}, почт: {overall['emails']}")

    report_path = output_dir / "anonymization-report.json"
    report_path.write_text(
        json.dumps(
            {
                "pseudonyms": len(mapping.entries),
                "overall": overall,
                "files": reports,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Отчёт: {report_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
