import { useId } from 'react';

import clsx from 'clsx';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** The visible label. When absent, the field must have an aria-label. */
  label?: string;
  /** The error text; the field turns red and the message is announced. */
  error?: string;
  /** A hint under the field. */
  hint?: string;
}

/**
 * A text field.
 *
 * The label is tied to the input by its id, the error is announced
 * through `aria-describedby` and `aria-invalid`, and the focus ring is
 * visible for the keyboard.
 */
export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          'w-full rounded-xl border bg-background-tertiary px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted',
          'focus-visible:ring-2 focus-visible:ring-brand-500/30',
          error
            ? 'border-danger-500 focus:border-danger-500'
            : 'border-border-secondary focus:border-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-60'
        )}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-[0.6875rem] text-text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-[0.6875rem] text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
