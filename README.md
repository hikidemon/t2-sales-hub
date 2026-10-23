# T2 Sales Hub

Демонстрационный портал мотивации продавцов. **Не является официальным продуктом,
сервисом или интеграцией T2.** Все данные синтетические, если не указано иное.

Интерфейс повторяет официальный стиль T2 (style guide `brand.t2.ru`) и добавляет два
слоя — **neo** (жёсткие бент-блоки) и **glassmorphism** (полупрозрачные поверхности).

## Стек

React 18 · TypeScript · Vite · TailwindCSS · React Router 6 · Express · Vitest · ESLint · Prettier · pnpm workspaces

## Требования

- Node.js 20+ (проверено на v24.22.0)
- pnpm 9+ (проверено на 12.4.2)

## Установка

```bash
pnpm install
cp .env.example .env   # необязательно: по умолчанию работает mock-режим
```

## Команды

| Команда                 | Что делает                       |
| ----------------------- | -------------------------------- |
| `pnpm run dev`          | Dev-серверы frontend и API       |
| `pnpm run build`        | Production-сборка frontend и API |
| `pnpm run typecheck`    | `tsc --noEmit` во всех пакетах   |
| `pnpm run lint`         | ESLint во всех пакетах           |
| `pnpm run format:check` | Проверка форматирования Prettier |
| `pnpm run format:write` | Форматирование Prettier          |
| `pnpm run test`         | Vitest во всех пакетах           |

Отдельное приложение:

```bash
pnpm --filter @t2-sales-hub/web dev     # frontend → http://localhost:5173
pnpm --filter @t2-sales-hub/api dev     # API      → http://localhost:3001
```

## Структура

```
apps/web          React SPA — личный кабинет продавца
apps/api          Express API — данные, синхронизация, уведомления, тесты
packages/core     Доменная логика, правила, адаптеры, синхронизация
packages/ui       Design system: токены и компоненты
packages/config   Tailwind-пресет, tsconfig, eslint
docs/data         Инвентарь источников, правила мотивации, настройка доступа
docs/design       Дизайн-система T2
scripts           Браузерные проверки (CDP) и извлечение дизайн-токенов
```

Подробное описание слоёв — в [ARCHITECTURE.md](./ARCHITECTURE.md),
визуальный язык — в [docs/design/DESIGN_SYSTEM.md](./docs/design/DESIGN_SYSTEM.md).

## Главная страница

Маршрут `/` — личный кабинет продавца, собранный по бент-системе T2.

**Что показывает:** источник данных и время последнего обновления; доход за период с
разбивкой на базовую часть и бонусы; детализацию бонусов; выполнение плана; карточки
демо-KPI; график дохода по дням; позицию в рейтинге; прогноз до конца периода;
назначенные тесты; ближайшую достижимую цель; последние операции; состояние внешних
интеграций.

**Интерактивность:** переключение периода, кнопка «Обновить данные», колокольчик
уведомлений, меню профиля, тултип графика, прохождение теста.

**Адаптивность:** проверено на 320×720, 375×812, 390×844, 768×1024, 1280×800, 1440×900.

## Источники данных

Приложение работает в двух режимах — переключение через `.env`:

| `DATA_SOURCE`         | Поведение                                                               |
| --------------------- | ----------------------------------------------------------------------- |
| `mock` (по умолчанию) | Синтетические данные из `packages/core`, внешние запросы не выполняются |
| `google-sheets`       | Живые данные из Google Sheets, синхронизация на сервере                 |

```bash
DATA_SOURCE=google-sheets
GOOGLE_SHEETS_SPREADSHEET_ID=1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw
GOOGLE_SHEETS_REPORT_GID=515868842
SYNC_INTERVAL_MS=300000
```

Полный список переменных — в [.env.example](./.env.example); подробная инструкция по
выдаче доступа и вариантам авторизации — в
[docs/data/GOOGLE_SHEETS_SETUP.md](./docs/data/GOOGLE_SHEETS_SETUP.md).

### API

| Endpoint                            | Назначение                                                    |
| ----------------------------------- | ------------------------------------------------------------- |
| `GET /api/health`                   | Живость сервиса                                               |
| `GET /api/dashboard`                | Данные главной страницы + время снимка и статус синхронизации |
| `GET /api/dashboard?period=YYYY-MM` | Данные конкретного периода                                    |
| `GET /api/ranking`                  | Блок рейтинга                                                 |
| `GET /api/employee/:id/income`      | Доход выбранного продавца                                     |
| `GET /api/sync/status`              | Состояние синхронизации                                       |
| `POST /api/sync/refresh`            | Ручная синхронизация (заголовок `x-sync-token`)               |
| `GET /api/notifications`            | Уведомления с фильтрами                                       |
| `GET /api/notifications/summary`    | Счётчики для бейджа                                           |
| `POST /api/notifications/:id/read`  | Отметить одно прочитанным                                     |
| `POST /api/notifications/read-all`  | Отметить все прочитанными                                     |
| `GET /api/tests/assigned/mine`      | Тесты, назначенные текущему продавцу                          |
| `GET /api/tests`                    | Все тесты (куратор)                                           |
| `POST /api/tests`                   | Создать тест (куратор, `x-curator-token`)                     |
| `PATCH /api/tests/:id`              | Изменить тест (куратор)                                       |
| `POST /api/tests/:id/publish`       | Опубликовать тест (куратор)                                   |
| `POST /api/tests/:id/archive`       | Архивировать тест (куратор)                                   |
| `POST /api/tests/:id/attempts`      | Отправить ответы (продавец)                                   |
| `GET /api/tests/:id/statistics`     | Результаты (куратор)                                          |
| `GET /api/integrations`             | Состояние внешних систем                                      |
| `GET /api/integrations/:kind`       | Состояние одной системы                                       |

### Авторизация

| Endpoint                        | Назначение                                                  |
| ------------------------------- | ----------------------------------------------------------- |
| `GET /api/auth/config`          | Что настроено на сервере: нужен ли вход, настроен ли портал |
| `GET /api/auth/abc-t2/login`    | Начать вход через портал ABC T2 (редирект)                  |
| `GET /api/auth/abc-t2/callback` | Возврат портала: обмен кода и выдача сессии                 |
| `GET /api/auth/me`              | Профиль вошедшего                                           |
| `POST /api/auth/logout`         | Завершить сессию                                            |

Пароль приложению не передаётся: используется OAuth 2.0 (Authorization Code + PKCE).
Браузер получает только подписанную cookie `t2_session`; токены портала остаются
на сервере. Сессия хранится в `.data/sessions.json` (шифрованном) и переживает
перезапуск API — повторно входить не нужно.

Роли (`seller`, `curator`, `manager`, `admin`) приходят из портала; дополнительно
назначаются по корпоративному логину через `AUTH_ADMIN_LOGINS` и
`AUTH_CURATOR_LOGINS`. Ролевой доступ заменил общий секрет для действий
куратора и ручного обновления данных.

Подробно — [docs/auth/ABC_T2_AUTH.md](./docs/auth/ABC_T2_AUTH.md).

## Обезличивание таблиц

Исходные рабочие книги содержат фамилии продавцов. Обезличенные копии
готовит `scripts/anonymize_sources.py` — правкой XLSX-архива, чтобы формулы,
графики и стили остались нетронутыми:

```bash
./.venv-sheets/Scripts/python.exe scripts/anonymize_sources.py \
    --input-dir "C:/Users/nikyu/AppData/Local/hermes/attachments" \
    --output-dir "build/anonymized" --reset
```

Загрузка на Google Диск и триггер автообновления — в
[docs/data/ANONYMIZATION.md](./docs/data/ANONYMIZATION.md).

Синхронизация выполняется **на сервере**: интервал по умолчанию 5 минут, начальный импорт
при старте, кеш последнего успешного снимка, ретраи с backoff, защита от параллельных
запусков. Браузер никогда не обращается к Google Sheets и не получает секретов.

## Проверки в браузере

Требуют запущенного dev-сервера и отдельного headless Chrome:

```bash
# 1. dev-сервер
pnpm --filter @t2-sales-hub/web dev

# 2. headless Chrome с отладочным портом
chrome --headless=new --remote-debugging-port=9222 \
  --user-data-dir="%LOCALAPPDATA%\Temp\t2-chrome-profile" http://localhost:5173/

# 3. проверки
node scripts/t2-responsive-check.mjs   # адаптивность + консоль
node scripts/t2-interaction-check.mjs  # интерактивность
node scripts/t2-style-probe.mjs        # фактически применённые цвета и шрифты
node scripts/t2-layout-probe.mjs       # композиция бента
```

Порт CDP задаётся аргументом или `CDP_PORT`. Пользовательский браузер не затрагивается.

## Документация

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — статус, результаты проверок, ограничения
- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура, слои, поток данных
- [ROADMAP.md](./ROADMAP.md) — этапы и критерии приёмки
- [DECISIONS.md](./DECISIONS.md) — технические решения и их следствия
- [docs/design/DESIGN_SYSTEM.md](./docs/design/DESIGN_SYSTEM.md) — палитра, типографика, neo, glass
- [docs/data/GOOGLE_SHEETS_INVENTORY.md](./docs/data/GOOGLE_SHEETS_INVENTORY.md) — что найдено в каждой таблице
- [docs/data/MOTIVATION_RULES.md](./docs/data/MOTIVATION_RULES.md) — правила расчёта мотивации
- [docs/data/GOOGLE_SHEETS_SETUP.md](./docs/data/GOOGLE_SHEETS_SETUP.md) — настройка доступа
- [docs/auth/ABC_T2_AUTH.md](./docs/auth/ABC_T2_AUTH.md) — вход через портал ABC T2, роли, сессии
- [docs/auth/PIN_AUTH.md](./docs/auth/PIN_AUTH.md) — запасной вход по ПИН и справочник сотрудников
- [docs/data/ANONYMIZATION.md](./docs/data/ANONYMIZATION.md) — обезличивание таблиц и автообновление
- [docs/data/GOOGLE_DRIVE_UPLOAD.md](./docs/data/GOOGLE_DRIVE_UPLOAD.md) — пошаговая загрузка таблиц на Диск
