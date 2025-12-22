/**
 * Customer Portal Layout
 * Wraps all customer pages with the site header and footer
 */

import { Layout } from '@/components/layout/Layout';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
