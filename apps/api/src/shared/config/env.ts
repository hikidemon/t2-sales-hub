import { z } from 'zod';

/**
 * Server environment schema.
 *
 * Secrets (session keys, Google API credentials, the ABC T2 client
 * secret) must be added here and read from process.env only — never
 * hardcode them in the repo.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  /**
   * Which data source the server serves.
   *   mock           — synthetic dataset, no external access
   *   google-sheets  — live Google Sheets
   */
  DATA_SOURCE: z.enum(['mock', 'google-sheets']).default('mock'),

  /**
   * Spreadsheet id of the "Общие" document (the report sheet with
   * plan / fact / % / forecast per indicator).
   * Not a secret — the sheet must be readable with a link.
   */
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1).optional(),

  /** gid of the report sheet inside the document. */
  GOOGLE_SHEETS_REPORT_GID: z.coerce.number().int().nonnegative().default(515868842),

  /** Timeout of a single read request, milliseconds. */
  GOOGLE_SHEETS_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),

  /** Interval between automatic synchronisations, milliseconds. */
  SYNC_INTERVAL_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(300_000),

  /** Maximum number of retries for a failed synchronisation. */
  SYNC_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),

  /** A snapshot older than this is reported as stale, milliseconds. */
  SYNC_STALE_AFTER_MS: z.coerce.number().int().min(60_000).default(900_000),

  /**
   * Shared secret required by the manual refresh endpoint.
   * When empty the endpoint is disabled entirely.
   */
  SYNC_REFRESH_TOKEN: z.string().min(8).optional(),

  /**
   * Shared secret required by the curator actions of the test module
   * (create, publish, archive, statistics).
   * When empty the curator actions are disabled entirely.
   */
  CURATOR_TOKEN: z.string().min(8).optional(),

  // --- Authentication (ABC T2) -------------------------------------------
  /**
   * Requires the seller to sign in through the ABC T2 portal.
   * When false the application works in demo mode without a login.
   */
  AUTH_REQUIRED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  /** Where the ABC T2 portal sends the user to sign in. */
  ABC_T2_AUTHORIZATION_URL: z.string().url().optional(),

  /** Where the authorization code is exchanged for a token. */
  ABC_T2_TOKEN_URL: z.string().url().optional(),

  /** Where the profile of the signed-in user is read. */
  ABC_T2_USER_INFO_URL: z.string().url().optional(),

  /** The OAuth client id issued for this application. */
  ABC_T2_CLIENT_ID: z.string().min(1).optional(),

  /** The OAuth client secret. Never sent to the browser. */
  ABC_T2_CLIENT_SECRET: z.string().min(1).optional(),

  /** Where the portal sends the user back after signing in. */
  ABC_T2_REDIRECT_URI: z.string().url().optional(),

  /** Requested scopes, space or comma separated. */
  ABC_T2_SCOPES: z.string().default(''),

  /** How the client authenticates at the token endpoint. */
  ABC_T2_TOKEN_AUTH_METHOD: z
    .enum(['client_secret_post', 'client_secret_basic'])
    .default('client_secret_post'),

  /** Name of the session cookie. */
  AUTH_COOKIE_NAME: z.string().default('t2_session'),

  /**
   * Secret used to sign the session cookie.
   * Required when `AUTH_REQUIRED` is on: the cookie carries a signed
   * session id, so it cannot be forged.
   */
  AUTH_COOKIE_SECRET: z.string().min(16).optional(),

  /**
   * Lifetime of a session, in hours. The default is 30 days, so the
   * seller signs in once and stays signed in.
   */
  AUTH_SESSION_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 365)
    .default(24 * 30),

  /**
   * Marks the session cookie as secure. Enabled by default outside
   * development, where the site runs on plain HTTP.
   */
  AUTH_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),

  /**
   * Where the user is sent after signing in. Defaults to the web app.
   */
  AUTH_SUCCESS_REDIRECT_URL: z.string().url().default('http://localhost:5173/'),

  /**
   * Where the user is sent when the sign-in was refused.
   */
  AUTH_FAILURE_REDIRECT_URL: z.string().url().default('http://localhost:5173/?auth=failed'),

  /**
   * Where the sessions are kept. `file` keeps them across a restart of
   * the API, so the seller does not have to sign in again; `memory` is
   * for tests and for a throwaway environment.
   */
  AUTH_SESSION_STORE: z.enum(['file', 'memory']).default('file'),

  /**
   * The file the sessions are written to. It is encrypted — the
   * provider tokens must not sit on disk in plain text.
   */
  AUTH_SESSION_FILE: z.string().default('.data/sessions.json'),

  /**
   * The corporate logins that hold the administrator role, separated by
   * commas. The role of the portal is never taken away — this only adds.
   */
  AUTH_ADMIN_LOGINS: z.string().default(''),

  /**
   * The corporate logins that hold the curator role, separated by
   * commas. Curators create and publish the tests.
   */
  AUTH_CURATOR_LOGINS: z.string().default(''),

  /**
   * The ways a person may sign in, separated by commas.
   *
   * - `abc-t2` — the corporate SSO (T2 ID at auth.t2.ru). The strongest
   *   option: the corporate identity provider authenticates the person.
   * - `pin` — the fallback: name + personal PIN against the employee
   *   directory. It works without any corporate access.
   *
   * With both enabled the interface offers both.
   */
  AUTH_METHODS: z.string().default('abc-t2'),

  /**
   * The employee directory used by the PIN sign-in. The file holds the
   * names, the offices, the roles and the PIN hashes. It never leaves
   * the server.
   */
  AUTH_DIRECTORY_FILE: z.string().default('.data/employees.json'),

  /**
   * The access log: who entered, when and from where.
   */
  AUTH_ACCESS_LOG: z.string().default('.data/access-log.jsonl'),

  /**
   * How many failed sign-in attempts are allowed before the person and
   * the address are blocked.
   */
  AUTH_PIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),

  /**
   * How long the block lasts, in minutes.
   */
  AUTH_PIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
