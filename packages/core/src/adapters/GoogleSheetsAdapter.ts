/**
 * Google Sheets adapter.
 *
 * Reads a sheet through the public `gviz` endpoint (or the CSV export
 * endpoint) and hands the raw rows to the normaliser. Framework-free:
 * it uses the platform `fetch` and no Google SDK, so it can run in Node
 * and in the browser alike.
 *
 * Access model: the sheets are expected to be readable with a link
 * ("anyone with the link"). A service account with the Sheets API is
 * the recommended production path — see `docs/data/GOOGLE_SHEETS_SETUP.md`.
 * Nothing here sends credentials: the adapter only ever receives a
 * pre-built URL.
 */

import type { DataSourceKind, DashboardDataSourceAdapter } from './DataSourceAdapter.js';
import type { DashboardData, Period, PeriodId } from '../domain/dashboard.js';

/** A single raw row: cell texts keyed by column index. */
export type RawRow = string[];

export interface GoogleSheetsConfig {
  /** Spreadsheet id (the part between `/d/` and `/edit`). */
  spreadsheetId: string;
  /** Sheet gid. `0` means the first sheet. */
  gid: number;
  /** Region used when parsing numbers and dates. */
  locale?: string;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
}

export interface GoogleSheetsAdapterOptions extends GoogleSheetsConfig {
  /** Injected for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export class GoogleSheetsError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'GoogleSheetsError';
  }
}

/** Builds the gviz URL for a sheet. */
export function buildGvizUrl(config: GoogleSheetsConfig): string {
  const gid = Number.isFinite(config.gid) ? config.gid : 0;
  return (
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId)}` +
    `/gviz/tq?tqx=out:csv&gid=${gid}`
  );
}

/**
 * Parses a CSV document produced by the gviz endpoint.
 *
 * The endpoint always quotes every field and escapes inner quotes by
 * doubling them, so a small state machine is enough — no dependency.
 */
export function parseCsv(csv: string): RawRow[] {
  const rows: RawRow[] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (inQuotes) {
      if (char === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      // Ignore — handled by the '\n' branch.
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Reads raw rows from a Google Sheet.
 *
 * Only the raw grid is produced here — interpretation is the
 * normaliser's job, so the transport stays free of business rules.
 */
export class GoogleSheetsAdapter implements DashboardDataSourceAdapter {
  readonly kind: DataSourceKind = 'google-sheets';

  private readonly config: GoogleSheetsAdapterOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GoogleSheetsAdapterOptions) {
    this.config = options;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.readRows();
      return true;
    } catch {
      return false;
    }
  }

  /** Reads the raw grid of the configured sheet. */
  async readRows(): Promise<RawRow[]> {
    if (typeof this.fetchImpl !== 'function') {
      throw new GoogleSheetsError('fetch is not available in this runtime');
    }

    const url = buildGvizUrl(this.config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 15_000);

    try {
      const response = await this.fetchImpl(url, {
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new GoogleSheetsError(
          `Google Sheets responded with ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const body = await response.text();
      if (!body.trim()) {
        throw new GoogleSheetsError('Google Sheets returned an empty document');
      }

      return parseCsv(body);
    } catch (error) {
      if (error instanceof GoogleSheetsError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new GoogleSheetsError(`Failed to read Google Sheets: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * The dashboard contract method.
   *
   * The sheet layout is normalised by `DataNormalizer`; this adapter
   * only provides the transport. The normaliser is injected so the
   * adapter stays free of business knowledge.
   */
  async fetchDashboard(periodId?: PeriodId): Promise<DashboardData> {
    const rows = await this.readRows();
    const { normalizeDashboardRows } = await import('../data/normalizeDashboardRows.js');
    return normalizeDashboardRows(rows, periodId);
  }

  /**
   * The periods this document contains.
   *
   * The report sheet carries a single month — the one its header names.
   * The adapter reports exactly that, so the client never offers a
   * period the source cannot serve.
   */
  async listPeriods(): Promise<Period[]> {
    const rows = await this.readRows();
    const { normalizeDashboardRows } = await import('../data/normalizeDashboardRows.js');
    const data = normalizeDashboardRows(rows);
    return [data.period];
  }
}
