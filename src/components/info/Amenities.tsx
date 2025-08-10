'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Baby, 
  Play, 
  Coffee, 
  PartyPopper, 
  Car, 
  Shirt, 
  Shield, 
  Volume2,
  Utensils,
  Heart,
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const playAreas = [
  {
    icon: Baby,
    title: 'Infant Play Area (0-2 years)',
    description: 'Dedicated safe space for our youngest visitors',
    features: [
      'Gated area for safety',
      'Soft play structures',
      'Sensory toys and activities',
      'Age-appropriate climbing equipment',
      'Quiet space for feeding and changing'
    ],
    color: 'bg-secondary-100 text-secondary-600'
  },
  {
    icon: Play,
    title: 'Main Play Area (2-6 years)',
    description: 'Adventure playground for active toddlers and children',
    features: [
      'Large CedarWorks play structure',
      'Indoor swing set',
      'Train table with accessories',
      'Climbing structures and slides',
      'Interactive play panels'
    ],
    color: 'bg-primary-100 text-primary-600'
  },
  {
    icon: Coffee,
    title: 'Designated Eating Area',
    description: 'Comfortable space for families to relax and refuel',
    features: [
      'Tables and seating for families',
      'High chairs available',
      'Snack bar with healthy options',
      'Drinks and refreshments',
      'Clean, comfortable environment'
    ],
    color: 'bg-accent-100 text-accent-600'
  },
  {
    icon: PartyPopper,
    title: 'Private Party Room',
    description: 'Exclusive space for birthday celebrations',
    features: [
      'Seats up to 25 guests',
      'Tables, chairs, and decorations',
      'Private entrance to play area',
      'Dedicated party host',
      'Sound system for music'
    ],
    color: 'bg-pink-100 text-pink-600'
  }
]

const amenities = [
  {
    icon: Car,
    title: 'Ample Parking',
    description: 'Convenient parking spaces for easy family access'
  },
  {
    icon: Shirt,
    title: 'Shoe Storage',
    description: 'Cubbies for shoes and hooks for coats and bags'
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Soft flooring, cleanable surfaces, and safety gates'
  },
  {
    icon: Volume2,
    title: 'Sound System',
    description: 'Integrated speakers for ambient music and announcements'
  },
  {
    icon: Utensils,
    title: 'Snack Bar',
    description: 'Healthy snacks, drinks, and treats available for purchase'
  },
  {
    icon: Sparkles,
    title: 'Grip Socks',
    description: 'Non-slip socks available for purchase for safer play'
  }
]

const specialFeatures = [
  {
    title: 'Bee-Themed Decor',
    description: 'Educational bee facts and pollinator track throughout the space'
  },
  {
    title: 'Queen Bee Experience',
    description: 'Special birthday child gets crown, cloak, and honeycomb staff'
  },
  {
    title: 'Climate Controlled',
    description: 'Comfortable temperature year-round with high ceilings'
  },
  {
    title: 'Easy Cleanup',
    description: 'All surfaces designed for quick and thorough sanitization'
  }
]

export function Amenities() {
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
            <Home className="w-8 h-8 inline mr-3 text-primary-500" />
            Our Facilities & Amenities
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Every detail designed for safe, fun, and comfortable family experiences
          </p>
        </motion.div>

        {/* Play Areas */}
        <motion.div
          className="mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">Play Areas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {playAreas.map((area, index) => {
              const Icon = area.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${area.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-neutral-900 mb-2">{area.title}</h4>
                          <p className="text-neutral-600 mb-4">{area.description}</p>
                          <ul className="space-y-2">
                            {area.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-start text-sm text-neutral-600">
                                <Heart className="w-3 h-3 text-primary-500 mr-2 mt-1 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* General Amenities */}
        <motion.div
          className="mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">Additional Amenities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((amenity, index) => {
              const Icon = amenity.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="text-center h-full">
                    <CardContent className="p-6">
                      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-8 h-8 text-primary-600" />
                      </div>
                      <h4 className="font-semibold text-neutral-900 mb-2">{amenity.title}</h4>
                      <p className="text-neutral-600 text-sm">{amenity.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Special Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">Special Features</h3>
          <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specialFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h5 className="font-semibold text-neutral-900 mb-1">{feature.title}</h5>
                      <p className="text-neutral-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Facility Stats */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-neutral-900 text-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary-400 mb-2">4,000+</div>
                  <div className="text-sm text-neutral-300">Square Feet</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-400 mb-2">2</div>
                  <div className="text-sm text-neutral-300">Age Groups</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-400 mb-2">4</div>
                  <div className="text-sm text-neutral-300">Play Zones</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-400 mb-2">100%</div>
                  <div className="text-sm text-neutral-300">Safe & Clean</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
