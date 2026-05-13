'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const goodToKnowItems = [
  { iconSrc: '/icons/cash-free.png', text: 'Cash-free business - all major cards accepted' },
  { iconSrc: '/icons/socks.png', text: 'Socks required (we sell them if you forget!)' },
  { iconSrc: '/icons/drop-in.png', text: 'No reservations required - just drop in!' },
  { iconSrc: '/icons/outside-food.png', text: 'Outside food welcome in our café area' },
]

export function Hero() {
  return (
    <>
      {/* Full-Screen Video Hero */}
      <section className="relative w-full h-screen min-h-[600px] max-h-[1000px] overflow-hidden">
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
        <div className="relative z-20 h-full flex flex-col items-center justify-start pt-12 sm:pt-16 lg:pt-20 px-6 sm:px-8 lg:px-12">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Logo */}
            <motion.div variants={fadeInUp} className="mb-6">
              <Image
                src="/busy-bees-logo.png"
                alt="Busy Bees Indoor Play Center"
                width={160}
                height={160}
                className="mx-auto drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Busy Bees
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-medium text-honey-300">
                Indoor Play Center
              </span>
            </motion.h1>

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

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-8 h-8 text-white/60" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Good to Know Section */}
      <section className="py-16 sm:py-20 bg-[#FFFDF7]">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-charcoal-800 mb-8 text-center">
              Good to Know
            </h2>
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
        </div>
      </section>
    </>
  )
}
