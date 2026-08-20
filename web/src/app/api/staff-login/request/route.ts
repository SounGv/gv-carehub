import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { signStaffLoginToken } from '@/lib/staff-login-token';
import { isStaffAllowedEmail } from '@/lib/staff-allowlist';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always returns { ok: true } for any well-formed email, allowlisted or not —
// this endpoint is unauthenticated by design, so responding differently for
// a non-staff address would let a caller probe the allowlist.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  if (isStaffAllowedEmail(email)) {
    try {
      await sendLoginLinkEmail(email);
    } catch (err) {
      console.error('staff-login: failed to send email', err);
    }
  }

  return NextResponse.json({ ok: true });
}

async function sendLoginLinkEmail(email: string) {
  const token = await signStaffLoginToken(email);
  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
  const link = `${baseUrl}/sign-in/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const transport = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST,
    port: Number(process.env.ZOHO_SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.ZOHO_SMTP_USER,
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: process.env.ZOHO_SMTP_FROM ?? process.env.ZOHO_SMTP_USER,
    to: email,
    subject: 'ลิงก์เข้าสู่ระบบ GV CareHub ของคุณ',
    text:
      `คลิกลิงก์นี้เพื่อเข้าสู่ระบบ GV CareHub:\n${link}\n\n` +
      'ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุใน 15 นาที หากคุณไม่ได้ขอเข้าสู่ระบบ สามารถละเว้นอีเมลนี้ได้',
  });
}
