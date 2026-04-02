/**
 * Gift Cards Landing Page
 * Options to purchase or redeem gift cards
 */

import { Layout } from '@/components/layout/Layout';
import { GiftCardsHero } from '@/components/gift-cards/GiftCardsHero';

export const metadata = {
  title: 'Gift Cards',
  description: 'Give the gift of play! Purchase a Busy Bees Indoor Play Center gift card for friends and family. Digital delivery, redeemable for day passes, memberships, and birthday parties in Lunenburg, MA.',
  alternates: { canonical: '/gift-cards' },
  openGraph: {
    title: 'Gift Cards | Busy Bees Indoor Play Center',
    description: 'Purchase a digital gift card for Busy Bees Indoor Play Center in Lunenburg, MA.',
  },
};

export default function GiftCardsPage() {
  return (
    <Layout>
      <GiftCardsHero />
    </Layout>
  );
}

