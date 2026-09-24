'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { PhotoBackdrop } from '@/components/home/PhotoBackdrop'
import { fadeInUp, staggerContainer } from '@/lib/utils'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32 min-h-[34rem]">
      {/* A photograph of the play floor, in place of the honeycomb illustration
          that used to sit here. Same treatment as the bands further down the
          page, on the lighter of the two scrims -- the headline is big enough
          to hold its own against more of the picture. */}
      <PhotoBackdrop src="/images/backgrounds/hero-kids-climbing.jpg" tone="hero" priority />

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
          {/* The header already carries the logo, so the hero says one thing:
              the headline over the photograph. */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl"
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

        </motion.div>
      </div>
    </section>
  )
}
