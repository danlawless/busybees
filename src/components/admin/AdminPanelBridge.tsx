'use client';

import type { ComponentProps } from 'react';
import { AdminPanel } from '@/components/pos/AdminPanel';
import { usePosCatalog } from '@/hooks/usePosCatalog';
import type { AdminView } from '@/lib/admin/nav';

type BridgeCustomer = ComponentProps<typeof AdminPanel>['customers'][number];

/** Renders one AdminPanel view inside the shell, with AdminPanel's own view buttons hidden. */
export function AdminPanelBridge({ view, userRole }: { view: AdminView; userRole: 'staff' | 'admin' }) {
  const c = usePosCatalog<BridgeCustomer>({ loadCustomers: true });
  return (
    <AdminPanel
      key={view}
      initialView={view}
      hideViewNav
      userRole={userRole}
      customers={c.customers} onUpdateCustomers={c.setCustomers}
      promos={c.promos} onUpdatePromos={c.setPromos}
      passes={c.passes} onUpdatePasses={c.setPasses}
      parties={c.parties} onUpdateParties={c.setParties}
      products={c.products} onUpdateProducts={c.setProducts}
      volumeDiscounts={c.volumeDiscounts} onUpdateVolumeDiscounts={c.setVolumeDiscounts}
    />
  );
}
