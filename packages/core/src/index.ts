/**
 * @t2-sales-hub/core public API.
 *
 * This package contains framework-independent business logic:
 * domain types, calculation rules, data source adapter contracts.
 * It must never import React or UI code.
 */

export type {
  DataSourceAdapter,
  DashboardDataSourceAdapter,
  DataSourceKind,
} from './adapters/DataSourceAdapter.js';
export { MockDashboardAdapter } from './adapters/MockDashboardAdapter.js';
export {
  GoogleSheetsAdapter,
  GoogleSheetsError,
  buildGvizUrl,
  parseCsv,
} from './adapters/GoogleSheetsAdapter.js';
export type {
  GoogleSheetsAdapterOptions,
  GoogleSheetsConfig,
  RawRow,
} from './adapters/GoogleSheetsAdapter.js';

export type { DataSnapshot, SyncAttemptResult, SyncState, SyncStatus } from './domain/sync.js';

export { DataSyncService } from './sync/DataSyncService.js';
export type { SyncServiceOptions } from './sync/DataSyncService.js';

export {
  extractIndicators,
  extractRegionName,
  extractSnapshotDate,
  normalizeDashboardRows,
  parseRussianNumber,
} from './data/normalizeDashboardRows.js';

export type {
  AppNotification,
  NotificationCategory,
  NotificationChannel,
  NotificationFilter,
  NotificationSeverity,
  NotificationSummary,
} from './domain/notification.js';

export type {
  QuizTest,
  ScoringPolicy,
  TestAssignment,
  TestAttempt,
  TestOption,
  TestQuestion,
  TestStatistics,
  TestStatus,
  TestWithState,
} from './domain/quiz.js';

export type {
  ExternalRecord,
  ExternalSystemAdapter,
  ExternalSystemCapabilities,
  ExternalSystemKind,
  IntegrationDescriptor,
  IntegrationState,
} from './domain/integration.js';

export {
  calculateScorePercent,
  calculateTestStatistics,
  countAnswered,
  evaluatePass,
  gradeAttempt,
  isAttemptComplete,
  scoreAnswers,
  totalPossiblePoints,
  validateTest,
  withSellerState,
} from './calculation/quizScoring.js';

export {
  demoAssignments,
  demoAttempts,
  demoNotifications,
  demoTests,
} from './data/demoEngagement.js';

export type {
  BonusItem,
  BonusStatus,
  DashboardData,
  Forecast,
  IncomeSummary,
  Kpi,
  KpiUnit,
  MetricDynamics,
  MetricPoint,
  OperationType,
  Period,
  PeriodId,
  PlanProgress,
  RankingEntry,
  RankingPosition,
  SalesOperation,
  Seller,
} from './domain/dashboard.js';

export {
  calculateBeatsPercent,
  calculateForecast,
  calculateForecastConfidence,
  calculatePlanPercent,
  calculatePlanRemaining,
} from './calculation/demoRules.js';
export type { ForecastInput, ForecastResult } from './calculation/demoRules.js';

export {
  formatCurrency,
  formatCurrencyCompact,
  formatDelta,
  formatNumber,
  formatPercent,
} from './format/format.js';

export { buildDemoDashboard, demoPeriods } from './data/demoDashboard.js';

export type {
  AuthProviderConfig,
  AuthProviderId,
  AuthSession,
  AuthUser,
  OAuthTokenResponse,
  SignInResult,
  UserRole,
} from './domain/auth.js';
export { canCurate, hasRole, isAdmin } from './domain/auth.js';

export {
  AbcT2Client,
  AuthError,
  createPkcePair,
  normalizeAbcT2User,
  normalizeRoles,
  randomToken,
} from './auth/AbcT2Client.js';
export type { AbcT2ClientOptions, PkcePair } from './auth/AbcT2Client.js';

export { AuthService, buildAbcT2Config } from './auth/AuthService.js';
export type { AuthServiceOptions, StartSignInResult } from './auth/AuthService.js';

export { DEFAULT_SESSION_TTL_MS, InMemorySessionStore } from './auth/SessionStore.js';
export type { SessionStore } from './auth/SessionStore.js';

export {
  ACCESSORIES_SHARE,
  CREDIT_BONUS,
  DIGITAL_SERVICES,
  EDUCATOR_BONUS,
  EQUIPMENT_BASE_SHARE,
  FIXED_SERVICES,
  GI_TARIFFS,
  GI_TARIFFS_NOT_PAID,
  HOURLY_RATE,
  INTERNAL_VMR_BONUS,
  INSURANCE_TARIFFS,
  MNP_BONUS,
  MONTHLY_HOURS_NORM,
  OVERTIME_HOURLY_RATE,
  PENALTY_COEFFICIENTS,
  VMR_BONUS,
  YANDEX_SPLIT_SHARE,
  calculateBaseSalary,
  calculateGiBonus,
  calculateMnpBonus,
  calculateRtkBonusShare,
  calculateSalary,
  calculateSubscriptionBonusShare,
  selectGiBand,
} from './calculation/motivationRules.js';
export type {
  GiBand,
  GiTariffInput,
  GiTariffRow,
  SalaryCalculation,
  SalaryCalculationInput,
} from './calculation/motivationRules.js';
