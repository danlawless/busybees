'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Shield, Heart, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { PURCHASING_ENABLED } from '@/lib/feature-flags'

const features = [
  {
    icon: Shield,
    text: 'Safe & Clean Environment'
  },
  {
    icon: Heart,
    text: 'Ages 0-6 Welcome'
  },
  {
    icon: Star,
    text: 'All-Day Fun'
  }
]

export function Hero() {
  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-24">
      <HoneycombPattern variant="dense" size="xl" />

      {/* Flying Bees beside Title */}
      <motion.div
        className="absolute left-1/2 top-32 transform -translate-x-96 -translate-y-1/2 z-10 hidden xl:block"
        initial={{ x: -100, opacity: 0, scale: 0.8 }}
        animate={{ x: 0, opacity: 0.8, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      >
        <Image
          src="/bee-flying-side2.png"
          alt="Flying bee decoration"
          width={180}
          height={180}
          className="drop-shadow-lg"
        />
      </motion.div>

      <motion.div
        className="absolute right-1/2 top-32 transform translate-x-96 -translate-y-1/2 z-10 hidden xl:block"
        initial={{ x: 100, opacity: 0, scale: 0.8 }}
        animate={{ x: 0, opacity: 0.8, scale: 1 }}
        transition={{ duration: 1.2, delay: 1.0 }}
      >
        <Image
          src="/bee-flying-side1.png"
          alt="Flying bee decoration"
          width={180}
          height={180}
          className="drop-shadow-lg"
        />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          className="text-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Main Hero Content */}
          <motion.div variants={fadeInUp} className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl">
              <span className="text-primary-600">Busy Bees</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-medium text-charcoal-700">
                Indoor Play Center
              </span>
            </h1>
          </motion.div>

          <motion.p
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-600 mb-8"
          >
            A modern, safe and engaging indoor play space for your little ones with distinct areas for infants, toddlers and young children. Our mission is to create a go-to destination for families to play, socialize, celebrate and grow.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="flex items-center space-x-2 card-pastel px-4 py-2 rounded-full shadow-soft"
                >
                  <Icon className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-charcoal-800">{feature.text}</span>
                </div>
              )
            })}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {PURCHASING_ENABLED ? (
              <Link href="/pre-register">
                <Button variant="primary" size="lg" className="min-w-48">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Pre-Register Now
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="lg" className="min-w-48" disabled>
                <UserPlus className="w-5 h-5 mr-2" />
                Coming Soon
              </Button>
            )}
          </motion.div>

          {/* Important Info */}
          <motion.div
            variants={fadeInUp}
            className="mt-12 p-6 card-pastel rounded-2xl shadow-soft max-w-3xl mx-auto"
          >
            <h3 className="text-lg font-semibold text-charcoal-800 mb-4 text-center">
              Good to Know
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-charcoal-600">
              <div className="flex items-start space-x-2">
                <span className="text-primary-600">💳</span>
                <span>Cash-free business - all major cards accepted</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary-600">🧦</span>
                <span>Socks required (we sell them if you forget!)</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary-600">📅</span>
                <span>No reservations required - just drop in!</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary-600">🥪</span>
                <span>Outside food welcome in our café area</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

    </section>
  )
}
