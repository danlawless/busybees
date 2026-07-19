'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { getOpenStatus } from '@/lib/businessHours'

export function InfoHero() {
  // Compute in Eastern time against the live schedule (Summer Hours aware), and
  // refresh every minute so the badge flips at open/close without a reload.
  const [status, setStatus] = React.useState(() => getOpenStatus())
  React.useEffect(() => {
    const update = () => setStatus(getOpenStatus())
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-10 sm:py-14">
      <HoneycombPattern variant="medium" size="lg" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <motion.div
          className="text-center mb-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp}>
            <div className="flex justify-center mb-3">
              <div className="p-2.5 bg-primary-100 rounded-2xl">
                <Info className="w-6 h-6 text-primary-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-charcoal-800 sm:text-4xl mb-3">
              Everything You Need to Know
            </h1>
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto leading-relaxed">
              All the details about visiting Busy Bees Indoor Play Center
            </p>

            {/* Current Status */}
            <div className="mt-6">
              <div className={`inline-flex items-center space-x-3 backdrop-blur-sm px-7 py-3.5 rounded-full border shadow-soft ${
                status.isOpen
                  ? 'bg-white/80 border-green-300/40'
                  : 'bg-white/80 border-red-300/40'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  status.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className="font-bold text-charcoal-800">
                  {status.label} {status.isOpen ? '🎉' : ''}
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
