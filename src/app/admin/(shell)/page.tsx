import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminPanelBridge } from '@/components/admin/AdminPanelBridge';
import { getAdminLevel } from '@/lib/admin/guard';

export default async function Today() {
  const level = (await getAdminLevel()) ?? 'staff';
  return (
    <>
      <AdminPageHeader title="Today" />
      <AdminPanelBridge view="dashboard" userRole={level} />
    </>
  );
}
