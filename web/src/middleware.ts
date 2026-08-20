import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// /claim/* and /track/[token] are the customer-facing flows and stay public
// — only staff/admin routes require a signed-in @gadgetvilla.co.th session.
export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/sign-in', req.nextUrl);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*'],
};
