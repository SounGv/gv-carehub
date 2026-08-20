'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutDashboard, FileText, PackageSearch, Truck, Boxes, FileBarChart, Menu, X, Check, Link2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from './auth-provider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Grouped to mirror the target reference layout's workflow stages, reusing
 * the pages/tabs that already exist rather than adding new routes. Several
 * items share the same /admin/reports path with a different ?tab=, so
 * "active" has to compare the full href (path + tab), not just the path —
 * see isNavItemActive below. */
const CLAIMS_GROUP: { title: string; items: NavItem[] } = {
  title: 'งานเคลม',
  items: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports?tab=claims', label: 'เคสเคลม', icon: FileText },
    { href: '/staff/receive', label: 'รับเข้าคลัง', icon: PackageSearch },
    { href: '/staff/ship', label: 'จัดส่งคืน', icon: Truck },
  ],
};

const DATA_GROUP: { title: string; items: NavItem[] } = {
  title: 'ข้อมูล & รายงาน',
  items: [
    { href: '/admin/reports?tab=sku', label: 'สินค้า & SKU', icon: Boxes },
    { href: '/admin/reports?tab=service_log', label: 'รายงาน', icon: FileBarChart },
  ],
};

function CopyClaimLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/claim/new`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('คัดลอกลิงก์แจ้งเคลมแล้ว ส่งให้ลูกค้าทางแชทได้เลย');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('คัดลอกลิงก์ไม่สำเร็จ');
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
    >
      {copied ? <Check className="h-4 w-4 flex-none text-brand-lime" /> : <Link2 className="h-4 w-4 flex-none" />}
      แจ้งเคลม / ส่งลิงก์
    </button>
  );
}

/** True only if the item's own path AND (when it specifies one) its own ?tab= both match
 * the current URL — so of several links sharing /admin/reports, only the one whose tab is
 * actually open lights up. */
function isNavItemActive(href: string, pathname: string | null, currentTab: string | null): boolean {
  const [hrefPath, hrefQuery] = href.split('?');
  if (pathname !== hrefPath) return false;
  if (!hrefQuery) return true;
  const wantTab = new URLSearchParams(hrefQuery).get('tab');
  return wantTab ? currentTab === wantTab : true;
}

function NavGroup({
  group,
  pathname,
  currentTab,
  onNavigate,
}: {
  group: { title: string; items: NavItem[] };
  pathname: string | null;
  currentTab: string | null;
  onNavigate: () => void;
}) {
  return (
    <div>
      <div className="mb-2 px-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-steel">{group.title}</div>
      <div className="flex flex-col gap-1">
        {group.items.map((item) => {
          const active = isNavItemActive(item.href, pathname, currentTab);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
  );
}

/** Reads ?tab= — needs its own Suspense boundary since useSearchParams requires one, and
 * AppShell itself is rendered from layout.tsx (outside any page-level Suspense). */
function MainNav({ pathname, onNavigate }: { pathname: string | null; onNavigate: () => void }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  return (
    <>
      <NavGroup group={CLAIMS_GROUP} pathname={pathname} currentTab={currentTab} onNavigate={onNavigate} />
      <div>
        <div className="mb-2 px-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-steel">ลูกค้า</div>
        <div className="flex flex-col gap-1">
          <CopyClaimLinkButton />
        </div>
      </div>
      <NavGroup group={DATA_GROUP} pathname={pathname} currentTab={currentTab} onNavigate={onNavigate} />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);

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
        <div className="relative">
          <button onClick={() => setOpen(false)} className="absolute right-0 top-0 text-white/70 md:hidden">
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-1.5 pb-1 pt-1 text-center">
            <Image src="/logo-gv-mark.png" alt="Gadget Villa" width={1100} height={539} className="h-11 w-auto" />
            <div className="text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-white/60">Gadget Villa</div>
            <div className="h-px w-10 bg-white/20" />
            <div className="text-[19px] font-extrabold leading-tight text-white">CareHub</div>
            <div className="text-[10.5px] leading-tight text-white/50">After-sales Claims Management</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6">
          <Suspense fallback={null}>
            <MainNav pathname={pathname} onNavigate={() => setOpen(false)} />
          </Suspense>
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <div className="text-sm font-medium text-white">เข้าสู่ระบบในชื่อ {session.name}</div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-16 sm:px-6 md:pt-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
