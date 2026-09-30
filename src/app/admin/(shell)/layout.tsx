import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar';
import { UpgradeGate } from '@/components/admin/shell/UpgradeGate';
import { getAdminLevel } from '@/lib/admin/guard';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const level = await getAdminLevel();
  if (!level) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-gray-50 font-[Arial,sans-serif]">
      <AdminSidebar level={level} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8"><UpgradeGate level={level}>{children}</UpgradeGate></div>
      </main>
    </div>
  );
}
