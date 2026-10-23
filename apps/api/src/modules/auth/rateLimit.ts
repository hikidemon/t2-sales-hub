/**
 * Limiter of the sign-in attempts.
 *
 * A PIN can be short, so guessing must be expensive. The limiter
 * counts the failed attempts per person and per address and blocks both
 * for a while when the limit is reached.
 *
 * The state lives in memory: a restart of the API clears the counters,
 * which is an acceptable trade-off — the worst case is a few extra
 * attempts.
 */

export interface AttemptLimiterOptions {
  /** How many failed attempts are allowed. */
  maxAttempts: number;
  /** How long the block lasts, in milliseconds. */
  lockoutMs: number;
  /** How long a successful attempt clears the counter, in milliseconds. */
  windowMs?: number;
  now?: () => number;
}

interface Bucket {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

export interface AttemptState {
  /** Whether the attempt is currently blocked. */
  locked: boolean;
  /** How many failures are left before the block. */
  remaining: number;
  /** When the block ends, in milliseconds. */
  lockedUntil: number;
}

export class AttemptLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly maxAttempts: number;
  private readonly lockoutMs: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: AttemptLimiterOptions) {
    this.maxAttempts = options.maxAttempts;
    this.lockoutMs = options.lockoutMs;
    this.windowMs = options.windowMs ?? options.lockoutMs;
    this.now = options.now ?? (() => Date.now());
  }

  /** The state of a key — by name and by address together. */
  state(key: string): AttemptState {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return { locked: false, remaining: this.maxAttempts, lockedUntil: 0 };
    }

    const now = this.now();

    if (bucket.lockedUntil > now) {
      return { locked: true, remaining: 0, lockedUntil: bucket.lockedUntil };
    }

    // The window has passed without a failure — the counter is forgotten.
    if (now - bucket.firstFailureAt > this.windowMs) {
      this.buckets.delete(key);
      return { locked: false, remaining: this.maxAttempts, lockedUntil: 0 };
    }

    return {
      locked: false,
      remaining: Math.max(0, this.maxAttempts - bucket.failures),
      lockedUntil: 0,
    };
  }

  /** True when the key may try again. */
  isBlocked(key: string): boolean {
    return this.state(key).locked;
  }

  /** Records a failed attempt. Returns the new state. */
  fail(key: string): AttemptState {
    const now = this.now();
    const existing = this.buckets.get(key);

    if (!existing || now - existing.firstFailureAt > this.windowMs) {
      const bucket: Bucket = { failures: 1, firstFailureAt: now, lockedUntil: 0 };

      // The limit may be one — then the very first failure locks.
      if (bucket.failures >= this.maxAttempts) {
        bucket.lockedUntil = now + this.lockoutMs;
        this.buckets.set(key, bucket);
        return { locked: true, remaining: 0, lockedUntil: bucket.lockedUntil };
      }

      this.buckets.set(key, bucket);
      return { locked: false, remaining: this.maxAttempts - 1, lockedUntil: 0 };
    }

    existing.failures += 1;

    if (existing.failures >= this.maxAttempts) {
      existing.lockedUntil = now + this.lockoutMs;
      return { locked: true, remaining: 0, lockedUntil: existing.lockedUntil };
    }

    return {
      locked: false,
      remaining: this.maxAttempts - existing.failures,
      lockedUntil: 0,
    };
  }

  /** Clears the counter of a key after a successful sign-in. */
  succeed(key: string): void {
    this.buckets.delete(key);
  }
}
