'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { isSummerHoursActive } from '@/lib/businessHours'

/**
 * Heads-up notice shown on the parties page during Summer Hours so customers
 * understand the slot format before they book.
 */
export function SummerPartyNotice() {
  if (!isSummerHoursActive()) return null

  return (
    <section className="bg-[#FFF8E7]/70 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border-2 border-purple-300 bg-purple-50/70 p-6 shadow-soft"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
              <Sparkles className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-bold text-purple-900">
                Summer Party Slots are Semi-Private
              </h3>
              <p className="text-sm leading-relaxed text-charcoal-700 sm:text-base">
                From <strong>June 29 – August 30, 2026</strong>, our weekend birthday slot is a
                <strong> Semi-Private</strong> party from <strong>1:00 PM – 4:00 PM</strong> on Saturdays
                and Sundays. Your party room is <strong>exclusively yours</strong> for the full 3 hours,
                while the play area remains open to other families. That&apos;s an
                <strong> extra hour</strong> compared to our standard 2-hour private slots.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
