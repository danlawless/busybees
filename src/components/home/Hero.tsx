'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const MAPS_URL =
  'https://maps.google.com/?q=Busy+Bees+Indoor+Play+Center+301+Massachusetts+Avenue+Lunenburg+MA'

const stats = [
  { n: '0–6', l: 'Ages welcome' },
  { n: 'All day', l: 'Play, no time limits' },
  { n: 'Sparkling', l: 'Cleaned & sanitized' },
  { n: 'Comfy', l: 'Café & parent seating' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32 min-h-[34rem]">
      {/* Hero background image */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <Image
          src="/hero-background.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#FFFDF7]/30 via-transparent to-[#FFF8E7]/25"
          aria-hidden
        />
      </div>

      {/* Flying Bees beside title (large screens only) */}
      <div className="absolute left-1/2 top-28 z-10 hidden -translate-x-[26rem] -translate-y-1/2 xl:block">
        <motion.div
          initial={{ x: -100, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 0.8, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
        >
          <Image src="/bee-flying-side2.png" alt="Flying bee decoration" width={160} height={160} className="drop-shadow-lg" />
        </motion.div>
      </div>
      <div className="absolute right-1/2 top-28 z-10 hidden translate-x-[26rem] -translate-y-1/2 xl:block">
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 0.8, scale: 1 }}
          transition={{ duration: 1.2, delay: 1.0 }}
        >
          <Image src="/bee-flying-side1.png" alt="Flying bee decoration" width={160} height={160} className="drop-shadow-lg" />
        </motion.div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
        <motion.div className="text-center" variants={staggerContainer} initial="initial" animate="animate">
          {/* Brand wordmark */}
          <motion.div variants={fadeInUp}>
            <div className="text-4xl sm:text-5xl font-bold leading-none text-honey-600">
              Busy Bees
            </div>
            <div className="mt-1 text-xl sm:text-2xl text-charcoal-700">
              Indoor Play Center
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeInUp}
            className="mt-6 text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl"
          >
            Where little ones{' '}
            <span className="text-primary-600">buzz, play &amp; grow</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            variants={fadeInUp}
            className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-700"
          >
            6,000 square feet of indoor playground built just for babies, toddlers, and
            preschoolers. Open 7 days a week — no time limits on play!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/customer/login">
              <Button
                size="lg"
                className="px-8 py-4 text-lg font-semibold bg-honey-500 hover:bg-honey-600 text-charcoal-900 border-0 shadow-xl hover:shadow-2xl transition-all"
              >
                🍯 Join the Hive
              </Button>
            </Link>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <button className="px-8 py-4 text-lg font-semibold rounded-full bg-white/90 text-charcoal-800 border-2 border-primary-300 shadow-lg hover:bg-white transition-all">
                📍 Get Directions
              </button>
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={fadeInUp}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-primary-200/40 bg-white/90 backdrop-blur-sm px-4 py-4 shadow-soft"
              >
                <div className="text-xl sm:text-2xl font-bold text-charcoal-800">{s.n}</div>
                <div className="mt-1 text-xs sm:text-sm text-charcoal-600">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
