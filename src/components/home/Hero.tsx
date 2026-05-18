'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

export function Hero() {
  return (
    <>
      {/* Static Image Hero — pre-video layout with flying bees + title + CTAs */}
      <section className="relative overflow-hidden py-24 sm:py-32 lg:py-36 min-h-[32rem]">
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

        {/* After Dark promo — beehive logo links to the After Dark page */}
        <motion.div
          className="absolute right-8 top-1/2 z-30 hidden -translate-y-1/2 lg:block xl:right-16"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 1.1 }}
        >
          <Link
            href="/after-dark"
            className="group flex flex-col items-center"
            aria-label="Busy Bees After Dark — opening June 5th"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/hive.png"
                alt="Busy Bees After Dark beehive"
                width={130}
                height={130}
                className="drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
              />
            </motion.div>
            <span
              className="mt-2 rounded-full px-4 py-1 text-sm font-bold text-white shadow-md"
              style={{ backgroundColor: '#6d28d9' }}
            >
              🌙 After Dark
            </span>
            <span
              className="mt-1 text-xs font-semibold"
              style={{ color: '#4A4A4A' }}
            >
              Opening June 5th
            </span>
          </Link>
        </motion.div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Title */}
            <motion.div variants={fadeInUp} className="mb-6">
              <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl">
                <span className="text-primary-600">Busy Bees</span>
                <br />
                <span className="text-3xl sm:text-4xl lg:text-5xl font-medium text-charcoal-700">
                  Indoor Play Center
                </span>
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              variants={fadeInUp}
              className="mb-10 mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-700"
            >
              A Safe, Engaging Indoor Play Space for Young Children —
              <span className="block sm:inline"> Conveniently located in Lunenburg.</span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-row items-center justify-center gap-4">
              <Link href="/customer/login">
                <Button
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold bg-honey-500 hover:bg-honey-600 text-charcoal-900 border-0 shadow-xl hover:shadow-2xl transition-all"
                >
                  Join the Hive
                </Button>
              </Link>
              <Link href="/info">
                <button
                  className="px-8 py-4 text-lg font-semibold rounded-full shadow-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: '#1f2937', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif', border: 'none' }}
                >
                  Learn More
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-16 sm:py-20 bg-[#FFF8E7]">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
          <motion.div
            className="space-y-8 text-lg sm:text-xl leading-relaxed text-charcoal-800"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p>
              Welcome to Busy Bee&apos;s Indoor Play Center — the ultimate place for
              little ones to play, explore, and burn off energy in a safe, clean,
              and exciting environment! Whether you&apos;re stopping by for open
              play, celebrating a special occasion, or looking for fun activities
              year-round, Busy Bee&apos;s offers a welcoming space designed for
              children to learn, socialize, and stay active while parents relax
              and enjoy the experience.
            </p>

            <p>
              At Busy Bee&apos;s, there&apos;s always something fun happening for
              kids of all ages, including:
            </p>

            <ul className="list-disc list-outside pl-6 space-y-2 columns-1 sm:columns-2 sm:gap-x-10">
              <li>Open Play Sessions</li>
              <li>Toddler &amp; Infant Play Areas</li>
              <li>Birthday Parties &amp; Private Events</li>
              <li>Summer Programs &amp; Special Events</li>
              <li>Busy Bee&apos;s After Dark Parent Drop-Off Nights</li>
              <li>Seasonal &amp; Holiday-Themed Events</li>
              <li>Group Visits &amp; Summer Camp Field Trips</li>
              <li>Rainy Day Play Adventures</li>
              <li>Sensory-Friendly Play Opportunities</li>
              <li>Large Group Discounts &amp; Community Events</li>
            </ul>

            <p>
              From climbing and sliding to imaginative play and making new
              friends, Busy Bee&apos;s is the perfect destination for families
              looking to create lasting memories while giving little ones the
              freedom to play, move, and have fun!
            </p>
          </motion.div>
        </div>
      </section>
    </>
  )
}
