#!/usr/bin/env python3
"""
Инициализация базы данных T2 Sales Hub (SQLite).
Создаёт все таблицы на основе данных из прикреплённых Excel-файлов.
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path("D:/allprj/t2/data/t2_sales_hub.sqlite")

def init_database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    if DB_PATH.exists():
        DB_PATH.unlink()  # Пересоздаём с нуля
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # ============================================================
    # 1. СОТРУДНИКИ (из листов график, Планы продаж, и т.д.)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            role TEXT DEFAULT 'seller' CHECK(role IN ('seller', 'curator', 'manager', 'admin')),
            position TEXT,  -- СП, ССП, СТ, Подмена
            region TEXT DEFAULT 'Новосибирск',
            point_of_sale TEXT,  -- г. Новосибирск, пр. Карла Маркса, д.7
            hire_date TEXT,
            experience_months INTEGER DEFAULT 0,
            base_hourly_rate REAL DEFAULT 104.0,
            overtime_rate REAL DEFAULT 120.0,
            monthly_hours_norm INTEGER DEFAULT 165,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'on_leave', 'dismissed')),
            pin_hash TEXT,  -- хеш PIN-кода для входа
            is_active_login BOOLEAN DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ============================================================
    # 2. РЕГИОНЫ И ТОЧКИ ПРОДАЖ
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS regions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            city TEXT,
            address TEXT,
            hourly_rate REAL DEFAULT 104.0,
            overtime_rate REAL DEFAULT 120.0,
            gi_base_rate REAL DEFAULT 550.0,
            status TEXT DEFAULT 'active'
        )
    """)

    # ============================================================
    # 3. ПРОДУКТЫ И УСЛУГИ (из мотивации, Лист_продаж)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,  -- GI, Оборудование, Аксессуары, Связь, Услуги, и т.д.
            subcategory TEXT,
            base_rate REAL DEFAULT 0.0,
            unit_type TEXT DEFAULT 'unit',  -- unit, hour, amount, percent
            plan_quantity REAL DEFAULT 0.0,
            commission_rate REAL DEFAULT 0.0,
            min_plan_percent REAL DEFAULT 0.0,
            is_active BOOLEAN DEFAULT 1,
            description TEXT
        )
    """)

    # ============================================================
    # 4. ПРАВИЛА МОТИВАЦИИ (из НР_ Обновленная мотивация)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS motivation_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_type TEXT NOT NULL,  -- gi_tariff, priority_assets, mnp, digital_services, fixed_services, equipment, accessories, pdu, credits, yandex_split, vmr, mentor
            rule_name TEXT NOT NULL,
            conditions TEXT,  -- JSON с условиями
            calculation_logic TEXT,  -- SQL или текстовое описание формулы
            tariff_name TEXT,  -- Мой разговор, Мой онлайн, Black и т.д.
            base_amount REAL DEFAULT 0.0,
            rate_percent REAL DEFAULT 0.0,
            min_threshold REAL DEFAULT 0.0,
            max_threshold REAL DEFAULT 0.0,
            coefficient REAL DEFAULT 1.0,
            is_active BOOLEAN DEFAULT 1,
            effective_from TEXT,
            effective_to TEXT,
            notes TEXT
        )
    """)

    # ============================================================
    # 5. ТАРИФЫ GI (из блока GI мотивации)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS gi_tariffs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tariff_name TEXT NOT NULL,
            base_amount REAL DEFAULT 0.0,
            ftp_not_met_under_95 REAL DEFAULT 0.0,
            ftp_not_met_95_99 REAL DEFAULT 0.0,
            ftp_not_met_100_109 REAL DEFAULT 0.0,
            ftp_not_met_110 REAL DEFAULT 0.0,
            ftp_not_met_extra REAL DEFAULT 0.0,
            ftp_met_under_95 REAL DEFAULT 0.0,
            ftp_met_95_99 REAL DEFAULT 0.0,
            ftp_met_100_109 REAL DEFAULT 0.0,
            ftp_met_110 REAL DEFAULT 0.0,
            ftp_met_extra REAL DEFAULT 0.0,
            is_active BOOLEAN DEFAULT 1
        )
    """)

    # ============================================================
    # 6. ПЛАНЫ СОТРУДНИКОВ (из Копия Планы продаж НР)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS employee_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            plan_year INTEGER NOT NULL,
            plan_month INTEGER NOT NULL,
            equipment_plan REAL DEFAULT 0.0,
            accessories_plan REAL DEFAULT 0.0,
            pdu_plan REAL DEFAULT 0.0,
            plotter_plan REAL DEFAULT 0.0,
            insurance_plan REAL DEFAULT 0.0,
            combo_plan REAL DEFAULT 0.0,
            rtk_di_plan REAL DEFAULT 0.0,
            rtk_equipment_plan REAL DEFAULT 0.0,
            rtk_subscription_plan REAL DEFAULT 0.0,
            sim_plan REAL DEFAULT 0.0,
            mnp_plan REAL DEFAULT 0.0,
            credits_plan REAL DEFAULT 0.0,
            goals_count INTEGER DEFAULT 0,
            goals_completed INTEGER DEFAULT 0,
            attestation_allowed BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            UNIQUE(employee_id, plan_year, plan_month)
        )
    """)

    # ============================================================
    # 7. ЕЖЕДНЕВНЫЕ ПРОДАЖИ (из Лист_продаж)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS daily_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            sale_date TEXT NOT NULL,
            day_of_month INTEGER,
            product_id INTEGER,
            product_name TEXT,
            quantity REAL DEFAULT 0.0,
            unit_price REAL DEFAULT 0.0,
            total_amount REAL DEFAULT 0.0,
            bonus_amount REAL DEFAULT 0.0,
            overtime_hours REAL DEFAULT 0.0,
            is_leave BOOLEAN DEFAULT 0,
            attendance_status TEXT,  -- Я, В, Б
            description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)

    # ============================================================
    # 8. ГРАФИК РАБОТЫ (из листа график)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS work_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            work_date TEXT NOT NULL,
            day_of_month INTEGER,
            hours_planned REAL DEFAULT 0.0,
            hours_worked REAL DEFAULT 0.0,
            attendance_status TEXT,  -- Я, В, Б
            shift_type TEXT,  -- дневная, ночная
            is_weekend BOOLEAN DEFAULT 0,
            is_holiday BOOLEAN DEFAULT 0,
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            UNIQUE(employee_id, work_date)
        )
    """)

    # ============================================================
    # 9. МЕСЯЧНЫЕ ВЫПЛАТЫ (ЗП)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS monthly_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            payment_year INTEGER NOT NULL,
            payment_month INTEGER NOT NULL,
            base_salary REAL DEFAULT 0.0,
            overtime_pay REAL DEFAULT 0.0,
            gi_bonus REAL DEFAULT 0.0,
            priority_bonus REAL DEFAULT 0.0,
            mnp_bonus REAL DEFAULT 0.0,
            digital_services_bonus REAL DEFAULT 0.0,
            fixed_services_bonus REAL DEFAULT 0.0,
            equipment_bonus REAL DEFAULT 0.0,
            accessories_bonus REAL DEFAULT 0.0,
            pdu_bonus REAL DEFAULT 0.0,
            credits_bonus REAL DEFAULT 0.0,
            yandex_split_bonus REAL DEFAULT 0.0,
            vmr_bonus REAL DEFAULT 0.0,
            mentor_bonus REAL DEFAULT 0.0,
            total_bonus REAL DEFAULT 0.0,
            total_payment REAL DEFAULT 0.0,
            status TEXT DEFAULT 'calculated' CHECK(status IN ('calculated', 'paid', 'pending')),
            paid_date TEXT,
            notes TEXT,
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            UNIQUE(employee_id, payment_year, payment_month)
        )
    """)

    # ============================================================
    # 10. ВМР (Внутренний мониторинг)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS vmr_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            record_date TEXT NOT NULL,
            survey_type TEXT,  -- внешний, внутренний
            survey_result TEXT,  -- удовлетворительно, неудовлетворительно
            bonus_amount REAL DEFAULT 0.0,
            demotivation_amount REAL DEFAULT 0.0,
            mnp_offered BOOLEAN DEFAULT 0,
            rtk_offered BOOLEAN DEFAULT 0,
            sim_installed BOOLEAN DEFAULT 0,
            credit_offered BOOLEAN DEFAULT 0,
            installment_offered BOOLEAN DEFAULT 0,
            yandex_split_offered BOOLEAN DEFAULT 0,
            notes TEXT,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )
    """)

    # ============================================================
    # 11. НАСТАВНИКИ (Мотивация Наставников)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS mentor_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mentor_id INTEGER NOT NULL,
            intern_id INTEGER NOT NULL,
            milestone_type TEXT,  -- аттестация, контрольная_точка_1, контрольная_точка_2, отчетность
            bonus_amount REAL DEFAULT 0.0,
            achieved_date TEXT,
            is_verified BOOLEAN DEFAULT 0,
            FOREIGN KEY(mentor_id) REFERENCES employees(id),
            FOREIGN KEY(intern_id) REFERENCES employees(id)
        )
    """)

    # ============================================================
    # 12. КОМБО ТАРИФЫ (из Комбо НСК, Единый Калькулятор Combo)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS combo_tariffs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tariff_name TEXT NOT NULL,
            discount_percent REAL DEFAULT 0.0,
            model_name TEXT,
            stock_quantity INTEGER DEFAULT 0,
            price REAL DEFAULT 0.0,
            is_active BOOLEAN DEFAULT 1,
            source_file TEXT
        )
    """)

    # ============================================================
    # 13. АУДИТ ЛОГ (изменения данных)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
            old_values TEXT,  -- JSON
            new_values TEXT,  -- JSON
            changed_by TEXT,
            changed_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ============================================================
    # 14. СЕССИИ ПОЛЬЗОВАТЕЛЕЙ (для PIN-авторизации)
    # ============================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )
    """)

    conn.commit()
    conn.close()
    print(f"✓ База данных инициализирована: {DB_PATH}")
    return str(DB_PATH)

if __name__ == "__main__":
    init_database()
