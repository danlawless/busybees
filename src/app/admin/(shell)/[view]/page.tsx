import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminPanelBridge } from '@/components/admin/AdminPanelBridge';
import { getAdminLevel } from '@/lib/admin/guard';
import { BRIDGED_VIEWS, NAV } from '@/lib/admin/nav';

export default async function BridgedView({ params }: { params: Promise<{ view: string }> }) {
  const { view: slug } = await params;
  const view = Object.hasOwn(BRIDGED_VIEWS, slug) ? BRIDGED_VIEWS[slug] : undefined;
  if (!view) notFound();
  const title = NAV.flatMap(g => g.items).find(i => i.href === `/admin/${slug}`)?.label ?? slug;
  const level = (await getAdminLevel()) ?? 'staff';
  return (
    <>
      <AdminPageHeader title={title} />
      <AdminPanelBridge view={view} userRole={level} />
    </>
  );
}
