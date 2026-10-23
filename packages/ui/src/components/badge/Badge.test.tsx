import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Демо</Badge>);
    expect(screen.getByText('Демо')).toBeInTheDocument();
  });

  it('renders decorative dot as hidden from assistive tech', () => {
    const { container } = render(<Badge dot>В работе</Badge>);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });
});
