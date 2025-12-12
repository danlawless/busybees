/**
 * Customer Dashboard Page
 * Main dashboard for customer portal - mirrors POS "My Account" interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { WebMyAccount } from '@/components/customer/WebMyAccount';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <AuthGuard requireRole="customer">
      <Suspense fallback={<LoadingSpinner />}>
        <WebMyAccount />
      </Suspense>
    </AuthGuard>
  );
}
