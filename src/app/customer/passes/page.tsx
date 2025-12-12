/**
 * Customer Passes Page
 * Redirects to dashboard with passes tab selected
 */

import { redirect } from 'next/navigation';

export default function PassesPage() {
  redirect('/customer/dashboard?tab=passes');
}
