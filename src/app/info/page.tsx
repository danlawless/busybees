import { Layout } from '@/components/layout/Layout'
import { PACKAGE_PRICING, ADDITIONAL_KIDS_PRICE } from '@/lib/validations/party-booking'
import { InfoHero } from '@/components/info/InfoHero'
import { ImportantInfo } from '@/components/info/ImportantInfo'
import { DetailedHours } from '@/components/info/DetailedHours'
import { Pricing } from '@/components/home/Pricing'
import { FAQ } from '@/components/info/FAQ'
import { RulesAndPolicies } from '@/components/info/RulesAndPolicies'
import { createAdminClient } from '@/lib/supabase/server'
import { admissionAnswer, punchCardAnswer, type SiblingRuleLike } from '@/lib/pricing/faq'
import type { CatalogPass } from '@/lib/pricing/catalog'

// The FAQ quotes live prices, so rebuild the page at most every five minutes
// rather than freezing whatever was on sale at deploy time.
export const revalidate = 300

/**
 * The FAQ answers that quote prices, from the same passes and sibling
 * discounts checkout uses. A failed read yields price-free answers, never stale
 * ones.
 */
async function loadPricingAnswers(): Promise<{ admission: string; punchCards: string }> {
  let passes: CatalogPass[] = []
  let siblingRules: SiblingRuleLike[] = []
  try {
    const supabase = createAdminClient()
    const [passesResult, rulesResult] = await Promise.all([
      supabase
        .from('passes')
        .select('id, name, price, category, sessions_included, duration')
        .eq('is_active', true),
      supabase
        .from('sibling_discounts')
        .select('child_position, discount_percent, is_active, applies_to_monthly_only'),
    ])
    passes = (passesResult.data ?? []).map((p) => ({ ...p, price: Number(p.price) }))
    siblingRules = rulesResult.data ?? []
  } catch {
    // Fall through to the price-free answers.
  }
  return {
    admission: admissionAnswer(passes, siblingRules),
    punchCards: punchCardAnswer(passes),
  }
}

export const metadata = {
  title: 'Hours, Pricing & FAQ',
  description: 'Plan your visit to Busy Bees Indoor Play Center in Lunenburg, MA. Hours, day pass and membership pricing, birthday party info, and frequently asked questions.',
  alternates: { canonical: '/info' },
  openGraph: {
    title: 'Hours, Pricing & FAQ | Busy Bees Indoor Play Center',
    description: 'Hours, pricing, and FAQs for Busy Bees Indoor Play Center in Lunenburg, MA.',
  },
}

function buildFaqJsonLd(pricing: { admission: string; punchCards: string }) {
  return {
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
        acceptedAnswer: { '@type': 'Answer', text: pricing.admission },
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
        acceptedAnswer: { '@type': 'Answer', text: pricing.punchCards },
      },
    ],
  };
}

export default async function InfoPage() {
  const pricing = await loadPricingAnswers()
  const faqJsonLd = buildFaqJsonLd(pricing)

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
      <FAQ pricing={pricing} />
      <RulesAndPolicies />
    </Layout>
  )
}
