'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { partyPackages, includedKidsLabel } from '@/lib/pricing/catalog'

/** Which tier carries the "most popular" flag — presentation only. */
const POPULAR_PACKAGE_KEY = 'worker_bee'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

/**
 * The three party package cards, shared by the homepage and /parties so the
 * two can never show different packages. Prices and features come from the
 * pricing catalog — the same constant checkout charges — never from here.
 *
 * Each card's button either links somewhere (the homepage sends people to
 * /parties) or runs `onChoose` (the parties page starts booking).
 */
export function PartyPackageCards(
  props: { href: string; onChoose?: never } | { onChoose: () => void; href?: never }
) {
  const partyTiers = partyPackages().map((pkg) => ({
    ...pkg,
    cap: includedKidsLabel(pkg),
    popular: pkg.key === POPULAR_PACKAGE_KEY,
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
      {partyTiers.map((t) => {
        const button = (
          <Button
            size="lg"
            onClick={props.onChoose}
            className={`w-full font-semibold ${
              t.popular
                ? 'bg-honey-500 hover:bg-honey-600 text-charcoal-900'
                : 'bg-white text-charcoal-800 border-2 border-primary-300 hover:bg-primary-50'
            }`}
          >
            Choose {t.name}
          </Button>
        )

        return (
          <motion.div
            key={t.key}
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
            {props.href ? (
              <Link href={props.href} className="mt-auto">
                {button}
              </Link>
            ) : (
              <div className="mt-auto">{button}</div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
