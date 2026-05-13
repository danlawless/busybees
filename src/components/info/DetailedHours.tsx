'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar, PartyPopper, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const weeklySchedule = [
  { day: 'Monday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Tuesday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Wednesday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Thursday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Friday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Saturday', hours: '9:00 AM - 12:30 PM', type: 'open-play', additional: 'Open Play' },
  { day: 'Saturday', hours: '1:00 PM - 3:00 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
  { day: 'Saturday', hours: '3:30 PM - 5:30 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
  { day: 'Sunday', hours: '9:00 AM - 12:30 PM', type: 'open-play', additional: 'Open Play' },
  { day: 'Sunday', hours: '1:00 PM - 3:00 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
  { day: 'Sunday', hours: '3:30 PM - 5:30 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' }
]

const specialPrograms = [
  {
    icon: Calendar,
    title: 'Open Play Times',
    description: 'Drop-in play sessions where families can enjoy all play areas',
    schedule: 'Mon-Fri: 9AM-5PM | Sat-Sun: 9AM-12:30PM'
  },
  {
    icon: PartyPopper,
    title: 'Private Party Bookings',
    description: 'Exclusive birthday parties and celebrations in 2-hour time slots',
    schedule: 'Sat-Sun: 1PM-3PM or 3:30PM-5:30PM (2-hour slots)'
  }
]

export function DetailedHours() {
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
              const Icon = program.icon
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
                        Weekends offer both Open Play (9AM-12:30PM) and Private Party Bookings (1PM-3PM and 3:30PM-5:30PM).
                        We have TWO 2-hour time slots available each weekend afternoon for birthday parties, allowing us to accommodate multiple celebrations each day. Please book in advance to secure your preferred time slot.
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
