import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyStaffLoginToken } from '@/lib/staff-login-token';
import { isStaffAllowedEmail } from '@/lib/staff-allowlist';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      // Not a password login — `token` is a short-lived signed JWT minted by
      // /api/staff-login/request and emailed to the address it names. This
      // provider only re-verifies that token (see staff-login-token.ts).
      credentials: { email: {}, token: {} },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : null;
        const token = typeof credentials?.token === 'string' ? credentials.token : null;
        if (!email || !token) return null;

        const tokenEmail = await verifyStaffLoginToken(token);
        if (tokenEmail !== email) return null;
        if (!isStaffAllowedEmail(email)) return null;

        return { id: email, email, name: email.split('@')[0] };
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
});
