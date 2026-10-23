/**
 * Sign-in gate.
 *
 * Shown when the application requires a login and the visitor has no
 * session. The button starts the OAuth flow on the server — the
 * browser never talks to the provider directly.
 */

import { Icon } from '@t2-sales-hub/ui';

export interface SignInGateProps {
  /** Display name of the provider, e.g. «ABC T2». */
  providerName: string;
  /** Where to send the user after signing in. */
  loginUrl: string;
  /** Shown when the sign-in was refused by the provider. */
  errorMessage?: string | null;
  /** True when the provider is not configured on the server. */
  providerMissing?: boolean;
}

export function SignInGate({
  providerName,
  loginUrl,
  errorMessage,
  providerMissing = false,
}: SignInGateProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="neo-block-brand overflow-hidden rounded-2xl bg-background-card p-7 md:p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white"
              aria-hidden="true"
            >
              T2
            </span>

            <div className="flex flex-col gap-2">
              <h1 className="font-display text-2xl tracking-tight">Вход в личный кабинет</h1>
              <p className="text-sm leading-relaxed text-text-tertiary">
                Авторизуйтесь через портал {providerName} под своей корпоративной учётной записью.
                Пароль приложению не передаётся.
              </p>
            </div>

            {errorMessage && (
              <p
                className="w-full rounded-xl bg-danger-bg px-3 py-2 text-xs leading-relaxed text-danger-600"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            {providerMissing && (
              <p className="w-full rounded-xl bg-warning-bg px-3 py-2 text-xs leading-relaxed text-warning-600">
                Портал {providerName} пока не настроен на сервере. Задайте переменные ABC_T2_* в
                файле .env.
              </p>
            )}

            <a
              href={loginUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500 px-4 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="user" size="sm" />
              Войти через {providerName}
            </a>

            <p className="text-[0.6875rem] leading-relaxed text-text-muted">
              После первого входа сессия сохраняется — повторно входить не придётся.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
