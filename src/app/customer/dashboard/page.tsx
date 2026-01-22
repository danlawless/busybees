/**
 * Customer Dashboard Page
 * Main dashboard for customer portal - mirrors POS "My Account" interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { WebMyAccount } from '@/components/customer/WebMyAccount';

export default function CustomerDashboardPage() {
  return (
    <AuthGuard requireRole={['customer', 'admin']}>
      <WebMyAccount />
    </AuthGuard>
  );
}
