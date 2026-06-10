'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

/**
 * Full-width banner for Busy Bees After Dark.
 * Sits below the site menu bar and above the homepage hero.
 */
export function AfterDarkBanner() {
  return (
    <Link href="/after-dark" className="group block" aria-label="Busy Bees After Dark — now serving Parents' Night Out every Friday">
      <motion.div
        className="relative overflow-hidden px-4 py-8 text-center sm:py-10"
        style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 45%, #0d0d1a 100%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Glow accents */}
        <div
          className="pointer-events-none absolute -top-12 left-1/4 h-44 w-44 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 right-1/4 h-44 w-44 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
          aria-hidden
        />

        <div className="relative z-10">
          <p
            className="text-xs font-bold uppercase tracking-[0.25em] sm:text-sm"
            style={{ color: '#c4b5fd' }}
          >
            🌙 Now Serving
          </p>
          <h2
            className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl"
            style={{
              color: '#e9d5ff',
              textShadow: '0 0 12px rgba(139, 92, 246, 0.5), 0 0 32px rgba(124, 58, 237, 0.3)',
            }}
          >
            Busy Bees After Dark
          </h2>
          <p
            className="mt-2 text-base font-semibold sm:text-lg md:text-xl"
            style={{ color: '#c4b5fd' }}
          >
            Parents&apos; Night Out
            <span className="hidden sm:inline"> — </span>
            <br className="sm:hidden" />
            Every Friday, Book Now
          </p>
          <span
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold transition-transform group-hover:translate-x-1"
            style={{ color: '#c4b5fd' }}
          >
            Learn More &rarr;
          </span>
        </div>
      </motion.div>
    </Link>
  )
}
