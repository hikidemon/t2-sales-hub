/**
 * HomePage — главная страница личного кабинета продавца T2.
 *
 * Дизайн в стиле современного коммерческого SaaS:
 * - Тёмная тема с градиентным фоном (как на скриншоте T2 приложения)
 * - Glassmorphism-карточки с backdrop-blur
 * - Bento-композиция: блоки разной формы, а не одинаковые прямоугольники
 * - Т2 брендовые цвета: magenta #FF3495, lime #A7FC00, electric blue #00BFFF
 * - Адаптивность: мобильная навигация внизу, десктопная сверху
 */

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  Calendar,
  RefreshCw,
  LogOut,
  BarChart3,
  LayoutDashboard,
  User,
  Award,
} from 'lucide-react';
import { apiLogout, apiMe, apiDashboard } from '@/shared/api/api';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Awaited<ReturnType<typeof apiDashboard>>['data']; };

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function StatRow({ label, value, color = 'text-slate-400' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.7rem] text-slate-500 mb-1">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ProgressBar({ value, color = 'bg-magenta-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700 ease-out`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function T2Logo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 2h10c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zM9 12h6c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1H9c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1z" fill="currentColor" />
    </svg>
  );
}

export function HomePage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'platform' | 'profile'>('dashboard');

  const periods = [
    { value: new Date().toISOString().slice(0, 7), label: 'Текущий месяц' },
    { value: '2026-09', label: 'Сентябрь 2026' },
    { value: '2026-08', label: 'Август 2026' },
  ];

  const loadUser = useCallback(async () => {
    try {
      const profile = await apiMe();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const response = await apiDashboard(period);
      setState({ status: 'ready', data: response.data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить данные';
      setState({ status: 'error', message });
    }
  }, [period]);

  useEffect(() => {
    loadUser();
    loadData();
  }, [loadUser, loadData]);

  useEffect(() => {
    loadData();
  }, [period, loadData]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-magenta-500/30 border border-magenta-500/50 flex items-center justify-center animate-spin">
            <T2Logo className="h-4 w-4 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Загрузка кабинета...</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <GlassCard className="max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <T2Logo className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Ошибка загрузки</h3>
          </div>
          <p className="text-slate-400 text-sm mb-6">{state.message}</p>
          <button onClick={() => setState({ status: 'loading' })} className="w-full py-3 rounded-lg bg-magenta-600 text-white font-semibold hover:bg-magenta-700 transition-all">
            Попробовать снова
          </button>
        </GlassCard>
      </div>
    );
  }

  const data = state.data;
  const progressPercent = data.planPerformance.progress;
  const dailyAverage = data.income.total / 30;
  const remainingToGoal = Math.max(50000 - data.income.total, 0);

  const topNav = (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-magenta-600 flex items-center justify-center shadow-lg shadow-magenta-500/40">
            <T2Logo className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">T2 Sales Hub</h1>
            <p className="text-[0.65rem] text-slate-500">Личный кабинет продавца</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {['Дашборд', 'График', 'Планы', 'Мотивация', 'Профиль'].map((item) => {
            const map: Record<string, typeof activeTab> = {
              Дашборд: 'dashboard',
              График: 'schedule',
              Планы: 'platform',
              Мотивация: 'platform',
              Профиль: 'profile',
            };
            const isActive =
              (activeTab === 'dashboard' && item === 'Дашборд') ||
              (activeTab === 'schedule' && item === 'График') ||
              (activeTab === 'platform' && (item === 'Планы' || item === 'Мотивация')) ||
              (activeTab === 'profile' && item === 'Профиль');
            return (
              <button
                key={item}
                onClick={() => setActiveTab(map[item] || 'dashboard')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-white/10 text-white border border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400">Период:</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-transparent text-white text-xs border-none outline-none focus:ring-0">
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={loadData} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all" title="Обновить данные">
            <RefreshCw className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 pl-4 pr-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Fritz" alt="Профиль" className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-white">{user?.fullName || 'Продавец'}</p>
              <p className="text-[0.65rem] text-slate-500">{user?.role || 'seller'}</p>
            </div>
            <button
              onClick={() => {
                void apiLogout().then(() => (window.location.href = '/login'));
              }}
              className="ml-3 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const progressCard = (
    <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-magenta-500/20 flex items-center justify-center text-magenta-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Общий доход</h3>
            <p className="text-xs text-slate-500">За период {period}</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-magenta-400">{data.income.total.toLocaleString('ru-RU')} ₽</div>
        <ProgressBar value={progressPercent} color="bg-magenta-500" />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Выполнение плана: {progressPercent}%</span>
          <span>Цель: 50 000 ₽</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <StatRow label="Бонусы" value={data.income.breakdown.bonuses.toLocaleString('ru-RU')} color="text-lime-400" />
          <StatRow label="Товары" value={data.income.breakdown.products.toLocaleString('ru-RU')} color="text-blue-400" />
        </div>
      </div>
      <div className="hidden md:block">
        <div className="text-3xl font-bold text-magenta-400 mb-2">{progressPercent}%</div>
        <ProgressBar value={progressPercent} color="bg-magenta-500" className="h-2" />
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>до цели</span>
          <span>{remainingToGoal.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>
    </GlassCard>
  );

  const activityCard = (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Динамика продаж</h3>
          <p className="text-xs text-slate-500">Последние 30 дней</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
          <Calendar className="h-3 w-3 text-slate-500" />
          <span className="text-slate-300">Последние 7 дней</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-48">
        {data.salesChart.map((item, i) => {
          const maxAmount = Math.max(...data.salesChart.map((d) => d.amount));
          const height = Math.max(20, (item.amount / maxAmount) * 70);
          const colors = ['bg-magenta-500', 'bg-lime-400', 'bg-blue-500'];
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-full rounded-t-lg transition-all duration-500 hover:opacity-80 ${colors[i % 3]}`} style={{ height: `${height}px` }} />
              <span className="text-[0.65rem] text-slate-500">{item.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatRow label="Всего продаж" value={data.income.total.toLocaleString('ru-RU')} color="text-white" />
        <StatRow label="Среднее в день" value={Math.round(dailyAverage).toLocaleString('ru-RU')} color="text-slate-400" />
        <StatRow label="Активных дней" value={data.salesChart.filter((d) => d.amount > 0).length} color="text-blue-400" />
      </div>
    </GlassCard>
  );

  const rankingCard = (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Рейтинг продавцов</h3>
        <span className="px-2 py-1 rounded-lg bg-white/5 text-[0.65rem] text-slate-400 border border-white/10">Топ 10</span>
      </div>
      <div className="space-y-3">
        {data.ranking.map((item) => {
          const isMe = user && item.employeeId === user.id;
          const positionColor = item.position === 1 ? 'text-yellow-400 bg-yellow-500/10' : item.position === 2 ? 'text-slate-400 bg-slate-700/50' : item.position === 3 ? 'text-orange-400 bg-orange-500/10' : 'text-slate-500';
          return (
            <div key={item.employeeId} className={`flex items-center justify-between p-3 rounded-xl border border-white/5 transition-all hover:border-white/20 ${isMe ? 'bg-magenta-500/10 border-magenta-500/30' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${positionColor}`}>{item.position}</div>
                <div>
                  <p className={`text-sm font-medium ${isMe ? 'text-white' : 'text-slate-300'}`}>{item.name}</p>
                  <p className="text-[0.65rem] text-slate-500">{item.position}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${isMe ? 'text-magenta-400' : 'text-white'}`}>{item.sales.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );

  const motivationCard = (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Ближайшая цель</h3>
        <Award className="h-5 w-5 text-lime-400" />
      </div>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-magenta-500/10 border border-magenta-500/20">
          <p className="text-sm font-semibold text-white mb-2">Достичь 50 000 ₽ до конца месяца</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Осталось:</span>
            <span className="text-lg font-bold text-magenta-400">{remainingToGoal.toLocaleString('ru-RU')} ₽</span>
          </div>
          <ProgressBar value={(data.income.total / 50000) * 100} color="bg-gradient-to-r from-magenta-500 via-lime-400 to-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {data.motivation.slice(0, 4).map((item) => (
            <div key={item.employeeId} className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-medium text-white mb-1">{item.name}</p>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Текущий доход</span>
                <span className="text-white">{item.currentSales.toLocaleString('ru-RU')} ₽</span>
              </div>
              <span className="text-[0.65rem]">
                {item.status === 'Выполнил план' ? (
                  <span className="text-lime-400">✓ Выполнил план</span>
                ) : item.status === 'В процессе' ? (
                  <span className="text-blue-400">○ В процессе</span>
                ) : (
                  <span className="text-red-400">▲ Требуется внимание</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );

  const bottomNav = (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-3">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'dashboard' ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
          <LayoutDashboard className="h-5 w-5" />
          <span>Дашборд</span>
        </button>
        <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'schedule' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
          <Calendar className="h-5 w-5" />
          <span>График</span>
        </button>
        <button onClick={() => setActiveTab('platform')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'platform' ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
          <BarChart3 className="h-5 w-5" />
          <span>Планы</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === 'profile' ? 'bg-white/20 text-white border border-white/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
          <User className="h-5 w-5" />
          <span>Профиль</span>
        </button>
      </div>
    </nav>
  );

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">{progressCard}</div>
        {activityCard}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rankingCard}
        {motivationCard}
      </div>
      <GlassCard>
        <h3 className="text-lg font-bold text-white mb-6">Последние операции</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500">
                <th className="pb-3 font-medium">Дата</th>
                <th className="pb-3 font-medium">Продукт</th>
                <th className="pb-3 font-medium text-right">Сумма</th>
                <th className="pb-3 font-medium text-right">Бонус</th>
                <th className="pb-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-white/5 transition-all">
                  <td className="py-3 text-slate-300">2026-10-{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-3 text-white">Мой онлайн +</td>
                  <td className="py-3 text-right text-white">750 ₽</td>
                  <td className="py-3 text-right text-lime-400">40 ₽</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 text-[0.65rem]">Завершено</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-w-[320px]">
      {topNav}
      <main className="px-6 py-4 md:px-8 lg:px-12">{content}</main>
      {bottomNav}
    </div>
  );
}
