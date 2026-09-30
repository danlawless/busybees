import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminPanelBridge } from '@/components/admin/AdminPanelBridge';
import { AccessCodesCard } from './AccessCodesCard';

export default function SettingsPage() {
  return (
    <>
      <AdminPageHeader title="Settings" />
      <AccessCodesCard />
      <AdminPanelBridge view="settings" userRole="admin" />
    </>
  );
}
