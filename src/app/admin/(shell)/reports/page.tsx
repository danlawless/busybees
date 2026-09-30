/**
 * Admin Reports Dashboard Page
 * Owner-level page: the shell asks staff for the admin code before showing it.
 */

'use client';

import { ReportsDashboard } from '@/components/admin/reports/ReportsDashboard';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';

export default function AdminReportsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title="Reports"
        description="Revenue, sessions, passes, parties and marketing"
      />
      <ReportsDashboard isAdmin />
    </div>
  );
}
