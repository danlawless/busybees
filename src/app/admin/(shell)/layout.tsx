import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar';
import { UpgradePrompt } from '@/components/admin/shell/UpgradePrompt';
import { getAdminLevel } from '@/lib/admin/guard';
import { levelForPath } from '@/lib/admin/nav';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const level = await getAdminLevel();
  if (!level) redirect('/admin/login');
  const pathname = (await headers()).get('x-pathname') ?? '/admin';
  const needsUpgrade = levelForPath(pathname) === 'admin' && level !== 'admin';

  return (
    <div className="min-h-screen bg-gray-50 font-[Arial,sans-serif]">
      <AdminSidebar level={level} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{needsUpgrade ? <UpgradePrompt /> : children}</div>
      </main>
    </div>
  );
}
