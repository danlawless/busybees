'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export function PartyPackageBackdrop() {
  return (
    <section className="relative py-20 overflow-hidden min-h-[24rem] flex flex-col">
      {/* Section background - hero image with light overlay */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <Image
          src="/hero-background.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF7]/25 via-[#FFF8E7]/15 to-[#FFFDF7]/25" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        {/* New Party Package Backdrop Section */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 sm:text-4xl mb-4">
            Party Package Overview
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Choose the perfect party package for your celebration
          </p>
        </motion.div>

        <motion.div
          className="relative max-w-5xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Mobile Image - Clean Graphic */}
          <div className="md:hidden relative w-full rounded-2xl overflow-hidden shadow-soft border border-primary-200/30 bg-white/90">
            <Image
              src="/party-packages-mobile.png"
              alt="Party Package Options - Queen Bee, Worker Bee, Basic Bee"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>

          {/* Desktop Image Container with Overlays - overflow-visible so labels are not clipped */}
          <div className="hidden md:block relative w-full rounded-2xl overflow-visible shadow-soft border border-primary-200/30 bg-white/90 p-4">
            <div className="relative w-full rounded-xl overflow-hidden">
              <Image
                src="/partypackage-backdrops.png"
                alt="Party Package Hexagon Layout"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>

            {/* Queen Bee - Top Left - honey gold */}
            <div className="absolute top-[32%] left-[7%] transform -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="text-white px-5 py-3 rounded-xl shadow-lg border-2 border-white min-w-[10rem] text-center ring-2 ring-[#CC9300]/50" style={{ backgroundColor: '#FFB900' }}>
                <h3 className="text-lg sm:text-xl font-bold leading-tight">Queen Bee</h3>
                <p className="text-xs sm:text-sm font-medium opacity-95">Premium Package</p>
              </div>
            </div>

            {/* Queen Bee Details Box */}
            <div className="absolute top-[32%] left-[34%] transform -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="text-charcoal-800 max-w-60 text-center">
                <p className="text-xl font-extrabold text-primary-600 mb-1">Private: $575</p>
                <p className="text-xl font-extrabold text-primary-600 mb-2">Semi-Private: $500</p>
                <p className="text-sm text-charcoal-600 mb-2 italic">Semi-Private: Exclusive party room, shared play area</p>
                <p className="text-base font-semibold text-charcoal-700 mb-2">2 hours</p>
                <p className="text-base font-medium text-charcoal-600 mb-2">15 kids included</p>
                <p className="text-base font-medium text-primary-500 mb-3">$15/additional kids</p>
                <div className="space-y-1">
                  <p className="text-base font-medium text-charcoal-700">✨ Play area access</p>
                  <p className="text-base font-medium text-charcoal-700">🎉 Exclusive party room</p>
                  <p className="text-base font-medium text-charcoal-700">🍽️ Paper goods included</p>
                  <p className="text-base font-medium text-charcoal-700">🍕 Pizza and soda included</p>
                  <p className="text-base font-medium text-charcoal-700">🎂 Sheet cake & decorations</p>
                </div>
              </div>
            </div>

            {/* Worker Bee - Middle Right - deeper gold */}
            <div className="absolute top-[52%] right-[4%] transform translate-x-1/2 -translate-y-1/2 z-20">
              <div className="text-white px-5 py-3 rounded-xl shadow-lg border-2 border-white min-w-[10rem] text-center ring-2 ring-[#B38000]/50" style={{ backgroundColor: '#E6A600' }}>
                <h3 className="text-lg sm:text-xl font-bold leading-tight">Worker Bee</h3>
                <p className="text-xs sm:text-sm font-medium opacity-95">Essential Package</p>
              </div>
            </div>

            {/* Worker Bee Details Box */}
            <div className="absolute top-[52%] right-[31%] transform translate-x-1/2 -translate-y-1/2 z-20">
              <div className="text-charcoal-800 max-w-60 text-center">
                <p className="text-xl font-extrabold text-honey-600 mb-1">Private: $525</p>
                <p className="text-xl font-extrabold text-honey-600 mb-2">Semi-Private: $450</p>
                <p className="text-sm text-charcoal-600 mb-2 italic">Semi-Private: Exclusive party room, shared play area</p>
                <p className="text-base font-semibold text-charcoal-700 mb-2">2 hours</p>
                <p className="text-base font-medium text-charcoal-600 mb-2">15 kids included</p>
                <p className="text-base font-medium text-honey-600 mb-3">$15/additional kids</p>
                <div className="space-y-1">
                  <p className="text-base font-medium text-charcoal-700">✨ Play area access</p>
                  <p className="text-base font-medium text-charcoal-700">🎉 Exclusive party room</p>
                  <p className="text-base font-medium text-charcoal-700">🍽️ Paper goods included</p>
                  <p className="text-base font-medium text-charcoal-700">🍕 Pizza and soda included</p>
                </div>
              </div>
            </div>

            {/* Basic Bee - Bottom Left */}
            <div className="absolute bottom-[29%] left-[7%] transform -translate-x-1/2 translate-y-1/2 z-20">
              <div className="bg-amber-500 text-charcoal-800 px-5 py-3 rounded-xl shadow-lg border-2 border-white min-w-[10rem] text-center ring-2 ring-amber-600/40">
                <h3 className="text-lg sm:text-xl font-bold leading-tight">Basic Bee</h3>
                <p className="text-xs sm:text-sm font-semibold">Standard Package</p>
              </div>
            </div>

            {/* Basic Bee Details Box */}
            <div className="absolute bottom-[28%] left-[34%] transform -translate-x-1/2 translate-y-1/2 z-20">
              <div className="text-charcoal-800 max-w-60 text-center">
                <p className="text-xl font-extrabold text-amber-600 mb-1">Private: $475</p>
                <p className="text-xl font-extrabold text-amber-600 mb-2">Semi-Private: $400</p>
                <p className="text-sm text-charcoal-600 mb-2 italic">Semi-Private: Exclusive party room, shared play area</p>
                <p className="text-base font-semibold text-charcoal-700 mb-2">2 hours</p>
                <p className="text-base font-medium text-charcoal-600 mb-2">15 kids included</p>
                <p className="text-base font-medium text-amber-600 mb-3">$15/additional kids</p>
                <div className="space-y-1">
                  <p className="text-base font-medium text-charcoal-700">✨ Play area access</p>
                  <p className="text-base font-medium text-charcoal-700">🎉 Exclusive party room</p>
                  <p className="text-base font-medium text-charcoal-700">🍽️ Paper goods included</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
