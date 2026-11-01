import express from 'express';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite3';
import { promisify } from 'util';
import { signSessionId, readSessionId } from '../../modules/auth/cookie.js';
import { writeCookie, clearCookie, sessionCookieOptions, sessionCookieMaxAge } from '../../modules/auth/cookies.js';
import { env } from '../../shared/config/env.js';

const router = express.Router();
router.use(express.json({ limit: '1mb' }));

const DB_PATH = process.env.T2_DB_PATH || './data/t2_sales_hub.sqlite';

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;
  db = await new Promise<Database>((resolve, reject) => {
    const database = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(database);
    });
  });
  // Включаем поддержку промисов
  (db as any).run = promisify((db as any).run.bind(db));
  (db as any).get = promisify((db as any).get.bind(db));
  (db as any).all = promisify((db as any).all.bind(db));
  return db;
}

function rowToObject(row: any): any {
  if (!row) return null;
  const result: any = {};
  for (const key of Object.keys(row)) {
    result[key] = row[key];
  }
  return result;
}

// ============================================================
// АВТОРИЗАЦИЯ — имя + фамилия + PIN (универсальный пароль zxc44)
// ============================================================

interface LoginRequest {
  firstName: string;
  lastName: string;
  pin: string;
}

router.post('/auth/login', async (req, res) => {
  try {
    const { firstName, lastName, pin }: LoginRequest = req.body;

    if (!firstName || !lastName || !pin) {
      res.status(400).json({ error: 'Укажите имя, фамилию и пароль' });
      return;
    }

    const database = await getDb();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const employee = await (database as any).get(
      `SELECT id, full_name, last_name, role, position, region, point_of_sale, status, pin_hash FROM employees WHERE full_name = ? AND status = 'active'`,
      [fullName]
    );

    if (!employee) {
      // Одинаковый ответ на неверное имя и неверный PIN (без раскрытия)
      res.status(401).json({ error: 'Неверные имя, фамилия или пароль' });
      return;
    }

    // Универсальный пароль zxc44 для тестового режима
    const isValidPin = pin === 'zxc44';

    if (!isValidPin) {
      res.status(401).json({ error: 'Неверные имя, фамилия или пароль' });
      return;
    }

    // Создаём сессию
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const secret = env.AUTH_COOKIE_SECRET || 't2-dev-secret-change-in-production';
    const signedSessionId = signSessionId(sessionId, secret);

    // Сохраняем сессию в БД
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 дней
    await (database as any).run(
      `INSERT INTO user_sessions (employee_id, session_token, expires_at) VALUES (?, ?, ?)`,
      [employee.id, sessionId, expiresAt]
    );

    writeCookie(res, env.AUTH_COOKIE_NAME || 't2_session', signedSessionId, {
      ...sessionCookieOptions(),
      maxAge: sessionCookieMaxAge(),
    });

    res.json({
      user: {
        id: employee.id,
        fullName: employee.full_name,
        lastName: employee.last_name,
        role: employee.role,
        position: employee.position,
        region: employee.region,
        pointOfSale: employee.point_of_sale,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

router.get('/auth/me', async (req, res) => {
  try {
    const sessionId = readSessionId(req);
    if (!sessionId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const database = await getDb();
    const session = await (database as any).get(
      `SELECT s.*, e.full_name, e.last_name, e.role, e.position, e.region, e.point_of_sale, e.status
       FROM user_sessions s
       JOIN employees e ON s.employee_id = e.id
       WHERE s.session_token = ? AND s.expires_at > datetime('now')`,
      [sessionId]
    );

    if (!session) {
      res.status(401).json({ error: 'Сессия истекла или недействительна' });
      return;
    }

    res.json({
      user: {
        id: session.employee_id,
        fullName: session.full_name,
        lastName: session.last_name,
        role: session.role,
        position: session.position,
        region: session.region,
        pointOfSale: session.point_of_sale,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const sessionId = readSessionId(req);
    if (sessionId) {
      const database = await getDb();
      await (database as any).run(`DELETE FROM user_sessions WHERE session_token = ?`, [sessionId]);
    }
    clearCookie(res, env.AUTH_COOKIE_NAME || 't2_session', sessionCookieOptions());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================================
// ДЭШБОАРД — основные метрики из SQLite
// ============================================================

router.get('/dashboard', async (req, res) => {
  try {
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const database = await getDb();

    // Общий доход за месяц
    const incomeResult = await (database as any).get(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_income,
        COALESCE(SUM(bonus_amount), 0) as bonus_income,
        COUNT(DISTINCT employee_id) as active_employees
      FROM daily_sales
      WHERE sale_date >= ? AND sale_date < ?
    `, [startDate, endDate]);

    // Выполнение плана
    const planResult = await (database as any).get(`
      SELECT
        COALESCE(SUM(equipment_plan + accessories_plan + pdu_plan + sim_plan + mnp_plan + credits_plan), 0) as target_plan
      FROM employee_plans
      WHERE plan_year = ? AND plan_month = ?
    `, [year, month]);

    const actualPlan = incomeResult.total_income || 0;
    const targetPlan = planResult.target_plan || 50000;
    const progress = targetPlan > 0 ? Math.min((actualPlan / targetPlan) * 100, 100) : 0;

    // Рейтинг сотрудников
    const ranking = await (database as any).all(`
      SELECT
        e.id,
        e.full_name as name,
        e.role,
        e.position,
        COALESCE(SUM(d.total_amount), 0) as total_sales
      FROM employees e
      LEFT JOIN daily_sales d ON e.id = d.employee_id AND d.sale_date >= ? AND d.sale_date < ?
      WHERE e.status = 'active' AND e.role = 'seller'
      GROUP BY e.id, e.full_name, e.role, e.position
      ORDER BY total_sales DESC
      LIMIT 10
    `, [startDate, endDate]);

    // Динамика продаж по дням (последние 30 дней)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dynamics = await (database as any).all(`
      SELECT
        sale_date as date,
        COALESCE(SUM(total_amount), 0) as amount,
        COUNT(DISTINCT employee_id) as employees
      FROM daily_sales
      WHERE sale_date >= ?
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `, [thirtyDaysAgo]);

    // Мотивация / статусы
    const motivation = await (database as any).all(`
      SELECT
        e.id,
        e.full_name as name,
        e.role,
        COALESCE(SUM(d.total_amount), 0) as current_month_sales
      FROM employees e
      LEFT JOIN daily_sales d ON e.id = d.employee_id AND d.sale_date >= ? AND d.sale_date < ?
      WHERE e.status = 'active' AND e.role = 'seller'
      GROUP BY e.id, e.full_name, e.role
      ORDER BY current_month_sales DESC
      LIMIT 10
    `, [startDate, endDate]);

    res.json({
      period,
      income: {
        total: incomeResult.total_income || 0,
        breakdown: {
          bonuses: incomeResult.bonus_income || 0,
          products: (incomeResult.total_income || 0) - (incomeResult.bonus_income || 0),
        },
      },
      planPerformance: {
        actual: actualPlan,
        target: targetPlan,
        progress: Math.round(progress * 10) / 10,
      },
      ranking: ranking.map((r: any, i: number) => ({
        position: i + 1,
        employeeId: r.id,
        name: r.name,
        role: r.role,
        position: r.position,
        sales: r.total_sales || 0,
      })),
      salesChart: dynamics.map((d: any) => ({
        date: d.date,
        amount: d.amount || 0,
        employees: d.employees || 0,
      })),
      motivation: motivation.map((m: any) => ({
        employeeId: m.id,
        name: m.name,
        role: m.role,
        currentSales: m.current_month_sales || 0,
        status: (m.current_month_sales || 0) >= 50000 ? 'Выполнил план' :
                (m.current_month_sales || 0) >= 30000 ? 'В процессе' : 'Требуется улучшение',
        nextGoal: (m.current_month_sales || 0) >= 50000
          ? 'Цель достигнута'
          : `До ${50000 - (m.current_month_sales || 0)} ₽ до цели`,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Ошибка загрузки данных дашборда' });
  }
});

router.get('/dashboard/employees', async (req, res) => {
  try {
    const database = await getDb();
    const employees = await (database as any).all(
      `SELECT id, full_name as name, role, position, region, point_of_sale, status FROM employees WHERE status = 'active' ORDER BY full_name`
    );
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки сотрудников' });
  }
});

router.get('/dashboard/employee/:id', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const database = await getDb();

    const employee = await (database as any).get(
      `SELECT * FROM employees WHERE id = ?`,
      [employeeId]
    );

    if (!employee) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    const sales = await (database as any).all(
      `SELECT * FROM daily_sales WHERE employee_id = ? AND sale_date >= ? AND sale_date < ? ORDER BY sale_date DESC`,
      [employeeId, startDate, endDate]
    );

    const totalSales = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

    res.json({
      employee: {
        id: employee.id,
        fullName: employee.full_name,
        role: employee.role,
        position: employee.position,
        region: employee.region,
        pointOfSale: employee.point_of_sale,
      },
      totalSales,
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки данных сотрудника' });
  }
});

// ============================================================
// ЗДОРОВЬЕ API
// ============================================================

router.get('/health', async (_req, res) => {
  try {
    const database = await getDb();
    await (database as any).get(`SELECT 1 as test`);
    res.json({ status: 'ok', database: 'sqlite', source: 'local' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'sqlite', error: 'Database unavailable' });
  }
});

export default router;
