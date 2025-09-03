import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'Busy Bees Indoor Play Center',
  description: 'Modern, safe and engaging indoor play space for children ages 0-6. Creating a go-to destination for families to play, socialize and celebrate.',
  keywords: 'indoor playground, kids play center, birthday parties, toddler activities, family fun, safe play space',
  authors: [{ name: 'Busy Bees Indoor Play Center' }],
  // Updated icons with new hive branding
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
    shortcut: '/favicon.ico',
  },
  // Enhanced OpenGraph for link sharing
  openGraph: {
    title: 'Busy Bees Indoor Play Center',
    description: 'Modern, safe and engaging indoor play space for children ages 0-6. Creating a go-to destination for families to play, socialize and celebrate.',
    url: 'https://busybeesipc.com',
    siteName: 'Busy Bees Indoor Play Center',
    images: [
      {
        url: '/busy-bees-logo.png',
        width: 1200,
        height: 630,
        alt: 'Busy Bees Indoor Play Center Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  // Enhanced Twitter/X sharing
  twitter: {
    card: 'summary_large_image',
    title: 'Busy Bees Indoor Play Center',
    description: 'Modern, safe and engaging indoor play space for children ages 0-6',
    images: ['/busy-bees-logo.png'],
  },
  // iOS theme color for yellow link sharing
  other: {
    'theme-color': '#f5d565',
    'msapplication-TileColor': '#f5d565',
    'msapplication-navbutton-color': '#f5d565',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#f5d565" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
