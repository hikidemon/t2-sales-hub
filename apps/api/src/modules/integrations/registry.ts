/**
 * Integration registry.
 *
 * Describes every external system the project can talk to, and reports
 * honestly which ones are usable right now.
 *
 * The ABC T2 and 1C schemas are not confirmed — the access has not been
 * granted yet. Their adapters therefore report `not-configured` and
 * list what is missing, instead of pretending to work.
 */

import type {
  ExternalSystemAdapter,
  ExternalSystemKind,
  IntegrationDescriptor,
  IntegrationState,
} from '@t2-sales-hub/core';
import { GoogleSheetsAdapter } from '@t2-sales-hub/core';

import { env } from '../../shared/config/env.js';

/**
 * Placeholder adapter for a system whose access has not been granted.
 *
 * It implements the same contract as the working sources, so the wiring
 * is identical — only the implementation changes once the credentials
 * and the schema arrive.
 */
export class PendingExternalAdapter implements ExternalSystemAdapter {
  constructor(
    readonly kind: ExternalSystemKind,
    readonly displayName: string,
    private readonly missing: string[]
  ) {}

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async describeUnavailableReason(): Promise<string | null> {
    return this.missing.join('; ');
  }
}

/** The systems this project knows about. */
export const KNOWN_SYSTEMS: Array<{
  kind: ExternalSystemKind;
  displayName: string;
  purpose: string;
  requiresCredentials: boolean;
  missingRequirements: string[];
}> = [
  {
    kind: 'google-sheets',
    displayName: 'Google Sheets',
    purpose: 'Планы, факт и сводные показатели по торговым точкам',
    requiresCredentials: false,
    missingRequirements: [],
  },
  {
    kind: 'abc-t2',
    displayName: 'ABC T2',
    purpose: 'Справочник торговых точек, сотрудников, тарифов и чеков партнёра',
    requiresCredentials: true,
    missingRequirements: [
      'Доступ к тестовому контуру ABC T2',
      'Параметры авторизации (OAuth или сервисный аккаунт)',
      'Согласованная схема данных',
    ],
  },
  {
    kind: 'onec',
    displayName: '1С',
    purpose: 'Начисления, расчётные данные и официальные показатели',
    requiresCredentials: true,
    missingRequirements: [
      'Доступ к базе 1С',
      'Согласованный формат выгрузки',
      'Правила расчёта, подтверждённые владельцем процесса',
    ],
  },
];

/**
 * Builds the adapter for a system, given the configuration.
 *
 * A configured system gets a real adapter that reports its real
 * availability; an unconfigured one gets a placeholder that explains
 * what is missing. The placeholder must never be returned for a system
 * that is actually in use — the interface would then show a working
 * integration as unavailable.
 */
export function createAdapter(
  kind: ExternalSystemKind,
  configured: boolean
): ExternalSystemAdapter {
  const known = KNOWN_SYSTEMS.find((item) => item.kind === kind);
  if (!known) {
    return new PendingExternalAdapter(kind, kind, ['Система не описана']);
  }

  if (!configured) {
    return new PendingExternalAdapter(kind, known.displayName, known.missingRequirements);
  }

  if (kind === 'google-sheets') {
    // The Sheets adapter needs the spreadsheet id from the environment.
    return new ConfiguredSheetsAdapter();
  }

  // ABC T2 and 1C have no confirmed schema yet: a configured instance
  // still reports the requirements that are missing.
  return new PendingExternalAdapter(kind, known.displayName, known.missingRequirements);
}

/**
 * The live Google Sheets adapter.
 *
 * Availability is reported from the actual configuration and a real
 * read, not assumed.
 */
class ConfiguredSheetsAdapter implements ExternalSystemAdapter {
  readonly kind: ExternalSystemKind = 'google-sheets';
  readonly displayName = 'Google Sheets';

  async isAvailable(): Promise<boolean> {
    if (!env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      return false;
    }
    return new GoogleSheetsAdapter({
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      gid: env.GOOGLE_SHEETS_REPORT_GID,
      timeoutMs: env.GOOGLE_SHEETS_TIMEOUT_MS,
    }).isAvailable();
  }

  async describeUnavailableReason(): Promise<string | null> {
    if (!env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      return 'Не задан GOOGLE_SHEETS_SPREADSHEET_ID';
    }
    return 'Источник данных недоступен';
  }
}

/** Reports the state of every known integration. */
export async function describeIntegrations(
  adapters: Map<ExternalSystemKind, ExternalSystemAdapter>
): Promise<IntegrationDescriptor[]> {
  const descriptors: IntegrationDescriptor[] = [];

  for (const known of KNOWN_SYSTEMS) {
    const adapter = adapters.get(known.kind);
    const lastCheckedAt = new Date().toISOString();

    if (!adapter) {
      descriptors.push({
        kind: known.kind,
        displayName: known.displayName,
        purpose: known.purpose,
        state: 'not-configured',
        requiresCredentials: known.requiresCredentials,
        missingRequirements: known.missingRequirements,
        lastCheckedAt: null,
      });
      continue;
    }

    const available = await adapter.isAvailable();
    const reason = available ? null : await adapter.describeUnavailableReason();

    let state: IntegrationState;
    if (available) {
      state = 'available';
    } else if (known.missingRequirements.length > 0) {
      state = 'not-configured';
    } else {
      state = 'unavailable';
    }

    descriptors.push({
      kind: known.kind,
      displayName: known.displayName,
      purpose: known.purpose,
      state,
      requiresCredentials: known.requiresCredentials,
      missingRequirements: reason ? [reason] : known.missingRequirements,
      lastCheckedAt,
    });
  }

  return descriptors;
}
