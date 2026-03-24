'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Shield, Heart, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { PURCHASING_ENABLED } from '@/lib/feature-flags'

const features = [
  {
    icon: Shield,
    text: 'Safe & Clean Environment'
  },
  {
    icon: Heart,
    text: 'All Ages Welcome'
  },
  {
    icon: Star,
    text: 'All-Day Fun'
  }
]

const goodToKnowItems = [
  { iconSrc: '/icons/cash-free.png', text: 'Cash-free business - all major cards accepted' },
  { iconSrc: '/icons/socks.png', text: 'Socks required (we sell them if you forget!)' },
  { iconSrc: '/icons/drop-in.png', text: 'No reservations required - just drop in!' },
  { iconSrc: '/icons/outside-food.png', text: 'Outside food welcome in our café area' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-36 min-h-[32rem]">
      {/* Hero background image - in-component so it is never overridden */}
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
          className="absolute inset-0 bg-gradient-to-b from-[#FFFDF7]/20 via-transparent to-[#FFF8E7]/15"
          aria-hidden
        />
      </div>

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

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
        <motion.div
          className="text-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Main Hero Content */}
          <motion.div variants={fadeInUp} className="mb-10">
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
            className="mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-600 mb-10 leading-relaxed"
          >
            A modern, safe and engaging indoor play space for your little ones with distinct areas for infants, toddlers and young children. Our mission is to create a go-to destination for families to play, socialize, celebrate and grow.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap justify-center gap-4 sm:gap-5 mb-12"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="flex items-center space-x-2.5 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-soft border border-primary-200/50"
                >
                  <Icon className="w-4 h-4 text-primary-500" />
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
              <Link href="/customer/signup">
                <Button variant="primary" size="lg" className="min-w-48 rounded-full">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Register Now
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="lg" className="min-w-48 rounded-full" disabled>
                <UserPlus className="w-5 h-5 mr-2" />
                Coming Soon
              </Button>
            )}
          </motion.div>

          {/* Good to Know */}
          <motion.div
            variants={fadeInUp}
            className="mt-16 max-w-5xl mx-auto"
          >
            <h3 className="text-xl font-semibold text-charcoal-800 mb-8 text-center">
              Good to Know
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {goodToKnowItems.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col bg-white rounded-2xl shadow-soft border border-primary-200/30 hover:shadow-medium transition-shadow overflow-hidden"
                >
                  <div className="w-full h-48 sm:h-56 bg-[#FFFDF7] overflow-hidden relative p-3 sm:p-4">
                    <Image
                      src={item.iconSrc}
                      alt=""
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-sm font-medium text-charcoal-800 leading-snug">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

    </section>
  )
}
