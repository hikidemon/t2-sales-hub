import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthApi from '@/shared/api/auth';

import { AuthProvider } from '../model/AuthProvider.js';
import { AuthGate } from './AuthGate.js';

const loadAuthConfig = vi.fn();
const loadCurrentUser = vi.fn();

vi.mock('@/shared/api/auth', () => {
  const actual = vi.importActual<typeof AuthApi>('@/shared/api/auth');
  return actual.then((module) => ({
    ...module,
    loadAuthConfig: () => loadAuthConfig(),
    loadCurrentUser: () => loadCurrentUser(),
  }));
});

/** Renders the gate with the auth provider around it. */
function renderGate(children: React.ReactNode) {
  return render(
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}

describe('AuthGate', () => {
  beforeEach(() => {
    loadAuthConfig.mockReset();
    loadCurrentUser.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the application when no sign-in is required', async () => {
    loadAuthConfig.mockResolvedValue({
      required: false,
      provider: 'abc-t2',
      providerConfigured: false,
      providerName: 'ABC T2',
    });
    loadCurrentUser.mockResolvedValue(null);

    renderGate(<p>Содержимое кабинета</p>);

    expect(await screen.findByText('Содержимое кабинета')).toBeInTheDocument();
  });

  it('shows the sign-in gate when a login is required', async () => {
    loadAuthConfig.mockResolvedValue({
      required: true,
      provider: 'abc-t2',
      providerConfigured: true,
      providerName: 'ABC T2',
    });
    loadCurrentUser.mockResolvedValue(null);

    renderGate(<p>Содержимое кабинета</p>);

    expect(
      await screen.findByRole('heading', { name: 'Вход в личный кабинет' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Содержимое кабинета')).not.toBeInTheDocument();
  });

  it('shows the application to a user who is already signed in', async () => {
    loadAuthConfig.mockResolvedValue({
      required: true,
      provider: 'abc-t2',
      providerConfigured: true,
      providerName: 'ABC T2',
    });
    loadCurrentUser.mockResolvedValue({
      id: '4711',
      provider: 'abc-t2',
      displayName: 'Иванова Пётр Петрович',
      roles: ['seller'],
    });

    renderGate(<p>Содержимое кабинета</p>);

    expect(await screen.findByText('Содержимое кабинета')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Вход в личный кабинет' })
    ).not.toBeInTheDocument();
  });

  it('shows a spinner while the session is being checked', () => {
    loadAuthConfig.mockReturnValue(new Promise(() => {}));
    loadCurrentUser.mockReturnValue(new Promise(() => {}));

    renderGate(<p>Содержимое кабинета</p>);

    expect(screen.getByText('Проверка авторизации')).toBeInTheDocument();
    expect(screen.queryByText('Содержимое кабинета')).not.toBeInTheDocument();
  });

  it('opens the application when the server cannot be reached', async () => {
    // A broken server must not lock the user out of the demo.
    loadAuthConfig.mockResolvedValue(null);
    loadCurrentUser.mockResolvedValue(null);

    renderGate(<p>Содержимое кабинета</p>);

    await waitFor(() => {
      expect(screen.getByText('Содержимое кабинета')).toBeInTheDocument();
    });
  });

  it('asks the server for the session only once', async () => {
    loadAuthConfig.mockResolvedValue({
      required: true,
      provider: 'abc-t2',
      providerConfigured: true,
      providerName: 'ABC T2',
    });
    loadCurrentUser.mockResolvedValue({
      id: '4711',
      provider: 'abc-t2',
      displayName: 'Иванова Пётр Петрович',
      roles: ['seller'],
    });

    renderGate(<p>Содержимое кабинета</p>);

    await screen.findByText('Содержимое кабинета');
    expect(loadCurrentUser).toHaveBeenCalledTimes(1);
  });
});
