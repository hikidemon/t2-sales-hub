import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Продажа</Button>);
    expect(screen.getByRole('button', { name: 'Продажа' })).toBeInTheDocument();
  });

  it('applies accessible busy state when loading', () => {
    render(<Button isLoading>Сохранение</Button>);
    const button = screen.getByRole('button', { name: /Сохранение/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Отправить</Button>);
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
  });

  it('forwards custom className', () => {
    render(<Button className="custom-class">Текст</Button>);
    expect(screen.getByRole('button', { name: 'Текст' })).toHaveClass('custom-class');
  });
});
