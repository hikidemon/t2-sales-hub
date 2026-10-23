import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';

describe('Progress', () => {
  it('exposes progressbar semantics with correct percentage', () => {
    render(<Progress value={40} max={200} label="План продаж" />);
    const bar = screen.getByRole('progressbar', { name: 'План продаж' });
    expect(bar).toHaveAttribute('aria-valuenow', '20');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps value above max to 100%', () => {
    render(<Progress value={300} max={100} label="Progress clamp max" />);
    const bar = screen.getByRole('progressbar', { name: 'Progress clamp max' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps negative value to 0%', () => {
    render(<Progress value={-10} max={100} label="Progress clamp min" />);
    const bar = screen.getByRole('progressbar', { name: 'Progress clamp min' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });
});
