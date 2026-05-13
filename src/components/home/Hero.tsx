'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

export function Hero() {
  return (
    <>
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

      {/* Video Hero — constrained width, defined borders */}
      <section className="bg-[#FFF8E7] py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
          <div className="relative w-full aspect-[16/9] max-h-[640px] overflow-hidden rounded-3xl shadow-large border border-primary-200/40">
            {/* Video Background */}
            <video
              className="absolute inset-0 w-full h-full object-cover hidden sm:block"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            >
              <source
                src="https://cdn-builttotal.b-cdn.net/wp-content/uploads/2026/02/Busy-Bees-321-Massachusetts-Ave-Lunenburg-desktop.mp4"
                type="video/mp4"
              />
            </video>
            <video
              className="absolute inset-0 w-full h-full object-cover sm:hidden"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            >
              <source
                src="https://cdn-builttotal.b-cdn.net/wp-content/uploads/2026/02/Busy-Bees-321-Massachusetts-Ave-Lunenburg-mobile.mp4"
                type="video/mp4"
              />
            </video>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/45 z-10" />

            {/* Content Overlay */}
            <div className="relative z-20 h-full flex flex-col items-center justify-start pt-8 sm:pt-10 lg:pt-12 px-6 sm:px-8 lg:px-12">
              <motion.div
                className="text-center max-w-3xl mx-auto"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {/* Logo */}
                <motion.div variants={fadeInUp} className="mb-4">
                  <Image
                    src="/busy-bees-logo.png"
                    alt="Busy Bees Indoor Play Center"
                    width={120}
                    height={120}
                    className="mx-auto drop-shadow-2xl"
                    priority
                  />
                </motion.div>

                {/* Title */}
                <motion.h1
                  variants={fadeInUp}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Busy Bees
                  <br />
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-medium text-honey-300">
                    Indoor Play Center
                  </span>
                </motion.h1>

                {/* CTA Buttons */}
                <motion.div variants={fadeInUp} className="flex flex-row items-center justify-center gap-3 sm:gap-4">
                  <Link href="/customer/login">
                    <Button
                      size="lg"
                      className="px-6 py-3 text-base sm:text-lg font-semibold bg-honey-500 hover:bg-honey-600 text-charcoal-900 border-0 shadow-xl hover:shadow-2xl transition-all"
                    >
                      Join the Hive
                    </Button>
                  </Link>
                  <Link href="/info">
                    <button
                      className="px-6 py-3 text-base sm:text-lg font-semibold rounded-full shadow-xl transition-all hover:opacity-90"
                      style={{ backgroundColor: '#1f2937', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif', border: 'none' }}
                    >
                      Learn More
                    </button>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Scroll Indicator */}
              <motion.div
                className="absolute bottom-4 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                >
                  <ChevronDown className="w-7 h-7 text-white/70" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
