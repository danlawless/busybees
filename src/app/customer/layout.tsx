/**
 * Customer Portal Layout
 * Wraps customer pages with site header and footer for navigation
 */

'use client';

import { Layout } from '@/components/layout/Layout';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}

