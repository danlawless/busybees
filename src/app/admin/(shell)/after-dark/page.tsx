/**
 * Admin After Dark Dashboard Page
 * Management page for After Dark events, inside the admin shell.
 */

'use client';

import { AfterDarkAdmin } from '@/components/pos/AfterDarkAdmin';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';

export default function AdminAfterDarkPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title="After Dark"
        description="Attendees, movies, waivers and refunds"
      />
      <AfterDarkAdmin />
    </div>
  );
}
