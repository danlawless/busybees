/**
 * Gift Card Purchase Success Page
 */

import { Suspense } from 'react';
import { Layout } from '@/components/layout/Layout';
import { GiftCardSuccess } from '@/components/gift-cards/GiftCardSuccess';
import { HoneycombPattern } from '@/components/ui/BeeIcon';

export const metadata = {
  title: 'Gift Card Purchased! | Busy Bees Indoor Play Center',
  description: 'Your Busy Bees gift card has been purchased successfully.',
};

function LoadingFallback() {
  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20 min-h-[600px] flex items-center justify-center">
      <HoneycombPattern variant="dense" size="xl" />
      <div className="relative z-20 text-center">
        <div className="w-12 h-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto mb-4" />
        <p className="text-charcoal-600">Loading...</p>
      </div>
    </section>
  );
}

export default function GiftCardSuccessPage() {
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <GiftCardSuccess />
      </Suspense>
    </Layout>
  );
}

