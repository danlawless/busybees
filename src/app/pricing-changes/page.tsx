/**
 * What's changing on 1 October 2026 — the page the announcement email, the
 * site banner and the social post all point at.
 *
 * This page is a deliberate, temporary exception to the rule that no page
 * holds its own copy of a price. Every other surface reads from the live
 * catalog, and the catalog cannot show October's rates until the night they
 * take effect — this page exists precisely to show them beforehand. Once the
 * change is live the catalog is the truth again, and this page should be
 * removed (docs/PRICING_LAUNCH_RUNBOOK.md carries that step).
 */

import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';

export const metadata = {
  title: 'Our prices are changing on 1 October',
  description:
    'What changes at Busy Bees on 1 October 2026: day passes, memberships, punch cards and birthday parties — and what stays the same if you already have a card or a booked party.',
  alternates: { canonical: '/pricing-changes' },
  // A dated announcement: keep it out of search results so it does not
  // outlive the change it describes.
  robots: { index: false, follow: true },
};

// The 1 October 2026 rates. Announced to customers 17 September.
const OCTOBER_2026 = {
  effective: '1 October',
  dayPass: { child: 20, sibling: 10, infant: 10 },
  membership: { one: 65, two: 105, family: 135, previousOne: 100 },
  punchCard: { ten: 170, five: 90 },
  party: {
    tiers: [
      { price: 500, kids: 10 },
      { price: 550, kids: 15 },
      { price: 600, kids: 20 },
    ],
    additionalChild: 15,
  },
  groupRate: 15,
  guestPassesFrom: 'November',
} as const;

const sections = [
  {
    id: 'day-passes',
    title: 'Day passes',
    headline: `$${OCTOBER_2026.dayPass.child} per child, whatever their age`,
    body: [
      `Babies under 1 are $${OCTOBER_2026.dayPass.infant}.`,
      `If you're bringing more than one child, every additional sibling is half price — $${OCTOBER_2026.dayPass.sibling} each. That discount used to be members-only. From ${OCTOBER_2026.effective} it's for everyone.`,
    ],
  },
  {
    id: 'memberships',
    title: 'Memberships are coming down',
    headline: `$${OCTOBER_2026.membership.one} a month for one child, down from $${OCTOBER_2026.membership.previousOne}`,
    body: [
      `Two children is $${OCTOBER_2026.membership.two}, and a family membership is $${OCTOBER_2026.membership.family}.`,
      `Members also get 10% off birthday parties and 10% off snacks and anything from the front desk. And from ${OCTOBER_2026.guestPassesFrom}, two guest passes every month to bring a friend along. If you're here most weeks, it's comfortably the best value we offer.`,
    ],
  },
  {
    id: 'punch-cards',
    title: 'Punch cards now cover every child on your account',
    headline: `10 visits for $${OCTOBER_2026.punchCard.ten}, or a new 5-visit card for $${OCTOBER_2026.punchCard.five}`,
    body: [
      `The bigger change is how they work. Until now a punch card belonged to one child, so a family with two or three children needed two or three cards — and punches left on one child's card were stuck there. From ${OCTOBER_2026.effective}, one card covers everyone on your account. Whoever comes in that day, the punch comes off the same card.`,
      `It suits families whose children come at different times — one on Tuesday, another on Saturday — and it means no more punches stranded on a card your eldest has outgrown. If you're all coming together, the sibling discount on day passes is usually the better deal; we'll always tell you which works out cheaper at the desk.`,
    ],
  },
] as const;

const reassurances = [
  {
    title: 'Already have a punch card?',
    body: `Nothing changes. It keeps working at the price you paid, for the child it was bought for, right through to its expiry date. Cards bought from ${OCTOBER_2026.effective} are the shareable ones.`,
  },
  {
    title: 'Already booked a party?',
    body: 'Your price is locked in at what we quoted you, including the number of children your package came with.',
  },
] as const;

export default function PricingChangesPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-[#FFF8E7] to-white">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-full text-sm font-medium mb-6">
            From {OCTOBER_2026.effective}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-6">
            Our prices are changing
          </h1>
          <p className="text-lg sm:text-xl text-charcoal-600 max-w-3xl mx-auto">
            The first change since we opened our doors. We wanted you to hear it from us, with
            plenty of notice — here is everything that&apos;s changing, and what isn&apos;t.
          </p>
        </div>
      </section>

      {/* Day passes, memberships, punch cards */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          {sections.map((section) => (
            <article key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-800 mb-2">
                {section.title}
              </h2>
              <p className="text-xl font-semibold text-primary-600 mb-4">{section.headline}</p>
              <div className="space-y-3 text-charcoal-600 text-lg leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Parties */}
      <section id="parties" className="py-16 sm:py-20 bg-[#FFF8E7] scroll-mt-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-800 mb-2">
            Birthday parties
          </h2>
          <p className="text-xl font-semibold text-primary-600 mb-6">
            Now organised by how many children you&apos;re bringing
          </p>

          <ul className="grid gap-4 sm:grid-cols-3 mb-8">
            {OCTOBER_2026.party.tiers.map((tier) => (
              <li
                key={tier.kids}
                className="bg-white rounded-3xl border border-primary-200/40 shadow-soft p-6 text-center"
              >
                <p className="text-3xl font-bold text-charcoal-800">${tier.price}</p>
                <p className="text-charcoal-600 mt-1">up to {tier.kids} children</p>
              </li>
            ))}
          </ul>

          <div className="space-y-3 text-charcoal-600 text-lg leading-relaxed">
            <p>
              Extra children beyond that are ${OCTOBER_2026.party.additionalChild} each. Every party
              still includes the private party room, a dedicated host, setup, cleanup, digital
              invitations and full run of the play area for two hours.
            </p>
            <p>
              One thing worth knowing: we no longer provide pizza, cake, drinks or decorations.
              You&apos;re very welcome to bring your own — most families were already doing exactly
              that, and it means your child gets the cake they actually asked for rather than the
              one we happened to order.
            </p>
            <p>
              Group visits — schools, daycares and playgroups — are a flat ${OCTOBER_2026.groupRate}{' '}
              per child, whatever their age.
            </p>
          </div>
        </div>
      </section>

      {/* What stays the same */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-800 mb-8">
            What stays the same
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {reassurances.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-primary-200/40 bg-[#FFFDF7] p-6"
              >
                <h3 className="text-lg font-bold text-charcoal-800 mb-2">{item.title}</h3>
                <p className="text-charcoal-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="py-16 sm:py-20 bg-[#FFF8E7]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-800 mb-4">Why now</h2>
          <p className="text-lg text-charcoal-600 leading-relaxed mb-8">
            Our costs have gone up since we opened and we&apos;ve held our prices as long as we
            sensibly could. We&apos;d rather make one honest change and give you fair warning than
            quietly trim what&apos;s included.
          </p>
          <p className="text-lg text-charcoal-600 leading-relaxed mb-8">
            If you have any questions at all, ask us at the front desk or get in touch —
            we&apos;re happy to walk through what it means for your family.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg px-8 py-4 rounded-lg transition-colors"
          >
            Ask us a question
          </Link>
        </div>
      </section>
    </Layout>
  );
}
