import Image from 'next/image';
import Link from 'next/link';
import { ClipboardList, LogIn, Search } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image src="/gv-logo-icon.png" alt="Gadget Villa" width={64} height={64} className="rounded-2xl" />
        <h1 className="text-2xl font-bold text-brand-charcoal">GV CareHub</h1>
        <p className="max-w-md text-sm text-slate-500">ระบบบริการหลังการขายและเคลมสินค้า Gadget Villa</p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        <Link
          href="/claim/new"
          className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-6 shadow-sm transition hover:border-brand-lime hover:shadow-md"
        >
          <ClipboardList className="h-8 w-8 text-brand-charcoal" />
          <div>
            <div className="font-semibold">แจ้งเคลมสินค้า</div>
            <div className="mt-1 text-xs text-slate-500">สำหรับลูกค้าที่ต้องการส่งเคลมสินค้าใหม่</div>
          </div>
        </Link>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
          <Search className="h-8 w-8 text-brand-charcoal" />
          <div>
            <div className="font-semibold">ติดตามสถานะเคลม</div>
            <div className="mt-1 text-xs text-slate-500">ใช้ลิงก์ที่ได้รับหลังแจ้งเคลมสำเร็จ เพื่อดูสถานะล่าสุด</div>
          </div>
        </div>

        <Link
          href="/login"
          className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-6 shadow-sm transition hover:border-brand-lime hover:shadow-md"
        >
          <LogIn className="h-8 w-8 text-brand-charcoal" />
          <div>
            <div className="font-semibold">พนักงาน / ผู้บริหาร</div>
            <div className="mt-1 text-xs text-slate-500">เข้าสู่ระบบเพื่อรับพัสดุ ดำเนินการ และดูรายงาน</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
