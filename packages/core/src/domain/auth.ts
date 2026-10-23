/**
 * Authentication domain model.
 *
 * The seller signs in through the **ABC T2 portal** with their corporate
 * account; the application never sees or stores their password.
 *
 * Flow (OAuth 2.0 Authorization Code, server-side):
 *
 *   browser ──► /api/auth/abc-t2/login
 *                    │
 *                    ▼
 *             ABC T2 portal ──► user consents ──► ?code=…&state=…
 *                    │
 *                    ▼
 *        /api/auth/abc-t2/callback ──► token exchange ──► profile
 *                    │
 *                    ▼
 *         session cookie + server-side session
 *
 * The session survives a browser restart, so the seller signs in once.
 */

/**
 * The identity providers the application can delegate to.
 *
 * - `abc-t2` — the corporate SSO (T2 ID at auth.t2.ru), OAuth 2.0 + PKCE.
 *   The strongest option: the corporate identity provider authenticates
 *   the person, the application never sees a password.
 * - `pin` — the fallback that works without any corporate access: the
 *   person identifies themselves with their name and a personal PIN
 *   issued by the administrator, and the name is checked against the
 *   employee directory.
 */
export type AuthProviderId = 'abc-t2' | 'pin';

/** The role the signed-in user holds. */
export type UserRole = 'seller' | 'curator' | 'manager' | 'admin';

/** True when the user holds at least one of the roles. */
export function hasRole(user: AuthUser | null | undefined, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return user.roles.some((role) => roles.includes(role));
}

/** True when the user may act as a curator: curators and admins can. */
export function canCurate(user: AuthUser | null | undefined): boolean {
  return hasRole(user, 'curator', 'admin');
}

/** True when the user may act as an administrator. */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  return hasRole(user, 'admin');
}

/** The profile of a signed-in user, as resolved from the provider. */
export interface AuthUser {
  /** Stable identifier issued by the provider. */
  id: string;
  provider: AuthProviderId;
  /** Display name shown in the interface. */
  displayName: string;
  /** Corporate login, when the provider exposes it. */
  login?: string;
  email?: string;
  position?: string;
  /** Trading point or region the user belongs to. */
  region?: string;
  roles: UserRole[];
  /** URL of the profile picture, when the provider exposes one. */
  avatarUrl?: string;
  /** Raw provider payload, kept for fields this app does not model yet. */
  raw?: Record<string, unknown>;
}

/** A server-side session. */
export interface AuthSession {
  /** Random identifier; only its hash is stored on the client. */
  id: string;
  userId: string;
  provider: AuthProviderId;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of expiry. */
  expiresAt: string;
  /** Provider access token, kept server-side only. */
  accessToken?: string;
  /** Provider refresh token — lets the session be renewed silently. */
  refreshToken?: string;
  /** ISO timestamp when the access token stops being usable. */
  accessTokenExpiresAt?: string;
  /** The profile captured at sign-in. */
  user: AuthUser;
}

/** The provider's token response. */
export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  /** Lifetime of the access token, in seconds. */
  expiresIn?: number;
  tokenType?: string;
  idToken?: string;
  scope?: string;
}

/** Configuration of an OAuth provider. */
export interface AuthProviderConfig {
  providerId: AuthProviderId;
  /** Where the user is sent to sign in. */
  authorizationUrl: string;
  /** Where the authorization code is exchanged for a token. */
  tokenUrl: string;
  /** Where the profile of the signed-in user is read. */
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  /** Where the provider sends the user back. */
  redirectUri: string;
  /** Requested scopes, space separated. */
  scopes: string[];
  /** Token endpoint authentication method. */
  tokenAuthMethod?: 'client_secret_post' | 'client_secret_basic';
}

/** The outcome of a sign-in attempt. */
export interface SignInResult {
  user: AuthUser;
  tokens: OAuthTokenResponse;
}
