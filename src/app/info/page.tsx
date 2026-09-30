import { Layout } from '@/components/layout/Layout'
import { PACKAGE_PRICING, ADDITIONAL_KIDS_PRICE } from '@/lib/validations/party-booking'
import { InfoHero } from '@/components/info/InfoHero'
import { ImportantInfo } from '@/components/info/ImportantInfo'
import { DetailedHours } from '@/components/info/DetailedHours'
import { Pricing } from '@/components/home/Pricing'
import { FAQ } from '@/components/info/FAQ'
import { RulesAndPolicies } from '@/components/info/RulesAndPolicies'

export const metadata = {
  title: 'Hours, Pricing & FAQ',
  description: 'Plan your visit to Busy Bees Indoor Play Center in Lunenburg, MA. Hours, day pass and membership pricing, birthday party info, and frequently asked questions.',
  alternates: { canonical: '/info' },
  openGraph: {
    title: 'Hours, Pricing & FAQ | Busy Bees Indoor Play Center',
    description: 'Hours, pricing, and FAQs for Busy Bees Indoor Play Center in Lunenburg, MA.',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What age groups can play at Busy Bees?',
      acceptedAnswer: { '@type': 'Answer', text: 'Busy Bees is designed for children ages 0-6 years. We have a dedicated infant area (0-2 years) and a main play area (2-6 years).' },
    },
    {
      '@type': 'Question',
      name: 'Do I need to make a reservation?',
      acceptedAnswer: { '@type': 'Answer', text: 'No reservations needed for open play! Just walk in during our open hours. Reservations are only required for birthday parties and private events.' },
    },
    {
      '@type': 'Question',
      name: 'How much is general admission?',
      acceptedAnswer: { '@type': 'Answer', text: 'General admission is $17 per child ages 2+, and $7 for infants under 2 years old. Infants are FREE with a paid sibling admission! This gives you all-day access with no time limits.' },
    },
    {
      '@type': 'Question',
      name: 'Do children need to wear socks?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, socks are required in all play areas for safety and hygiene. We have grip socks available for purchase at the front desk.' },
    },
    {
      '@type': 'Question',
      name: 'How do I book a birthday party?',
      acceptedAnswer: { '@type': 'Answer', text: `Log in to your account and purchase under the Parties section. We recommend booking at least a week in advance. We offer three packages: ${PACKAGE_PRICING.basic_bee.name} ($${PACKAGE_PRICING.basic_bee.privatePrice}), ${PACKAGE_PRICING.worker_bee.name} ($${PACKAGE_PRICING.worker_bee.privatePrice}), and ${PACKAGE_PRICING.queen_bee.name} ($${PACKAGE_PRICING.queen_bee.privatePrice}) — all include exclusive use of the facility.` },
    },
    {
      '@type': 'Question',
      name: 'How many kids are included in a party package?',
      acceptedAnswer: { '@type': 'Answer', text: `${PACKAGE_PRICING.queen_bee.name} includes ${PACKAGE_PRICING.queen_bee.includedKids} kids, ${PACKAGE_PRICING.worker_bee.name} includes ${PACKAGE_PRICING.worker_bee.includedKids}, and ${PACKAGE_PRICING.basic_bee.name} includes ${PACKAGE_PRICING.basic_bee.includedKids}. Each additional child is $${ADDITIONAL_KIDS_PRICE}. ${PACKAGE_PRICING.queen_bee.name} can accommodate up to ${PACKAGE_PRICING.queen_bee.maxGuests} kids, and the other two up to ${PACKAGE_PRICING.worker_bee.maxGuests}.` },
    },
    {
      '@type': 'Question',
      name: 'How does the monthly membership work?',
      acceptedAnswer: { '@type': 'Answer', text: 'Once activated, your monthly membership starts a 1-month timer. During that month you enjoy unlimited visits. Memberships default to auto-renew but can be turned off in My Account.' },
    },
    {
      '@type': 'Question',
      name: 'Can I bring my own food and drinks?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes! Outside food and drinks are welcome and should be consumed in our designated eating area. We also have snacks and drinks available for purchase.' },
    },
    {
      '@type': 'Question',
      name: 'Can I leave my child unattended?',
      acceptedAnswer: { '@type': 'Answer', text: 'No, children must be actively supervised by a parent or guardian at all times.' },
    },
    {
      '@type': 'Question',
      name: 'Do punch cards expire?',
      acceptedAnswer: { '@type': 'Answer', text: 'No! Our 10-visit punch cards never expire and can be transferred to family or friends. Toddler punch cards are $150 and infant punch cards are $50.' },
    },
  ],
};

export default function InfoPage() {
  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <InfoHero />
      <DetailedHours />
      <Pricing />
      <ImportantInfo />
      <FAQ />
      <RulesAndPolicies />
    </Layout>
  )
}
