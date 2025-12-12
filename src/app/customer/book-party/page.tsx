/**
 * Party Booking Page
 * Redirects to dashboard with parties tab selected
 */

import { redirect } from 'next/navigation';

export default function BookPartyPage() {
  redirect('/customer/dashboard?tab=parties');
}
