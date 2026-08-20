import { SignJWT, jwtVerify } from 'jose';

const TOKEN_TTL_SECONDS = 15 * 60;

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function signStaffLoginToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the email the token was minted for, or null if it's missing,
 * expired, or signed with a different secret. Doesn't check the allowlist —
 * that's a separate concern, done by the caller. */
export async function verifyStaffLoginToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}
