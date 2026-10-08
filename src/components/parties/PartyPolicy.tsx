'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, Mail } from 'lucide-react'
import {
  PARTY_POLICY_INTRO,
  PARTY_POLICY_SECTIONS,
  PARTY_POLICY_TITLE,
} from '@/lib/parties/cancellationPolicy'

/**
 * The cancellation & rescheduling policy at the foot of /parties, below the
 * packages, so families see it before they book. Same text as the
 * confirmation email (lib/parties/cancellationPolicy).
 */
export function PartyPolicy() {
  return (
    <section id="party-policy" className="py-16 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 sm:p-8 shadow-soft"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <CalendarClock className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-charcoal-800 sm:text-3xl">
                {PARTY_POLICY_TITLE}
              </h2>
              <p className="mt-2 text-base text-charcoal-600">{PARTY_POLICY_INTRO}</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {PARTY_POLICY_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="mb-2 text-lg font-semibold text-charcoal-800">{section.heading}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-2 text-sm leading-relaxed text-charcoal-700 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <p className="mt-6 flex items-center gap-2 text-sm text-charcoal-700 sm:text-base">
            <Mail className="h-4 w-4 flex-shrink-0 text-amber-700" />
            <span>
              To cancel or reschedule, email{' '}
              <a href="mailto:info@busybeesipc.com" className="font-semibold text-amber-800 underline">
                info@busybeesipc.com
              </a>
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
