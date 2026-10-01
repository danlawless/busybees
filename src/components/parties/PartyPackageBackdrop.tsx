'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { PartyPackageCards } from '@/components/parties/PartyPackageCards'

/**
 * The packages section of /parties: the same cards as the homepage, read from
 * the pricing catalog, so prices here can never go stale the way the old
 * overview image did. Choosing a package starts booking.
 */
export function PartyPackageBackdrop({ onChoose }: { onChoose: () => void }) {
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

        <div className="mb-4">
          <PartyPackageCards onChoose={onChoose} />
        </div>
      </div>
    </section>
  )
}
