/**
 * Customer Children Page
 * Redirects to dashboard with children tab selected
 */

import { redirect } from 'next/navigation';

export default function ChildrenPage() {
  redirect('/customer/dashboard?tab=children');
}
