/**
 * Gift Cards Landing Page
 * Options to purchase or redeem gift cards
 */

import { Layout } from '@/components/layout/Layout';
import { GiftCardsHero } from '@/components/gift-cards/GiftCardsHero';

export const metadata = {
  title: 'Gift Cards | Busy Bees Indoor Play Center',
  description: 'Give the gift of play! Purchase a Busy Bees gift card for friends and family.',
};

export default function GiftCardsPage() {
  return (
    <Layout>
      <GiftCardsHero />
    </Layout>
  );
}

