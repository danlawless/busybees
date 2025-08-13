'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Heart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { BeeIcon, HoneycombPattern, FloatingHoneycombs } from '@/components/ui/BeeIcon'
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
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-24">
      <HoneycombPattern variant="dense" size="xl" />
      <FloatingHoneycombs />
      
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
              <Logo size="xl" animate={true} showText={false} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl">
              <span className="text-honey-600">Busy Bees</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-medium text-charcoal-700">
                Indoor Play Center
              </span>
            </h1>
          </motion.div>

          <motion.p 
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-600 mb-8"
          >
            A modern, safe and engaging indoor play space for children ages 0-6 with distinct areas for infants, toddlers and young children. Our mission is to create a go-to destination for families to play, socialize and celebrate.
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
                  className="flex items-center space-x-2 card-pastel px-4 py-2 rounded-full shadow-soft pulse-honey"
                >
                  <Icon className="w-4 h-4 text-honey-600" />
                  <span className="text-sm font-medium text-charcoal-800">{feature.text}</span>
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
            className="mt-12 space-y-6 max-w-4xl mx-auto"
          >
            {/* Main Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-6 card-pastel rounded-2xl shadow-soft text-center">
                <p className="text-sm font-medium text-charcoal-600 mb-2">Daily Admission</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-2xl font-bold text-honey-gradient">$15</span>
                  <span className="text-sm text-charcoal-600">ages 2+</span>
                </div>
                <p className="text-xs text-charcoal-500 mt-1">
                  Infants under 2: $5
                </p>
              </div>
              
              <div className="p-6 card-pastel rounded-2xl shadow-soft text-center border-2 border-honey-300">
                <p className="text-sm font-medium text-charcoal-600 mb-2">Monthly Membership</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-2xl font-bold text-honey-gradient">$75</span>
                  <span className="text-sm text-charcoal-600">/month</span>
                </div>
                <p className="text-xs text-charcoal-500 mt-1">
                  Unlimited visits
                </p>
              </div>
              
              <div className="p-6 card-pastel rounded-2xl shadow-soft text-center">
                <p className="text-sm font-medium text-charcoal-600 mb-2">10-Visit Punch Card</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-2xl font-bold text-honey-gradient">$130</span>
                  <span className="text-sm text-charcoal-600">saves $20</span>
                </div>
                <p className="text-xs text-charcoal-500 mt-1">
                  $13 per visit
                </p>
              </div>
            </div>
            
            {/* Important Info */}
            <motion.div 
              variants={fadeInUp}
              className="mt-8 p-6 card-pastel rounded-2xl shadow-soft max-w-3xl mx-auto"
            >
              <h3 className="text-lg font-semibold text-charcoal-800 mb-4 text-center">
                Good to Know
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-charcoal-600">
                <div className="flex items-start space-x-2">
                  <span className="text-honey-600">💳</span>
                  <span>Cash-free business - all major cards accepted</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-honey-600">🧦</span>
                  <span>Socks required (we sell them if you forget!)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-honey-600">📅</span>
                  <span>No reservations required - just drop in!</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-honey-600">🥪</span>
                  <span>Outside food welcome in our café area</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 opacity-15">
        <Logo size="md" showText={false} animate={true} />
      </div>
      <div className="absolute bottom-20 right-10 opacity-20">
        <BeeIcon size="md" />
      </div>
      <div className="absolute top-1/2 right-20 opacity-10">
        <Logo size="lg" showText={false} animate={true} />
      </div>
    </section>
  )
}
