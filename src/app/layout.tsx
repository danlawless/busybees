import type { Metadata } from "next";
import { Gloria_Hallelujah } from "next/font/google";
import "./globals.css";
import { AnnouncementMarquee } from "@/components/AnnouncementMarquee";

const gloriaHallelujah = Gloria_Hallelujah({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-gloria',
  weight: '400' // Gloria Hallelujah only has 400 weight
});

export const metadata: Metadata = {
  metadataBase: new URL('https://busybeesipc.com'),
  title: 'Busy Bees Indoor Play Center',
  description: 'Modern, safe and engaging indoor play space for children ages 0-6. Creating a go-to destination for families to play, socialize and celebrate.',
  keywords: 'indoor playground, kids play center, birthday parties, toddler activities, family fun, safe play space',
  authors: [{ name: 'Busy Bees Indoor Play Center' }],
  // Icons handled manually in head section below
  openGraph: {
    title: 'Busy Bees Indoor Play Center',
    description: 'Safe, fun indoor play space for children ages 0-6',
    url: 'https://busybeesipc.com',
    siteName: 'Busy Bees Indoor Play Center',
    images: ['/busy-bees-logo-winter.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Busy Bees Indoor Play Center',
    description: 'Safe, fun indoor play space for children ages 0-6',
    images: ['/busy-bees-logo-winter.png'],
  },
  other: {
    'theme-color': '#f5d565',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={gloriaHallelujah.variable}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/busy-bees-favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/busy-bees-favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/busy-bees-favicon.png" />
        <link rel="shortcut icon" href="/busy-bees-favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f5d565" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${gloriaHallelujah.className} font-body antialiased`}>
        <AnnouncementMarquee />
        {children}
      </body>
    </html>
  );
}
