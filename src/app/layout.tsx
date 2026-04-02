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
  title: {
    default: 'Busy Bees Indoor Play Center | Indoor Playground in Lunenburg, MA',
    template: '%s | Busy Bees Indoor Play Center',
  },
  description: 'Modern, safe and engaging indoor play space for children ages 0-6 in Lunenburg, Massachusetts. Day passes, birthday parties, monthly memberships, and special events for toddlers and infants.',
  keywords: 'indoor playground Lunenburg MA, kids play center Massachusetts, birthday parties for toddlers, indoor play space near me, toddler activities Lunenburg, infant play area, family fun center',
  authors: [{ name: 'Busy Bees Indoor Play Center' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Busy Bees Indoor Play Center | Indoor Playground in Lunenburg, MA',
    description: 'Safe, fun indoor play space for children ages 0-6 in Lunenburg, MA. Day passes, birthday parties, and memberships.',
    url: 'https://busybeesipc.com',
    siteName: 'Busy Bees Indoor Play Center',
    images: ['/busy-bees-logo-winter.png'],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Busy Bees Indoor Play Center | Lunenburg, MA',
    description: 'Safe, fun indoor play space for children ages 0-6 in Lunenburg, MA',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              '@id': 'https://busybeesipc.com',
              name: 'Busy Bees Indoor Play Center',
              description: 'Modern, safe and engaging indoor play space for children ages 0-6 in Lunenburg, Massachusetts.',
              url: 'https://busybeesipc.com',
              telephone: '+19787850015',
              email: 'info@busybeesipc.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '301 Massachusetts Ave (Rt. 2A)',
                addressLocality: 'Lunenburg',
                addressRegion: 'MA',
                postalCode: '01462',
                addressCountry: 'US',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 42.5934,
                longitude: -71.7264,
              },
              priceRange: '$$',
              image: 'https://busybeesipc.com/busy-bees-logo-winter.png',
              sameAs: [
                'https://www.instagram.com/busybeesipc/',
                'https://www.facebook.com/busybeesipc',
              ],
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                  opens: '09:00',
                  closes: '18:00',
                },
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Saturday', 'Sunday'],
                  opens: '09:00',
                  closes: '17:00',
                },
              ],
              hasMap: 'https://maps.google.com/?q=Busy+Bees+Indoor+Play+Center+Lunenburg+MA',
              additionalType: 'https://schema.org/ChildCare',
            }),
          }}
        />
        <AnnouncementMarquee />
        {children}
      </body>
    </html>
  );
}
