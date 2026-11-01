#!/usr/bin/env python3
"""
Извлекает данные из всех прикреплённых Excel-файлов T2 Sales Hub
для проектирования схемы базы данных SQLite.
"""
import openpyxl
import json
import os
from pathlib import Path

ATTACH_DIR = Path(r"C:\Users\nikyu\AppData\Local\hermes\attachments")
FILES = [
    "НР_ Обновленная мотивация Т2 15.10.2026-3.xlsx",
    "г. Новосибирск, пр. Карла Маркса, д.7-3.xlsx",
    "График НР 2026-3.xlsx",
    "Копия  Планы продаж НР-3.xlsx",
    "Единый Калькулятор Combo -3.xlsx",
    "Комбо НСК -3.xlsx",
]

def extract_workbook(filepath):
    wb = openpyxl.load_workbook(filepath, data_only=False, read_only=False)
    result = {
        "filename": filepath.name,
        "sheets": []
    }
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        sheet_data = {
            "name": sheet_name,
            "dimensions": ws.dimensions,
            "max_row": ws.max_row,
            "max_column": ws.max_column,
            "data": [],
            "formulas": []
        }
        for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 200), values_only=False):
            row_data = []
            for cell in row:
                val = cell.value
                if val is not None:
                    row_data.append({
                        "coordinate": cell.coordinate,
                        "value": val,
                        "type": type(val).__name__
                    })
                    if isinstance(val, str) and val.startswith("="):
                        sheet_data["formulas"].append({
                            "coordinate": cell.coordinate,
                            "formula": val
                        })
            if row_data:
                sheet_data["data"].append(row_data)
        # Сериализуем формулы, отбрасывая несериализуемые объекты
        clean_formulas = []
        for f in sheet_data["formulas"]:
            clean_formulas.append({
                "coordinate": str(f.get("coordinate", "")),
                "formula": str(f.get("formula", ""))
            })
        sheet_data["formulas"] = clean_formulas
        result["sheets"].append(sheet_data)
    wb.close()
    return result

def main():
    all_data = []
    for fname in FILES:
        fpath = ATTACH_DIR / fname
        if not fpath.exists():
            print(f"WARNING: {fpath} не найден")
            continue
        print(f"Обработка: {fname}")
        wb_data = extract_workbook(fpath)
        all_data.append(wb_data)

    output = {
        "extracted_at": "2026-10-30",
        "files": all_data
    }

    out_path = Path("D:/allprj/t2/docs/data/excel_extraction.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=str)

    print(f"\nГотово. Данные сохранены в {out_path}")
    print(f"Обработано файлов: {len(all_data)}")

    # Краткая сводка
    for wb_data in all_data:
        print(f"\n=== {wb_data['filename']} ===")
        for sheet in wb_data["sheets"]:
            print(f"  Лист: {sheet['name']} ({sheet['max_row']}x{sheet['max_column']}, формул: {len(sheet['formulas'])})")

if __name__ == "__main__":
    main()
