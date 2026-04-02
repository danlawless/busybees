import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Busy Bees Indoor Play Center in Lunenburg, MA. A modern, safe, and engaging indoor play space designed for children ages 0-6 and their families.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Us | Busy Bees Indoor Play Center',
    description: 'A modern indoor play space for children ages 0-6 in Lunenburg, Massachusetts.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
