/**
 * Customer Purchases Page
 * Redirects to dashboard with passes tab (which shows purchase history)
 */

import { redirect } from 'next/navigation';

export default function PurchasesPage() {
  redirect('/customer/dashboard?tab=passes');
}
