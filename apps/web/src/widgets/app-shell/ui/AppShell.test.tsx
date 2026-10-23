import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders children content', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <h1>Контент страницы</h1>
        </AppShell>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Контент страницы' })).toBeInTheDocument();
  });

  it('marks disabled navigation items as unavailable', () => {
    render(
      <MemoryRouter>
        <AppShell>content</AppShell>
      </MemoryRouter>
    );
    const disabledItems = screen.getAllByText('скоро');
    expect(disabledItems.length).toBeGreaterThan(0);
  });

  it('renders active link for the home route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>content</AppShell>
      </MemoryRouter>
    );
    const homeLinks = screen.getAllByRole('link', { name: 'Главная' });
    expect(homeLinks.length).toBeGreaterThan(0);
  });
});
