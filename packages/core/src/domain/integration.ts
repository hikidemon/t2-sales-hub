/**
 * External system integration contract.
 *
 * T2 Sales Hub will eventually read from three kinds of corporate systems:
 *
 *   - **ABC T2** — the partner/retail management system (planned);
 *   - **1C**     — accounting and payroll (planned);
 *   - **Google Sheets** — the current working source.
 *
 * All of them implement the same contract, so a page written against
 * `ExternalSystemAdapter` never learns which system produced the data.
 * This is the seam that makes the next source cheap to add.
 *
 * IMPORTANT: the ABC T2 and 1C schemas are not confirmed yet. The
 * contract therefore describes capabilities, not field names — the
 * concrete payload shapes are added when the access is granted.
 */

/** Which corporate system an integration talks to. */
export type ExternalSystemKind = 'abc-t2' | 'onec' | 'google-sheets';

/** Lifecycle of a connection to an external system. */
export type IntegrationState =
  'not-configured' | 'checking' | 'available' | 'unauthorized' | 'unavailable' | 'error';

/**
 * A configured connection to an external system.
 * The `kind` is fixed by configuration; the credentials are never part
 * of this object — they live in the environment or a secret store.
 */
export interface ExternalSystemAdapter {
  readonly kind: ExternalSystemKind;
  /** Human-readable name shown in the interface. */
  readonly displayName: string;
  /**
   * Whether the system is reachable and authorised right now.
   * Must never throw — a failure is reported as `false`.
   */
  isAvailable(): Promise<boolean>;
  /**
   * A human-readable reason when the system is not available.
   * Used to explain the state in the interface.
   */
  describeUnavailableReason(): Promise<string | null>;
}

/** Description of an integration shown in the interface. */
export interface IntegrationDescriptor {
  kind: ExternalSystemKind;
  displayName: string;
  /** What the system provides — shown under the name. */
  purpose: string;
  state: IntegrationState;
  /** Whether the integration needs credentials the project does not have yet. */
  requiresCredentials: boolean;
  /** What is missing when the integration is not configured. */
  missingRequirements: string[];
  /** ISO timestamp of the last successful check. */
  lastCheckedAt: string | null;
}

/**
 * Capabilities an external system can provide.
 *
 * A system implements only what it actually supports — the interface
 * checks for the capability before calling it, so a source that cannot
 * provide, say, the ranking simply does not advertise it.
 */
export interface ExternalSystemCapabilities {
  /** Per-seller income and bonus breakdown. */
  readonly providesIncome: boolean;
  /** Plan values and plan completion. */
  readonly providesPlans: boolean;
  /** Ranking of sellers. */
  readonly providesRanking: boolean;
  /** Test and certification results. */
  readonly providesTests: boolean;
  /** Working schedule (shifts, hours). */
  readonly providesSchedule: boolean;
}

/** A generic record returned by an external system. */
export type ExternalRecord = Record<string, string | number | boolean | null>;
