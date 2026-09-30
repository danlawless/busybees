import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Birthday Parties',
  description: 'Book a birthday party at Busy Bees Indoor Play Center in Lunenburg, MA. Queen Bee, Worker Bee, and Basic Bee packages for ages 0-6 with private party rooms, dedicated party hosts, and full use of the play area.',
  alternates: { canonical: '/parties' },
  openGraph: {
    title: 'Birthday Parties | Busy Bees Indoor Play Center',
    description: 'Birthday party packages for kids ages 0-6 in Lunenburg, MA. Private party rooms, dedicated hosts, and full use of the play area. Bring your own food and cake.',
  },
};

export default function PartiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
