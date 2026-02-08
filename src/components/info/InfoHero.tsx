'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'

export function InfoHero() {
  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-24">
      <HoneycombPattern variant="medium" size="lg" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp}>
            <div className="flex justify-center mb-5">
              <div className="p-3.5 bg-primary-100 rounded-2xl">
                <Info className="w-8 h-8 text-primary-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl mb-5">
              Everything You Need to Know
            </h1>
            <p className="text-xl text-charcoal-600 max-w-2xl mx-auto leading-relaxed">
              All the details about visiting Busy Bees Indoor Play Center
            </p>

            {/* Current Status */}
            <div className="mt-10">
              <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-7 py-3.5 rounded-full border border-primary-300/40 shadow-soft">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-bold text-charcoal-800">
                  We're Open! 🎉
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Bees */}
      <div className="absolute top-10 left-10 opacity-15">
        <BeeIcon size="md" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-15">
        <BeeIcon size="lg" />
      </div>
    </section>
  )
}
