'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Calendar, Coffee, Car, Shirt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { HoneycombPattern } from '@/components/ui/BeeIcon'

const features = [
  {
    icon: Shield,
    title: 'Safe & Clean',
    description: 'Dedicated infant area, soft flooring, and cleanable surfaces for maximum safety'
  },
  {
    icon: Users,
    title: 'Age-Appropriate Zones',
    description: 'Separate areas for infants (0-2) and active play for toddlers and children (2-6)'
  },
  {
    icon: Calendar,
    title: 'Private Party Room',
    description: 'Bookable party space for birthdays and special celebrations'
  },
  {
    icon: Coffee,
    title: 'Designated Eating Area',
    description: 'Comfortable lounge space with snacks and drinks available for purchase'
  },
  {
    icon: Car,
    title: 'Ample Parking',
    description: 'Convenient parking spaces for easy access with families'
  },
  {
    icon: Shirt,
    title: 'Shoe-Free Play',
    description: 'Cubbies for shoes and hooks for coats, with grip socks available for purchase'
  }
]

export function Features() {
  return (
    <section className="relative py-20 section-hexagon-light hexagon-overlay overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                    <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-6 group-hover:from-honey-300 group-hover:to-honey-400 transition-all duration-300 hexagon-pulse">
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
