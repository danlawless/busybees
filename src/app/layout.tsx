import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'Busy Bees Indoor Play Center - Safe Fun for Kids 0-6',
  description: 'Modern, safe and engaging indoor play space for children ages 0-6. Creating a go-to destination for families to play, socialize and celebrate.',
  keywords: 'indoor playground, kids play center, birthday parties, toddler activities, family fun, safe play space',
  authors: [{ name: 'Busy Bees Indoor Play Center' }],
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Busy Bees Indoor Play Center',
    description: 'Safe, fun indoor play space for children ages 0-6',
    url: 'https://busybeesipc.com',
    siteName: 'Busy Bees Indoor Play Center',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Busy Bees Indoor Play Center',
    description: 'Safe, fun indoor play space for children ages 0-6',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
