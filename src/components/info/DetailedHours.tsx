'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar, PartyPopper, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const weeklySchedule = [
  { day: 'Monday', hours: '10:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Tuesday', hours: '10:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Wednesday', hours: '10:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Thursday', hours: '10:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Friday', hours: '10:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Saturday', hours: '9:00 AM - 12:00 PM', type: 'open-play', additional: '1:00 PM - 6:00 PM (Parties Only)' },
  { day: 'Sunday', hours: '9:00 AM - 12:00 PM', type: 'open-play', additional: '1:00 PM - 6:00 PM (Parties Only)' }
]

const specialPrograms = [
  {
    icon: Calendar,
    title: 'Open Play Times',
    description: 'Drop-in play sessions where families can enjoy all play areas',
    schedule: 'Mon-Fri: 10AM-5PM | Sat-Sun: 9AM-12PM'
  },
  {
    icon: PartyPopper,
    title: 'Private Parties',
    description: 'Exclusive birthday parties and celebrations',
    schedule: 'Sat-Sun: 1PM-3PM or 4PM-6PM slots'
  }
]

export function DetailedHours() {
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  const currentDay = getCurrentDay()

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            <Clock className="w-8 h-8 inline mr-3 text-primary-500" />
            Hours & Schedule
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Plan your visit with our detailed schedule and special program times
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Weekly Schedule */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-neutral-100">
                  {weeklySchedule.map((schedule, index) => (
                    <div
                      key={index}
                      className={`p-4 transition-colors ${
                        schedule.day === currentDay 
                          ? 'bg-primary-50 border-l-4 border-primary-500' 
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-semibold ${
                            schedule.day === currentDay ? 'text-primary-700' : 'text-neutral-900'
                          }`}>
                            {schedule.day}
                            {schedule.day === currentDay && (
                              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                                Today
                              </span>
                            )}
                          </h4>
                          <p className="text-neutral-600 font-medium">{schedule.hours}</p>
                          {schedule.additional && (
                            <p className="text-sm text-neutral-500 mt-1">{schedule.additional}</p>
                          )}
                        </div>
                        <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded-full">
                          Open Play
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
            className="space-y-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {specialPrograms.map((program, index) => {
              const Icon = program.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-neutral-900 mb-2">{program.title}</h3>
                          <p className="text-neutral-600 mb-3">{program.description}</p>
                          <div className="bg-neutral-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-neutral-700">{program.schedule}</p>
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
              <Card className="border-accent-200 bg-accent-50">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-accent-900 mb-2">Important Notice</h4>
                      <p className="text-accent-800 text-sm">
                        Weekend afternoon slots (1PM-6PM) are reserved for private birthday parties. 
                        Please call ahead to confirm availability during these times.
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
