'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Gift, Users, CalendarDays, MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const MAPS_URL =
  'https://maps.google.com/?q=Busy+Bees+Indoor+Play+Center+301+Massachusetts+Avenue+Lunenburg+MA'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-honey-200 bg-honey-100/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-honey-700">
      {children}
    </span>
  )
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: string
  sub?: string
}) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center mb-12">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal-800">{title}</h2>
      {sub && <p className="mt-4 text-lg text-charcoal-600">{sub}</p>}
    </motion.div>
  )
}

/* ---------------- What's Inside ---------------- */

const playAreas = [
  { icon: '🧗', title: 'Open Play Zone', tag: 'Fan favorite', desc: 'Climb, slide, and tumble through soft-play structures sized just right for growing explorers.' },
  { icon: '🍼', title: 'Infant Nook', desc: 'A gentle, gated space for crawlers and pre-walkers to discover textures and sounds safely.' },
  { icon: '🧸', title: 'Toddler Meadow', tag: 'Key spot', desc: 'Bright, padded play built for wobbly first steps and busy two-year-olds.' },
  { icon: '🎭', title: 'Imagination Corner', desc: 'Pretend kitchens, dress-up, and role play that spark stories and new friendships.' },
  { icon: '☕', title: 'Café & Parent Lounge', desc: 'Comfy seating and good coffee, with clear sightlines to every play area.' },
  { icon: '🌈', title: 'Sensory-Friendly Play', desc: 'Calm zones and quieter sessions for kids who love to play at their own pace.' },
]

export function PlayAreas() {
  return (
    <section className="py-16 sm:py-20 bg-white" id="play">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHead
          eyebrow="The hive is buzzing"
          title="Room to explore, made for little ones"
          sub="Every corner is designed for small hands and big imaginations — soft, safe, and endlessly fun for the 0–6 crowd."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {playAreas.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative rounded-2xl border border-primary-200/30 bg-[#FFFDF7] p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-200"
            >
              {a.tag && (
                <span className="absolute right-5 top-5 rounded-full bg-honey-400 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-charcoal-800">
                  {a.tag}
                </span>
              )}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-200/40 bg-honey-100 text-3xl">
                {a.icon}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-charcoal-800">{a.title}</h3>
              <p className="mt-2 text-charcoal-600">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Day Passes ---------------- */

const passes = [
  { icon: '🍼', name: 'Infant Day Pass', who: 'Under 2 years', amount: '$7', note: 'Free when visiting with a paid toddler sibling.' },
  { icon: '🐝', name: 'Child Day Pass', who: 'Ages 2 and up', amount: '$17', note: 'Full run of every play area, all day long.' },
  { icon: '👯', name: 'Child + Infant', who: 'Best for siblings', amount: '$17', note: "A toddler plus a little sibling play together — infant's on us." },
]

export function DayPasses() {
  return (
    <section className="py-16 sm:py-20 bg-[#FFF8E7]" id="pricing">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHead
          eyebrow="Day passes"
          title="Play all day, one sweet price"
          sub="Walk right in — no reservation needed. Come and go all day on a single admission."
        />
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {passes.map((p) => (
            <motion.div
              key={p.name}
              {...fadeUp}
              className="rounded-2xl border border-primary-200/30 bg-white p-8 text-center shadow-soft"
            >
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-2 text-xl font-semibold text-charcoal-800">{p.name}</h3>
              <div className="text-sm text-charcoal-500">{p.who}</div>
              <div className="mt-3 text-5xl font-bold text-honey-700">
                {p.amount}
                <span className="text-base font-medium text-charcoal-500"> / day</span>
              </div>
              <p className="mt-3 text-sm text-charcoal-600">{p.note}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-charcoal-600">
          🧦 Grip socks required for everyone on the play floor (available at the front desk). Free
          parking at Lunenburg Crossing.
        </p>
      </div>
    </section>
  )
}

/* ---------------- Birthday Parties ---------------- */

const partyTiers = [
  {
    name: 'Basic Bee',
    price: 475,
    cap: 'Up to 15 kids · 2 hours',
    popular: false,
    features: ['Exclusive use of the party room', 'Dedicated party host', 'Paper goods & birthday crown', 'Setup & cleanup handled', 'Customized digital invitations'],
  },
  {
    name: 'Worker Bee+',
    price: 525,
    cap: 'Up to 15 kids · 2 hours',
    popular: true,
    features: ['Everything in Basic Bee', 'Pizza for all the guests', 'Soda & drinks included', 'Play area access during your party', 'Customized digital invitations'],
  },
  {
    name: 'Queen Bee+',
    price: 575,
    cap: 'Up to 20 kids · 2 hours',
    popular: false,
    features: ['Everything in Worker Bee+', 'Birthday cake included', 'Balloon decorations', 'Extra guests & the royal treatment', 'Customized digital invitations'],
  },
]

export function HomeParties() {
  return (
    <section className="py-16 sm:py-20 bg-white" id="parties">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHead
          eyebrow="Birthday parties"
          title="Un-bee-lievable birthdays, zero stress"
          sub="You bring the birthday kid — we handle setup, hosting, and cleanup. Two private hours, the whole play space, and sweet memories."
        />
        <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
          {partyTiers.map((t) => (
            <motion.div
              key={t.name}
              {...fadeUp}
              className={`relative flex flex-col rounded-2xl bg-[#FFFDF7] p-8 shadow-soft ${
                t.popular ? 'border-2 border-honey-400 shadow-medium' : 'border border-primary-200/30'
              }`}
            >
              {t.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-honey-600 to-honey-400 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-2xl font-bold text-charcoal-800">{t.name}</h3>
              <div className="mt-1 text-4xl font-bold text-honey-700">
                ${t.price}
                <span className="text-sm font-medium text-charcoal-500"> private</span>
              </div>
              <div className="mt-1 text-sm text-charcoal-500">{t.cap}</div>
              <ul className="mt-5 mb-6 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-charcoal-700">
                    <span className="mt-0.5 font-bold text-honey-500">✓</span>
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/parties" className="mt-auto">
                <Button
                  size="lg"
                  className={`w-full font-semibold ${
                    t.popular
                      ? 'bg-honey-500 hover:bg-honey-600 text-charcoal-900'
                      : 'bg-white text-charcoal-800 border-2 border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  Choose {t.name}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-charcoal-600">
          🗓️ Check real-time availability and book online in minutes —{' '}
          <Link href="/parties" className="font-semibold text-honey-700 underline hover:no-underline">
            weekend dates fill fast!
          </Link>
        </p>
      </div>
    </section>
  )
}

/* ---------------- Membership ---------------- */

const perks = [
  { icon: '♾️', title: 'Unlimited visits', desc: 'play as often as you like' },
  { icon: '🐝', title: 'Skip the day-pass line', desc: 'just buzz on in' },
  { icon: '👨‍👩‍👧', title: 'Sibling-friendly', desc: 'pricing for the whole hive' },
  { icon: '🎁', title: 'Member perks', desc: 'on parties & special events' },
]

export function Membership() {
  return (
    <section className="py-16 sm:py-20 bg-[#FFF8E7]" id="membership">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <Eyebrow>Busy Bee membership</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal-800">Regulars save the most</h2>
            <p className="mt-4 text-lg text-charcoal-600">
              If your little one loves it here (they will), a monthly membership pays for itself in
              just a few visits — unlimited play, every day we&apos;re open.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            className="rounded-3xl border border-primary-200/30 bg-white p-8 shadow-soft"
          >
            <div className="text-lg font-semibold text-charcoal-800">Monthly Membership</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-honey-700">$100</span>
              <span className="text-charcoal-500">/ month, per child</span>
            </div>
            <ul className="mt-6 mb-6 space-y-3">
              {perks.map((p) => (
                <li key={p.title} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-honey-100 text-lg">
                    {p.icon}
                  </span>
                  <span className="text-charcoal-700">
                    <b>{p.title}</b> — {p.desc}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/customer/login">
              <Button size="lg" className="w-full bg-honey-500 hover:bg-honey-600 text-charcoal-900 font-semibold">
                Become a member
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- More Ways to Play ---------------- */

const ways = [
  { icon: CalendarDays, title: 'Events & Special Days', desc: 'Seasonal parties, holiday events, and sensory-friendly sessions all year round.', href: '/events' },
  { icon: Users, title: 'Groups & Field Trips', desc: 'Daycares, camps, and playgroups welcome — with large-group discounts.', href: '/groups' },
  { icon: Gift, title: 'Gift Cards', desc: 'The perfect present for the family with a busy little one. Buy in seconds.', href: '/gift-cards' },
]

export function MoreWays() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHead eyebrow="More ways to play" title="Beyond open play" />
        <div className="grid gap-6 md:grid-cols-3">
          {ways.map((w) => {
            const Icon = w.icon
            return (
              <motion.div key={w.title} {...fadeUp}>
                <Link
                  href={w.href}
                  className="group flex h-full items-start gap-4 rounded-2xl border border-primary-200/30 bg-[#FFFDF7] p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-medium"
                >
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-honey-100 text-honey-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="flex items-center gap-1 text-lg font-semibold text-charcoal-800">
                      {w.title}
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </h3>
                    <p className="mt-1 text-sm text-charcoal-600">{w.desc}</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Location & Hours ---------------- */

export function LocationHours() {
  return (
    <section className="py-16 sm:py-20 bg-[#FFF8E7]" id="visit">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <Eyebrow>Come visit</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal-800">Buzz on in</h2>
            <dl className="mt-6 space-y-4 text-charcoal-700">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 flex-none text-honey-600" />
                <dd>
                  Lunenburg Crossing
                  <br />
                  301 Massachusetts Avenue (Rt. 2A)
                  <br />
                  Lunenburg, MA 01462
                </dd>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 flex-none text-honey-600" />
                <dd>Open 7 days a week — see full hours &amp; pricing.</dd>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 flex-none text-honey-600" />
                <dd>
                  <a href="tel:+19787850015" className="hover:text-honey-700">(978) 785-0015</a>
                </dd>
              </div>
              <div className="flex gap-3">
                <Mail className="h-5 w-5 flex-none text-honey-600" />
                <dd>
                  <a href="mailto:info@busybeesipc.com" className="hover:text-honey-700">info@busybeesipc.com</a>
                </dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-honey-500 hover:bg-honey-600 text-charcoal-900 font-semibold">
                  📍 Get Directions
                </Button>
              </a>
              <Link href="/info">
                <button className="rounded-full border-2 border-primary-300 bg-white px-6 py-3 font-semibold text-charcoal-800 hover:bg-primary-50 transition-all">
                  Hours &amp; Pricing
                </button>
              </Link>
            </div>
          </motion.div>

          <motion.a
            {...fadeUp}
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[20rem] items-center justify-center rounded-3xl border border-primary-200/30 bg-gradient-to-br from-primary-50 to-honey-100 text-center text-charcoal-500 shadow-soft transition-all hover:shadow-medium"
          >
            <span>
              <MapPin className="mx-auto mb-2 h-8 w-8 text-honey-600" />
              <span className="block font-semibold text-charcoal-700">Find us at Lunenburg Crossing</span>
              <span className="text-sm">Tap for directions</span>
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
