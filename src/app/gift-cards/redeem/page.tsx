/**
 * Gift Card Redemption Page
 */

import { Layout } from '@/components/layout/Layout';
import { GiftCardRedemption } from '@/components/gift-cards/GiftCardRedemption';

export const metadata = {
  title: 'Redeem Gift Card | Busy Bees Indoor Play Center',
  description: 'Redeem your Busy Bees gift card to add credit to your account.',
};

export default function GiftCardRedeemPage() {
  return (
    <Layout>
      <GiftCardRedemption />
    </Layout>
  );
}

