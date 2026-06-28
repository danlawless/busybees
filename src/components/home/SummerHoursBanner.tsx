'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { SUMMER_HOURS_START_LABEL } from '@/lib/businessHours'

/**
 * Homepage Summer Hours notice — a copy of the Summer Hours card on the About
 * page (DetailedHours). Always shown on the home page.
 */
export function SummerHoursBanner() {
  return (
    <section className="bg-[#FFF8E7] px-6 py-12 sm:px-8 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl rounded-2xl border-2 border-purple-300 bg-purple-50/70 p-6 shadow-soft"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
            <Sparkles className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h3 className="mb-1 text-lg font-bold text-purple-900">
              Summer Hours start {SUMMER_HOURS_START_LABEL}
            </h3>
            <p className="text-sm leading-relaxed text-charcoal-700 sm:text-base">
              Starting <strong>{SUMMER_HOURS_START_LABEL}</strong> through August 30, our schedule
              shifts to <strong>Mon–Fri 9 AM – 3 PM</strong> and <strong>Sat–Sun 8 AM – 4 PM</strong>.
              Weekend birthday parties move to a single <strong>Semi-Private 1:00 PM – 4:00 PM</strong> slot.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
