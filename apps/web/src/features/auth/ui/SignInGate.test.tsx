import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SignInGate } from './SignInGate.js';

describe('SignInGate', () => {
  it('offers the sign-in through the provider', () => {
    render(<SignInGate providerName="ABC T2" loginUrl="/api/auth/abc-t2/login" />);

    expect(screen.getByRole('heading', { name: 'Вход в личный кабинет' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Войти через ABC T2/ })).toHaveAttribute(
      'href',
      '/api/auth/abc-t2/login'
    );
  });

  it('never asks for a password', () => {
    const { container } = render(
      <SignInGate providerName="ABC T2" loginUrl="/api/auth/abc-t2/login" />
    );

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('tells the user that the session is kept', () => {
    render(<SignInGate providerName="ABC T2" loginUrl="/api/auth/abc-t2/login" />);

    expect(screen.getByText(/сессия сохраняется/i)).toBeInTheDocument();
  });

  it('shows the reason of a refused sign-in', () => {
    render(
      <SignInGate
        providerName="ABC T2"
        loginUrl="/api/auth/abc-t2/login"
        errorMessage="Вход не состоялся. Проверьте учётную запись."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Вход не состоялся. Проверьте учётную запись.'
    );
  });

  it('explains that the provider is not configured yet', () => {
    render(<SignInGate providerName="ABC T2" loginUrl="/api/auth/abc-t2/login" providerMissing />);

    expect(screen.getByText(/ABC_T2_\*/)).toBeInTheDocument();
  });

  it('keeps the return path in the link', () => {
    const loginUrl = '/api/auth/abc-t2/login?returnTo=%2Fdashboard';
    render(<SignInGate providerName="ABC T2" loginUrl={loginUrl} />);

    expect(screen.getByRole('link', { name: /Войти через/ })).toHaveAttribute('href', loginUrl);
  });
});

describe('SignInGate — accessibility', () => {
  it('is reachable with the keyboard', () => {
    render(<SignInGate providerName="ABC T2" loginUrl="/api/auth/abc-t2/login" />);

    const link = screen.getByRole('link', { name: /Войти через/ });
    link.focus();
    expect(link).toHaveFocus();
  });
});
