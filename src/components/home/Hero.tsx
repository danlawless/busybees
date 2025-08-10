'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Heart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const features = [
  {
    icon: Shield,
    text: 'Safe & Clean Environment'
  },
  {
    icon: Heart,
    text: 'Ages 0-6 Welcome'
  },
  {
    icon: Star,
    text: 'All-Day Fun'
  }
]

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20 sm:py-24">
      <HoneycombPattern className="opacity-5" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Main Hero Content */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="flex justify-center mb-6">
              <BeeIcon size="xl" animate />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Welcome to{' '}
              <span className="text-primary-600">Busy Bees</span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl font-medium text-neutral-700">
                Indoor Play Center
              </span>
            </h1>
          </motion.div>

          <motion.p 
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-lg sm:text-xl text-neutral-600 mb-8"
          >
            A modern, safe and engaging indoor play space for children ages 0-6. 
            Creating a go-to destination for families to play, socialize and celebrate.
          </motion.p>

          {/* Feature Pills */}
          <motion.div 
            variants={fadeInUp}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 shadow-soft"
                >
                  <Icon className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-neutral-700">{feature.text}</span>
                </div>
              )
            })}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button size="lg" className="min-w-48">
              Plan Your Visit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="min-w-48">
              Book a Party
            </Button>
          </motion.div>

          {/* Pricing Highlight */}
          <motion.div 
            variants={fadeInUp}
            className="mt-12 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-neutral-200 shadow-soft max-w-md mx-auto"
          >
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-600 mb-2">Daily Admission</p>
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-3xl font-bold text-primary-600">$15</span>
                <span className="text-lg text-neutral-600">per child (2+)</span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Infants under 2 play free with paid sibling
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 opacity-20">
        <BeeIcon size="lg" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-20">
        <BeeIcon size="md" />
      </div>
      <div className="absolute top-1/2 right-20 opacity-10">
        <BeeIcon size="xl" />
      </div>
    </section>
  )
}
