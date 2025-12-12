/**
 * Gift Card Purchase Page
 * Form to purchase and send gift cards
 */

import { Layout } from '@/components/layout/Layout';
import { GiftCardPurchaseForm } from '@/components/gift-cards/GiftCardPurchaseForm';

export const metadata = {
  title: 'Purchase Gift Card | Busy Bees Indoor Play Center',
  description: 'Purchase a Busy Bees gift card for friends and family. Choose an amount, add a personal message, and send instantly.',
};

export default function GiftCardPurchasePage() {
  return (
    <Layout>
      <GiftCardPurchaseForm />
    </Layout>
  );
}

