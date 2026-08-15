'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileBarChart, PackageSearch, Truck, Menu, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from './auth-provider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'ภาพรวม',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/reports', label: 'รายงาน SKU', icon: FileBarChart },
    ],
  },
  {
    title: 'คลังสินค้า',
    items: [
      { href: '/staff/receive', label: 'รับพัสดุ / สแกน', icon: PackageSearch },
      { href: '/staff/ship', label: 'ยืนยันจัดส่งคืน', icon: Truck },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, rename } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3.5 top-3.5 z-[60] flex h-10 w-10 items-center justify-center rounded-lg bg-brand-charcoal text-white shadow-md md:hidden"
        aria-label="เปิดเมนู"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/40 md:hidden" />}

      <aside
        className={cn(
          'z-50 flex w-[250px] flex-none flex-col gap-6 overflow-y-auto bg-brand-charcoal p-5 text-white transition-transform md:static md:translate-x-0',
          'fixed inset-y-0 left-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/gv-logo-icon.png" alt="Gadget Villa" width={36} height={36} className="rounded-lg object-cover" />
            <div>
              <div className="text-[19px] font-bold leading-tight">Gadget Villa</div>
              <div className="text-[11px] leading-tight text-[#c7cf6e]">GV CareHub</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/70 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-1.5 text-[11px] font-bold uppercase tracking-wide text-[#5c85b8]">{group.title}</div>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active ? 'bg-brand-lime text-brand-charcoal' : 'text-white/80 hover:bg-white/10',
                      )}
                    >
                      <Icon className="h-4 w-4 flex-none" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-white/10 pt-4">
          {editingName ? (
            <input
              autoFocus
              defaultValue={session.name}
              onBlur={(e) => {
                rename(e.target.value);
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-brand-lime"
            >
              <Pencil className="h-3 w-3 flex-none text-white/50" /> {session.name}
            </button>
          )}
          <div className="text-xs text-white/40">ชื่อนี้จะบันทึกในประวัติการดำเนินการ</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-16 sm:px-6 md:pt-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
