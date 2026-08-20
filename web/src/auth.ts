import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const STAFF_EMAIL_DOMAIN = '@gadgetvilla.co.th';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { hd: 'gadgetvilla.co.th' } },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    // The `hd` param above only affects the Google account picker — a caller
    // could still complete OAuth with a non-Workspace account, so this is
    // the real gate: reject sign-in outright unless the verified email is
    // actually on the company's Workspace domain.
    signIn({ profile }) {
      return Boolean(profile?.email && profile.email.endsWith(STAFF_EMAIL_DOMAIN));
    },
  },
});
