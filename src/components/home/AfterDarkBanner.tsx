'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

// Fixed star positions — deterministic so server and client render identically
const STARS = [
  { top: '12%', left: '8%', size: 2, delay: 0 },
  { top: '22%', left: '24%', size: 3, delay: 1.4 },
  { top: '70%', left: '14%', size: 2, delay: 0.8 },
  { top: '34%', left: '46%', size: 2, delay: 2.1 },
  { top: '18%', left: '63%', size: 3, delay: 0.4 },
  { top: '78%', left: '38%', size: 2, delay: 1.7 },
  { top: '8%', left: '82%', size: 2, delay: 2.6 },
  { top: '55%', left: '72%', size: 3, delay: 1.1 },
  { top: '84%', left: '88%', size: 2, delay: 0.6 },
  { top: '42%', left: '90%', size: 2, delay: 2.3 },
  { top: '64%', left: '54%', size: 2, delay: 0.2 },
  { top: '30%', left: '12%', size: 2, delay: 1.9 },
  { top: '88%', left: '60%', size: 3, delay: 1.3 },
  { top: '14%', left: '40%', size: 2, delay: 2.8 },
  { top: '48%', left: '30%', size: 2, delay: 0.9 },
  { top: '60%', left: '4%', size: 2, delay: 2.0 },
]

export function AfterDarkBanner() {
  return (
    <section
      className="relative overflow-hidden px-4 py-20 sm:py-24"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 45%, #0d0d1a 100%)' }}
    >
      {/* Twinkling stars */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {STARS.map((star, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
            animate={{ opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, delay: star.delay }}
          />
        ))}
      </div>

      {/* Glow orbs */}
      <div
        className="absolute -top-12 left-1/4 h-80 w-80 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="absolute -bottom-16 right-1/4 h-80 w-80 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        aria-hidden
      />

      <motion.div
        className="relative z-10 mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Eyebrow */}
        <span
          className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest sm:text-sm"
          style={{ color: '#c4b5fd', border: '1px solid #6d28d9', background: 'rgba(124, 58, 237, 0.12)' }}
        >
          🌙 New — Parents&apos; Night Out
        </span>

        {/* Headline */}
        <h2 className="after-dark-banner-neon text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Busy Bees After Dark
        </h2>
        <p
          className="mt-3 text-xl font-semibold sm:text-2xl md:text-3xl"
          style={{ color: '#e9d5ff' }}
        >
          Opening Night — Friday, June 5th!
        </p>

        {/* Description */}
        <p
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
          style={{ color: '#a5b4fc' }}
        >
          Every Friday night, drop off the kids for an evening of pizza, movies, and
          supervised play — while you enjoy a well-deserved night out.
        </p>

        {/* CTA */}
        <Link
          href="/after-dark"
          className="after-dark-banner-btn mt-9 inline-flex items-center justify-center rounded-full px-9 py-4 text-lg font-bold transition-all"
        >
          Explore After Dark
        </Link>
      </motion.div>

      <style jsx>{`
        .after-dark-banner-neon {
          color: #c4b5fd;
          text-shadow:
            0 0 7px rgba(139, 92, 246, 0.6),
            0 0 21px rgba(139, 92, 246, 0.3),
            0 0 42px rgba(124, 58, 237, 0.2),
            0 0 82px rgba(124, 58, 237, 0.1);
        }

        .after-dark-banner-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow:
            0 0 20px rgba(124, 58, 237, 0.4),
            0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .after-dark-banner-btn:hover {
          box-shadow:
            0 0 30px rgba(124, 58, 237, 0.6),
            0 6px 20px rgba(0, 0, 0, 0.4);
          transform: translateY(-2px);
        }
      `}</style>
    </section>
  )
}
