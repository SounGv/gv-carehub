import { RoleGuard } from '@/components/layout/role-guard';
import { AppShell } from '@/components/layout/app-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={['staff', 'manager', 'admin']}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
