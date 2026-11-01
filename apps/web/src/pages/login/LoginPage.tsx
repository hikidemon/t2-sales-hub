/**
 * Страница входа в T2 Sales Hub.
 * Тестовый режим: введите имя, фамилию и универсальный пароль zxc44.
 * Сессия хранится на сервере (HttpOnly cookie), повторный вход не требуется.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin } from '@/shared/api/api';
import { UserIcon, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        await apiLogin({ firstName, lastName, pin });
        navigate('/');
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'Неверные имя, фамилия или пароль');
        } else {
          setError('Неверные имя, фамилия или пароль');
        }
      } finally {
        setLoading(false);
      }
    },
    [firstName, lastName, pin, navigate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Брендированная шапка */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-magenta-600 flex items-center justify-center shadow-lg shadow-magenta-500/30">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">T2 Sales Hub</h1>
            <p className="text-xs text-slate-400">Личный кабинет продавца</p>
          </div>
        </div>

        {/* Карточка входа — glassmorphism */}
        <div className="relative rounded-2xl bg-white/5 p-8 border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-magenta-500 via-lime-400 to-blue-500 rounded-t-2xl" />

          <h2 className="mb-6 text-2xl font-bold text-white">Вход в кабинет</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Имя
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  maxLength="50"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-magenta-500 transition-all"
                  placeholder="Иван"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Фамилия
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  maxLength="50"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-magenta-500 transition-all"
                  placeholder="Исакова"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength="20"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-magenta-500 transition-all"
                  placeholder="••••••"
                />
              </div>
              <p className="text-xs text-lime-400">
                Тестовый пароль: <span className="font-mono text-lime-300">zxc44</span>
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-magenta-600 text-white font-semibold shadow-lg shadow-magenta-500/30 hover:bg-magenta-700 hover:shadow-magenta-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Войти
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              T2 Sales Hub v1.0
            </span>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-slate-300">Система онлайн</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          T2 Sales Hub — портал мотивации продавцов. Не является официальным продуктом T2.
        </p>
      </div>
    </div>
  );
}
