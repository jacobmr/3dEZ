/**
 * Module-scoped auth token storage.
 *
 * Tokens are held in memory (not localStorage) to avoid XSS exposure.
 * The refresh token lives in an httpOnly cookie managed by the backend.
 */

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function clearAccessToken(): void {
  _accessToken = null;
}
