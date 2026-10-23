/**
 * The fallback sign-in: name and PIN.
 *
 * This is the way in when the corporate portal is not available. The
 * person identifies themselves with their name from the employee
 * directory and the personal PIN issued by the administrator.
 */

import { useState } from 'react';

import { Button, Card, Icon } from '@t2-sales-hub/ui';

export interface PinSignInProps {
  /** Called when the sign-in succeeds. */
  onSignedIn: () => void;
  /** The API client of the sign-in. */
  signIn: (identifier: string, pin: string) => Promise<string | null>;
}

export function PinSignIn({ onSignedIn, signIn }: PinSignInProps) {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const failure = await signIn(identifier, pin);
      if (failure) {
        setError(failure);
        return;
      }
      onSignedIn();
    } catch {
      setError('Не удалось выполнить вход. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin-identifier" className="text-xs font-medium text-text-secondary">
          Фамилия и имя
        </label>
        <input
          id="pin-identifier"
          name="identifier"
          type="text"
          autoComplete="name"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Иванова Пётр Петрович"
          className="rounded-xl border border-border-secondary bg-background-tertiary px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin-code" className="text-xs font-medium text-text-secondary">
          Персональный ПИН
        </label>
        <input
          id="pin-code"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="••••"
          className="rounded-xl border border-border-secondary bg-background-tertiary px-3.5 py-2.5 text-sm tracking-[0.3em] text-text-primary outline-none transition-colors placeholder:tracking-normal placeholder:text-text-muted focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30"
        />
      </div>

      {error && (
        <p
          className="rounded-xl bg-danger-bg px-3 py-2 text-xs leading-relaxed text-danger-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || !identifier || !pin}
        className="w-full justify-center"
      >
        <Icon name="user" size="sm" />
        {isSubmitting ? 'Проверяем…' : 'Войти'}
      </Button>

      <p className="text-[0.6875rem] leading-relaxed text-text-muted">
        ПИН выдаёт администратор кабинета. Вход возможен только для сотрудников, указанных в
        справочнике.
      </p>
    </form>
  );
}

/** The card that holds the sign-in form. */
export function PinSignInCard(props: PinSignInProps) {
  return (
    <Card variant="outlined" className="p-6">
      <PinSignIn {...props} />
    </Card>
  );
}
