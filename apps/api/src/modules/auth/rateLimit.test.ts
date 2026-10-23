import { describe, expect, it } from 'vitest';

import { AttemptLimiter } from './rateLimit.js';

describe('AttemptLimiter', () => {
  it('allows the first attempts', () => {
    const limiter = new AttemptLimiter({ maxAttempts: 3, lockoutMs: 1000 });

    expect(limiter.isBlocked('a')).toBe(false);
    expect(limiter.fail('a').remaining).toBe(2);
    expect(limiter.fail('a').remaining).toBe(1);
    expect(limiter.isBlocked('a')).toBe(false);
  });

  it('blocks after the limit is reached', () => {
    const limiter = new AttemptLimiter({ maxAttempts: 3, lockoutMs: 1000 });

    limiter.fail('a');
    limiter.fail('a');
    const state = limiter.fail('a');

    expect(state.locked).toBe(true);
    expect(limiter.isBlocked('a')).toBe(true);
  });

  it('keeps the counters of different keys apart', () => {
    const limiter = new AttemptLimiter({ maxAttempts: 2, lockoutMs: 1000 });

    limiter.fail('a');
    limiter.fail('a');

    expect(limiter.isBlocked('a')).toBe(true);
    expect(limiter.isBlocked('b')).toBe(false);
  });

  it('clears the counter after a success', () => {
    const limiter = new AttemptLimiter({ maxAttempts: 2, lockoutMs: 1000 });

    limiter.fail('a');
    limiter.succeed('a');

    expect(limiter.state('a').remaining).toBe(2);
  });

  it('forgets the counter when the window has passed', () => {
    let now = 1_000_000;
    const limiter = new AttemptLimiter({
      maxAttempts: 3,
      lockoutMs: 1000,
      windowMs: 5000,
      now: () => now,
    });

    limiter.fail('a');
    limiter.fail('a');
    expect(limiter.state('a').remaining).toBe(1);

    now += 10_000;
    expect(limiter.state('a').remaining).toBe(3);
  });

  it('releases the block when the time is up', () => {
    let now = 1_000_000;
    const limiter = new AttemptLimiter({
      maxAttempts: 1,
      lockoutMs: 5000,
      now: () => now,
    });

    limiter.fail('a');
    expect(limiter.isBlocked('a')).toBe(true);

    now += 6000;
    expect(limiter.isBlocked('a')).toBe(false);
  });
});
