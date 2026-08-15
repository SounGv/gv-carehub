import { RoleGuard } from '@/components/layout/role-guard';
import { AppShell } from '@/components/layout/app-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={['admin', 'manager']}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
