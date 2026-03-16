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
          className="relative max-w-4xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative w-full rounded-2xl overflow-hidden shadow-soft border border-primary-200/30 bg-white/90">
            <Image
              src="/party-packages.png"
              alt="Party Packages - Queen Bee $575, Worker Bee $525, Basic Bee $475 - all include 2 hours, access to play area, private party room, and more"
              width={1200}
              height={1500}
              className="w-full h-auto"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
