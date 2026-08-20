export function isStaffAllowedEmail(email: string): boolean {
  const allowed = (process.env.STAFF_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
