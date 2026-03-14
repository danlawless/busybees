'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'

function getOpenStatus(): { isOpen: boolean; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  const isWeekend = day === 0 || day === 6;

  // Weekday: 9:00 AM - 5:00 PM (540 - 1020)
  if (isWeekday && time >= 540 && time < 1020) {
    return { isOpen: true, label: 'We Are Open for Public Play' };
  }

  // Weekend: 9:00 AM - 12:30 PM public play (540 - 750)
  if (isWeekend && time >= 540 && time < 750) {
    return { isOpen: true, label: 'We Are Open for Public Play' };
  }

  return { isOpen: false, label: 'We Are Currently Closed' };
}

export function InfoHero() {
  const status = getOpenStatus();

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

          {/* Photo strip */}
          <motion.div variants={fadeInUp} className="mt-12 max-w-4xl mx-auto">
            <div className="flex gap-2 sm:gap-3 justify-center">
              {['/album/MH_12587.jpg', '/album/MH_12648.jpg', '/album/MH_12697.jpg', '/album/MH_12743.jpg', '/album/MH_12801.jpg'].map((src, i) => (
                <div key={i} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shadow-soft border border-primary-200/40 flex-shrink-0">
                  <Image src={src} alt="" fill className="object-cover" sizes="80px" loading="lazy" />
                </div>
              ))}
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
