/**
 * The authentication gate — decides whether the application is shown
 * or the sign-in screen.
 *
 * The session is resolved on the server; the client only asks whether
 * a user is signed in. In demo mode (`AUTH_REQUIRED=false`) the
 * application opens without a login.
 *
 * Two ways in are supported and may be offered together:
 *  - the corporate portal (T2 ID) — the strongest option;
 *  - name and PIN against the employee directory — the fallback that
 *    works without any corporate access.
 */

import { useEffect, useState, type ReactNode } from 'react';

import { Icon } from '@t2-sales-hub/ui';
import { PinSignIn, SignInGate } from '@/features/auth';

import { buildLoginUrl, signInWithPin } from '@/shared/api/auth';

import { useAuth } from '../model/AuthProvider.js';

export interface AuthGateProps {
  children: ReactNode;
}

/** The message shown when the provider refused the sign-in. */
const REFUSED_MESSAGE = 'Вход не состоялся. Проверьте учётную запись и доступ к порталу.';

export function AuthGate({ children }: AuthGateProps) {
  const { config, user, isChecking, refresh } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The refused sign-in is reported through the URL. The parameter is
  // removed right away, so a reload does not show a stale error.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') !== 'failed') return;

    setErrorMessage(REFUSED_MESSAGE);
    params.delete('auth');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  if (isChecking) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Проверка авторизации</span>
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // A sign-in is required and there is no session.
  if (config?.required && !user) {
    const methods = config.methods ?? ['abc-t2'];
    const canUsePortal = methods.includes('abc-t2') && config.providerConfigured;
    const canUsePin = methods.includes('pin');

    if (canUsePin && !canUsePortal) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <PinSignInCard
              onSignedIn={refresh}
              errorMessage={errorMessage}
              signIn={signInWithPin}
            />
          </div>
        </div>
      );
    }

    if (canUsePin && canUsePortal) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <PinSignInCard
              onSignedIn={refresh}
              errorMessage={errorMessage}
              signIn={signInWithPin}
            />
            <div className="mt-4 flex items-center gap-3 px-2 text-[0.6875rem] text-text-muted">
              <span className="h-px flex-1 bg-border-secondary" />
              или
              <span className="h-px flex-1 bg-border-secondary" />
            </div>
            <div className="mt-4">
              <SignInGate
                providerName={config.providerName}
                loginUrl={buildLoginUrl(window.location.pathname)}
                errorMessage={errorMessage}
                providerMissing={!config.providerConfigured}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <SignInGate
        providerName={config.providerName}
        loginUrl={buildLoginUrl(window.location.pathname)}
        errorMessage={errorMessage}
        providerMissing={!config.providerConfigured}
      />
    );
  }

  return <>{children}</>;
}

/** The card with the PIN form and the heading. */
function PinSignInCard({
  onSignedIn,
  errorMessage,
  signIn,
}: {
  onSignedIn: () => void;
  errorMessage: string | null;
  signIn: (identifier: string, pin: string) => Promise<string | null>;
}) {
  return (
    <div className="neo-block-brand overflow-hidden rounded-2xl bg-background-card p-7 md:p-8">
      <div className="flex flex-col items-center gap-5 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white"
          aria-hidden="true"
        >
          T2
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl tracking-tight">Вход в кабинет</h1>
          <p className="text-sm leading-relaxed text-text-tertiary">
            Войдите по корпоративным данным. Доступ есть только у сотрудников, указанных в
            справочнике.
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

        <PinSignIn onSignedIn={onSignedIn} signIn={signIn} />

        <p className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted">
          <Icon name="check" size="sm" className="text-success-600" />
          сессия сохраняется — повторно входить не придётся
        </p>
      </div>
    </div>
  );
}

/** The signed-in user, for the parts of the interface that show it. */
export function useCurrentUser() {
  return useAuth().user;
}

/** A small badge showing that the session comes from the provider. */
export function ProviderBadge({ providerName }: { providerName: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-text-tertiary">
      <Icon name="check" size="sm" className="text-success-600" />
      вход через {providerName}
    </span>
  );
}
