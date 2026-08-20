/** Staff names available for case-owner assignment (see owner-select.tsx and
 * the "เจ้าของเคส" picker on the claim-detail page) — a business-domain list
 * of who a case can be assigned to for follow-up, unrelated to login.
 *
 * Real staff identity/login now comes from Google Workspace SSO (see
 * web/src/auth.ts + auth-provider.tsx) — this file no longer holds any
 * session/identity state. */
export const STAFF_NAMES = ['ME_lalana', 'Dusida', 'Tik', 'Natza', 'Jo', 'Deer', 'Au', 'Aun'];
