'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, Phone, Info } from 'lucide-react'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer, isOpen, getBusinessHours } from '@/lib/utils'

const quickInfo = [
  {
    icon: Clock,
    title: 'Hours',
    content: 'Mon-Fri: 10AM-5PM\nSat-Sun: 9AM-12PM',
    subtext: 'Open Play Times'
  },
  {
    icon: MapPin,
    title: 'Location',
    content: '380-432 John Fitch Highway',
    subtext: 'Suite A-190 & A-200'
  },
  {
    icon: Phone,
    title: 'Contact',
    content: '(123) 456-7890',
    subtext: 'Call for parties & info'
  }
]

export function InfoHero() {
  const businessOpen = isOpen()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary-50 via-white to-primary-50 py-16 sm:py-20">
      <HoneycombPattern className="opacity-5" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary-100 rounded-2xl">
                <Info className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl mb-4">
              Everything You Need to Know
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              All the details about visiting Busy Bees Indoor Play Center
            </p>
          </motion.div>

          {/* Quick Info Cards */}
          <motion.div 
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {quickInfo.map((info, index) => {
              const Icon = info.icon
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">{info.title}</h3>
                    <p className="text-neutral-700 font-medium whitespace-pre-line">{info.content}</p>
                    <p className="text-sm text-neutral-500 mt-1">{info.subtext}</p>
                  </CardContent>
                </Card>
              )
            })}
          </motion.div>

          {/* Current Status */}
          <motion.div variants={fadeInUp} className="mt-8">
            <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-neutral-200 shadow-soft">
              <div className={`w-3 h-3 rounded-full ${businessOpen ? 'bg-secondary-500' : 'bg-neutral-400'}`}></div>
              <span className="font-medium text-neutral-900">
                We're currently {businessOpen ? 'OPEN' : 'CLOSED'}
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-600">{getBusinessHours()}</span>
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
