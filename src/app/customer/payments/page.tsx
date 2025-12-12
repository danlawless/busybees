/**
 * Customer Payments Page
 * Redirects to dashboard with payments tab selected
 */

import { redirect } from 'next/navigation';

export default function PaymentsPage() {
  redirect('/customer/dashboard?tab=payments');
}
