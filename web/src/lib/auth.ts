/**
 * TODO(auth): Placeholder auth adapter — NOT a production authentication system.
 *
 * There is no real login/identity provider wired up yet. This module only
 * persists a role + display name to localStorage on the client so the rest
 * of the app (RoleGuard, staff actions, "actor" fields sent to the API) has
 * something consistent to read. Anyone can currently open the browser
 * console and set any role.
 *
 * Before going to production, replace this module with a real identity
 * provider (e.g. NextAuth.js with Google Workspace SSO, Firebase Auth, or
 * a company SSO), move session validation to the server (middleware /
 * server components), and make sure the Apps Script API also verifies the
 * caller's identity (today it trusts whatever `actor` string the client
 * sends — see apps-script/Code.gs). Do not store any secret/API key here;
 * this file must stay safe to ship to the browser.
 */
import type { UserRole } from './types';

export interface AuthSession {
  userId: string;
  name: string;
  role: UserRole;
}

const STORAGE_KEY = 'gv_carehub_session_v1';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed || !parsed.role || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function roleCanAccess(role: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
