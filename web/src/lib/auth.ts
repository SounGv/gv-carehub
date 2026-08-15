/**
 * TODO(auth): Placeholder identity — NOT a production authentication system.
 *
 * The internal app (staff + admin) has no login gate: anyone with the link
 * gets straight in, and this module only persists a display name to
 * localStorage so "actor" fields sent to the API (see apps-script/Code.gs)
 * have something readable to log against. Anyone can edit localStorage and
 * claim any name — there is no verification.
 *
 * Before going to production, add a real identity provider (e.g. NextAuth.js
 * with Google Workspace SSO) and have the Apps Script API verify the
 * caller's identity server-side instead of trusting the client-supplied
 * `actor` string. Do not store any secret/API key here; this file must stay
 * safe to ship to the browser.
 */

export interface AuthSession {
  name: string;
}

const STORAGE_KEY = 'gv_carehub_session_v1';
export const DEFAULT_ACTOR_NAME = 'พนักงาน';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
