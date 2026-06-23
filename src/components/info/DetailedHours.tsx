'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar, PartyPopper, AlertCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import {
  getWeeklySchedule,
  getSpecialPrograms,
  getHoursNotice,
  isSummerHoursUpcoming,
  SUMMER_HOURS_START_LABEL,
} from '@/lib/businessHours'

const PROGRAM_ICONS = {
  calendar: Calendar,
  party: PartyPopper,
} as const

export function DetailedHours() {
  const weeklySchedule = getWeeklySchedule()
  const specialPrograms = getSpecialPrograms()
  const noticeText = getHoursNotice()
  const showSummerLeadIn = isSummerHoursUpcoming()
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  const currentDay = getCurrentDay()

  return (
    <section className="py-12 sm:py-16 bg-[#FFF8E7]">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 sm:text-4xl mb-4">
            <Clock className="w-8 h-8 inline mr-3 text-primary-500" />
            Hours & Schedule
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Plan your visit with our detailed schedule and special program times
          </p>
        </motion.div>

        {showSummerLeadIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-12 max-w-3xl rounded-2xl border-2 border-purple-300 bg-purple-50/70 p-6 shadow-soft"
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
                  Weekend birthday parties move to a single <strong>Semi-Private 1:00 PM – 4:00 PM</strong> slot
                  — the party room is exclusively yours while the play area remains open to other families.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* Weekly Schedule */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-primary-100/50">
                  {weeklySchedule.map((schedule, index) => (
                    <div
                      key={index}
                      className={`p-4 transition-colors ${
                        schedule.day === currentDay
                          ? 'bg-primary-100/40 border-l-4 border-primary-500'
                          : 'hover:bg-primary-50/30'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-semibold ${
                            schedule.day === currentDay ? 'text-primary-600' : 'text-charcoal-800'
                          }`}>
                            {schedule.day}
                            {schedule.day === currentDay && (
                              <span className="ml-2 text-xs bg-primary-200/60 text-primary-700 px-2.5 py-1 rounded-full">
                                Today
                              </span>
                            )}
                          </h4>
                          <p className="text-charcoal-600 font-medium">{schedule.hours}</p>
                          {schedule.additional && (
                            <p className="text-sm text-charcoal-500 mt-1">{schedule.additional}</p>
                          )}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          schedule.type === 'open-play'
                            ? 'bg-[#A8E6CF]/30 text-green-800'
                            : 'bg-primary-100 text-primary-700'
                        }`}>
                          {schedule.type === 'open-play' ? 'Open Play' : 'Private Bookings'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Special Programs */}
          <motion.div
            className="space-y-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {specialPrograms.map((program, index) => {
              const Icon = PROGRAM_ICONS[program.iconKey]
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="rounded-3xl">
                    <CardContent className="p-7">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-7 h-7 text-primary-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-charcoal-800 mb-2">{program.title}</h3>
                          <p className="text-charcoal-600 mb-4">{program.description}</p>
                          <div className="bg-primary-50/50 rounded-2xl p-4">
                            <p className="text-sm font-medium text-charcoal-700">{program.schedule}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}

            {/* Important Notice */}
            <motion.div variants={fadeInUp}>
              <Card className="border-[#FFB3BA]/30 bg-[#FFB3BA]/10 rounded-3xl">
                <CardContent className="p-7">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-5 h-5 text-[#e57380] mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-charcoal-800 mb-2">Important Notice</h4>
                      <p className="text-charcoal-700 text-sm leading-relaxed">
                        {noticeText}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
