/**
 * Gift Card Purchase Success Page
 */

import { Layout } from '@/components/layout/Layout';
import { GiftCardSuccess } from '@/components/gift-cards/GiftCardSuccess';

export const metadata = {
  title: 'Gift Card Purchased! | Busy Bees Indoor Play Center',
  description: 'Your Busy Bees gift card has been purchased successfully.',
};

export default function GiftCardSuccessPage() {
  return (
    <Layout>
      <GiftCardSuccess />
    </Layout>
  );
}

