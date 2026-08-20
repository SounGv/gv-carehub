import Image from 'next/image';
import { SignInButton } from './sign-in-button';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-1.5">
          <Image src="/logo-gv-mark.png" alt="Gadget Villa" width={1100} height={539} priority className="h-12 w-auto" />
          <div className="text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-slate-400">Gadget Villa</div>
          <div className="h-px w-10 bg-slate-200" />
          <div className="text-[20px] font-extrabold leading-tight text-brand-charcoal">CareHub</div>
        </div>
        <p className="text-sm text-slate-500">สำหรับพนักงานเท่านั้น — กรอกอีเมลบริษัทเพื่อรับลิงก์เข้าสู่ระบบ</p>
        <SignInButton />
      </div>
    </div>
  );
}
