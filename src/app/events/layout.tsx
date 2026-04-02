import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Special events at Busy Bees Indoor Play Center in Lunenburg, MA. Easter Egg Hunts, seasonal celebrations, and family-friendly activities for children ages 0-6.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: 'Events | Busy Bees Indoor Play Center',
    description: 'Special events and celebrations for kids ages 0-6 in Lunenburg, MA.',
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
