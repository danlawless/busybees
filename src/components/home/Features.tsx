'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Calendar, Coffee, Car, Shirt, Heart, Sparkles, Baby, PartyPopper, MapPin, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { HoneycombPattern } from '@/components/ui/BeeIcon'

const features = [
  {
    icon: Heart,
    title: 'Built by Parents, for Parents',
    description: 'We understand the challenges of entertaining little ones! Our space was designed by a family who knows exactly what you need for a perfect day out.',
    highlight: '💝 Family-First Design',
    color: 'from-pink-200 to-pink-300',
    bgColor: 'from-pink-50 to-pink-100'
  },
  {
    icon: Shield,
    title: 'Safety That Gives You Peace of Mind',
    description: 'Relax while your kids play! Our dedicated infant areas, soft surfaces, and secure environment let you actually enjoy watching them explore.',
    highlight: '🛡️ Parent-Approved Safety',
    color: 'from-green-200 to-green-300',
    bgColor: 'from-green-50 to-green-100'
  },
  {
    icon: Baby,
    title: 'Perfect for Every Age & Stage',
    description: 'From crawling babies to energetic 6-year-olds, every child finds their perfect play space. No more "too young" or "too old" worries!',
    highlight: '👶 Ages 0-6 Welcome',
    color: 'from-purple-200 to-purple-300',
    bgColor: 'from-purple-50 to-purple-100'
  },
  {
    icon: PartyPopper,
    title: 'Unforgettable Birthday Magic',
    description: 'Transform your child\'s special day into pure magic! Our private party room and expert staff handle everything so you can focus on making memories.',
    highlight: '🎂 Stress-Free Parties',
    color: 'from-yellow-200 to-yellow-300',
    bgColor: 'from-yellow-50 to-yellow-100'
  },
  {
    icon: Coffee,
    title: 'Parents Deserve Fun Too!',
    description: 'Grab a coffee, chat with other parents, or simply enjoy watching your little ones play. Our comfortable seating areas are designed for you to relax and recharge.',
    highlight: '☕ Adult-Friendly Space',
    color: 'from-amber-200 to-amber-300',
    bgColor: 'from-amber-50 to-amber-100'
  },
  {
    icon: Sparkles,
    title: 'Clean, Fresh & Always Ready',
    description: 'Walk into a spotless environment every single time. Our rigorous cleaning protocols and premium materials ensure a fresh, healthy play experience.',
    highlight: '✨ Hospital-Grade Clean',
    color: 'from-blue-200 to-blue-300',
    bgColor: 'from-blue-50 to-blue-100'
  }
]

export function Features() {
  return (
    <section className="relative py-20 section-hexagon-light hexagon-overlay overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />
      
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 sm:text-4xl mb-4">
            Why Families Love Busy Bees
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Every detail has been designed with your family's comfort, safety, and fun in mind
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full text-center group card-pastel">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-200 to-primary-300 hexagon-shape flex items-center justify-center mx-auto mb-6 group-hover:from-primary-300 group-hover:to-primary-400 transition-all duration-300">
                      <Icon className="w-8 h-8 text-charcoal-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-charcoal-800 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-charcoal-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
