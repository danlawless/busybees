import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Birthday Parties',
  description: 'Book a birthday party at Busy Bees Indoor Play Center in Lunenburg, MA. Queen Bee, Worker Bee, and Basic Bee packages for ages 0-6 with private party rooms, pizza, cake, and dedicated party hosts.',
  alternates: { canonical: '/parties' },
  openGraph: {
    title: 'Birthday Parties | Busy Bees Indoor Play Center',
    description: 'Birthday party packages for kids ages 0-6 in Lunenburg, MA. Private party rooms, food, decorations, and dedicated hosts.',
  },
};

export default function PartiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
