import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "After Dark - Parents' Night Out",
  description: "Busy Bees After Dark: Friday night drop-off events for kids ages 3-6 in Lunenburg, MA. Pizza, movies, and supervised play from 5:00-7:30 PM. Enjoy a night out while your kids have a blast!",
  alternates: { canonical: '/after-dark' },
  openGraph: {
    title: "After Dark - Parents' Night Out | Busy Bees Indoor Play Center",
    description: "Friday night drop-off events for kids ages 3-6. Pizza, movies, and supervised play in Lunenburg, MA.",
  },
};

export default function AfterDarkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
