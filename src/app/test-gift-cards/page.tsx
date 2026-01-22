/**
 * TEST Gift Card Purchase Page
 * Hidden test page for verifying gift card + Stripe integration
 * NOT linked from navigation - access directly via /test-gift-cards
 */

import { Layout } from '@/components/layout/Layout';
import { TestGiftCardPurchaseForm } from '@/components/gift-cards/TestGiftCardPurchaseForm';

export const metadata = {
  title: 'TEST Gift Card | Busy Bees',
  description: 'Test page for gift card purchases - not for public use',
  robots: 'noindex, nofollow', // Prevent search engines from indexing
};

export default function TestGiftCardPurchasePage() {
  return (
    <Layout>
      <TestGiftCardPurchaseForm />
    </Layout>
  );
}
