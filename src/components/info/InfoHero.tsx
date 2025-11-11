'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'

export function InfoHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-honey-50 via-primary-50 to-charcoal-50 py-16 sm:py-20">
      <HoneycombPattern variant="medium" size="lg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp}>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary-100 rounded-2xl">
                <Info className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl mb-4">
              Everything You Need to Know
            </h1>
            <p className="text-xl text-charcoal-600 max-w-2xl mx-auto">
              All the details about visiting Busy Bees Indoor Play Center
            </p>
            
            {/* Current Status */}
            <div className="mt-8">
              <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-honey-100 to-yellow-100 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-honey-300 shadow-lg">
                <div className="w-3 h-3 rounded-full bg-honey-500 animate-pulse"></div>
                <span className="font-bold text-charcoal-800">
                  Opening in January 2025! 🎉
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Bees */}
      <div className="absolute top-10 left-10 opacity-20">
        <BeeIcon size="md" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-20">
        <BeeIcon size="lg" />
      </div>
    </section>
  )
}
