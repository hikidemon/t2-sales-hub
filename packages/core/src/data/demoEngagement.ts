/**
 * Synthetic demo data for notifications and quizzes.
 *
 * All content is fabricated. The demo seller is a fictional profile.
 */

import type { AppNotification, NotificationCategory } from '../domain/notification.js';
import type { QuizTest, TestAssignment, TestAttempt } from '../domain/quiz.js';

/** Fixed timestamp so the demo dataset is deterministic. */
const DEMO_NOW = '2026-10-21T09:00:00.000Z';

function minutesAgo(minutes: number): string {
  return new Date(Date.parse(DEMO_NOW) - minutes * 60_000).toISOString();
}

type NotificationSeed = Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'channel'> & {
  minutesAgo: number;
  isRead?: boolean;
};

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  {
    minutesAgo: 12,
    category: 'plan',
    severity: 'info',
    title: 'План на ноябрь обновлён',
    body: 'План по оборудованию изменился с 230 000 ₽ до 245 000 ₽. Выполнение пересчитано автоматически.',
    isActionable: true,
    link: '/income',
    meta: { indicator: 'Оборудование', previousPlan: 230000, newPlan: 245000 },
  },
  {
    minutesAgo: 95,
    category: 'test',
    severity: 'warning',
    title: 'Назначен тест «Новые модели — ноябрь»',
    body: 'Тест необходимо пройти до 28 ноября. 12 вопросов, проходной порог — 80 %.',
    isActionable: true,
    link: '/tests',
    meta: { testId: 'quiz-models-november', questions: 12, passThreshold: 80 },
  },
  {
    minutesAgo: 240,
    category: 'bonus',
    severity: 'success',
    title: 'Начислен бонус «Новый постоянный клиент»',
    body: 'Бонус 8 000 ₽ добавлен к расчёту за текущий период.',
    isActionable: false,
    link: '/income',
    meta: { amount: 8000 },
  },
  {
    minutesAgo: 480,
    category: 'integration',
    severity: 'info',
    title: 'Интеграция с ABC T2 ожидает настройки',
    body: 'Для получения данных о торговых точках требуется предоставить параметры подключения.',
    isActionable: true,
    link: '/integrations',
    meta: { system: 'abc-t2' },
  },
  {
    minutesAgo: 1_440,
    category: 'sync',
    severity: 'warning',
    title: 'Синхронизация задержалась',
    body: 'Источник данных не ответил за 15 секунд. Показана последняя успешная копия.',
    isActionable: false,
    meta: { source: 'google-sheets' },
  },
  {
    minutesAgo: 2_880,
    category: 'announcement',
    severity: 'info',
    title: 'Обновлена мотивация с 15.10.2026',
    body: 'Изменены ставки по блоку «Оборудование» и добавлен коэффициент для ЧС кредитования.',
    isActionable: false,
    link: '/',
    isRead: true,
  },
];

export const demoNotifications: AppNotification[] = NOTIFICATION_SEEDS.map((seed, index) => ({
  id: `notif-${index + 1}`,
  category: seed.category as NotificationCategory,
  severity: seed.severity,
  title: seed.title,
  body: seed.body,
  createdAt: minutesAgo(seed.minutesAgo),
  isRead: seed.isRead ?? false,
  isActionable: seed.isActionable,
  link: seed.link,
  channel: 'in-app',
  meta: seed.meta,
}));

export const demoTests: QuizTest[] = [
  {
    id: 'quiz-models-november',
    title: 'Новые модели — ноябрь',
    description: 'Проверка знания новинок ассортимента перед стартом продаж в ноябре.',
    status: 'published',
    passThreshold: 80,
    scoring: 'pass-percentage',
    durationMinutes: 20,
    createdAt: '2026-10-18T10:00:00.000Z',
    publishedAt: '2026-10-19T08:00:00.000Z',
    authorName: 'Ирина Соколова',
    dueAt: '2026-11-28T21:00:00.000Z',
    assigneeIds: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'Какой коэффициент применяется к бонусу за сим-карты, проданные через бумажные РФА?',
        weight: 1,
        explanation: 'Коэффициент 0,5 — из блока GI регламента мотивации.',
        options: [
          { id: 'o1', text: '1,0', isCorrect: false },
          { id: 'o2', text: '0,5', isCorrect: true },
          { id: 'o3', text: '0,75', isCorrect: false },
          { id: 'o4', text: 'Бонус не выплачивается', isCorrect: false },
        ],
      },
      {
        id: 'q2',
        prompt: 'При выполнении плана по оборудованию выше 120 % бонус за АО РТК:',
        weight: 1,
        explanation: 'Стоп-план: выше 120 % продажи не оплачиваются.',
        options: [
          { id: 'o1', text: 'Выплачивается 13 %', isCorrect: false },
          { id: 'o2', text: 'Выплачивается 10 %', isCorrect: false },
          { id: 'o3', text: 'Не оплачивается', isCorrect: true },
        ],
      },
      {
        id: 'q3',
        prompt: 'Норма часов на месяц для расчёта окладной части:',
        weight: 1,
        explanation: '165 часов в месяц — 21 смена.',
        options: [
          { id: 'o1', text: '120 часов', isCorrect: false },
          { id: 'o2', text: '165 часов (21 смена)', isCorrect: true },
          { id: 'o3', text: '180 часов', isCorrect: false },
        ],
      },
      {
        id: 'q4',
        prompt:
          'Бонус за подключение ШПД РТК при выполнении общего плана по подключениям на 90 % и более:',
        weight: 1,
        explanation: 'Фиксированная услуга: 1000 ₽ при плане ≥ 90 %, иначе 400 ₽.',
        options: [
          { id: 'o1', text: '400 ₽', isCorrect: false },
          { id: 'o2', text: '1000 ₽', isCorrect: true },
          { id: 'o3', text: '2000 ₽', isCorrect: false },
        ],
      },
    ],
  },
  {
    id: 'quiz-motivation-basics',
    title: 'Основы мотивации',
    description: 'Вводный тест для новых сотрудников: ставки, блоки и коэффициенты.',
    status: 'published',
    passThreshold: 70,
    scoring: 'pass-percentage',
    durationMinutes: 15,
    createdAt: '2026-09-01T10:00:00.000Z',
    publishedAt: '2026-09-02T08:00:00.000Z',
    authorName: 'Ирина Соколова',
    dueAt: null,
    assigneeIds: [],
    questions: [
      {
        id: 'q1',
        prompt: 'Ставка за час при расчёте окладной части:',
        weight: 1,
        options: [
          { id: 'o1', text: '96 ₽', isCorrect: false },
          { id: 'o2', text: '104 ₽', isCorrect: true },
          { id: 'o3', text: '120 ₽', isCorrect: false },
        ],
      },
      {
        id: 'q2',
        prompt: 'Ставка за час при переработке:',
        weight: 1,
        options: [
          { id: 'o1', text: '104 ₽', isCorrect: false },
          { id: 'o2', text: '120 ₽', isCorrect: true },
          { id: 'o3', text: '140 ₽', isCorrect: false },
        ],
      },
      {
        id: 'q3',
        prompt: 'Понижающий коэффициент при невыполнении плана GI на 95 %:',
        weight: 1,
        options: [
          { id: 'o1', text: '−5 %', isCorrect: true },
          { id: 'o2', text: '−10 %', isCorrect: false },
          { id: 'o3', text: 'Коэффициент не применяется', isCorrect: false },
        ],
      },
    ],
  },
  {
    id: 'quiz-vmr-draft',
    title: 'Видеомониторинг и ВМР',
    description: 'Черновик теста по правилам операторского мониторинга. Ещё не опубликован.',
    status: 'draft',
    passThreshold: 80,
    scoring: 'pass-percentage',
    durationMinutes: 10,
    createdAt: '2026-10-20T14:00:00.000Z',
    publishedAt: null,
    authorName: 'Ирина Соколова',
    dueAt: null,
    assigneeIds: [],
    questions: [
      {
        id: 'q1',
        prompt: 'Премия за анкету с результатом 101 % и выше:',
        weight: 1,
        options: [
          { id: 'o1', text: '1500 ₽', isCorrect: false },
          { id: 'o2', text: '2000 ₽', isCorrect: true },
          { id: 'o3', text: '300 ₽', isCorrect: false },
        ],
      },
    ],
  },
];

/** Demo attempts of the demo seller. */
export const demoAttempts: TestAttempt[] = [
  {
    id: 'attempt-quiz-motivation-basics-DEMO-0001',
    testId: 'quiz-motivation-basics',
    sellerId: 'DEMO-0001',
    answers: { q1: 'o2', q2: 'o2', q3: 'o1' },
    scorePercent: 100,
    passed: true,
    completedAt: '2026-09-10T11:20:00.000Z',
    durationSeconds: 640,
  },
];

/** Demo assignments of the demo seller. */
export const demoAssignments: TestAssignment[] = [
  {
    testId: 'quiz-motivation-basics',
    sellerId: 'DEMO-0001',
    state: 'passed',
    attemptId: 'attempt-quiz-motivation-basics-DEMO-0001',
    scorePercent: 100,
    dueAt: null,
  },
  {
    testId: 'quiz-models-november',
    sellerId: 'DEMO-0001',
    state: 'assigned',
    attemptId: null,
    scorePercent: null,
    dueAt: '2026-11-28T21:00:00.000Z',
  },
];
