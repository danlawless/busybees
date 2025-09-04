'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Gift, Users, Ticket, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PlayfulDecorations } from '@/components/ui/PlayfulDecorations'
import { formatPrice, fadeInUp, staggerContainer } from '@/lib/utils'

const pricingPlans = [
  {
    name: 'General Admission (Ages 2+)',
    price: 17,
    description: 'All day access for children ages 2+',
    features: [
      'All-day access to play areas',
      'Age-appropriate zones (2-6 years)',
      'Safe, clean environment',
      'No time limits'
    ],
    popular: false,
    cta: 'Visit Today',
    icon: Ticket
  },
  {
    name: 'Infants (Under 2)',
    price: 7,
    description: 'Special pricing for our littlest visitors',
    features: [
      'Access to infant-safe areas',
      'Free with paid sibling admission',
      'Dedicated infant play space',
      'Parent supervision required'
    ],
    popular: false,
    cta: 'Bring Baby',
    icon: Users
  },
  {
    name: 'Monthly Membership',
    price: 100,
    description: 'Best value for regular families',
    features: [
      'Unlimited visits for 1 child',
      '10% off birthday bookings',
      '10% off classes',
      'Member exclusive events',
      '20% off second child ($80)',
      '30% off third child ($70)'
    ],
    popular: true,
    cta: 'Join Now',
    icon: Star
  },
  {
    name: '10-Visit Punch Card',
    price: 150,
    originalPrice: 170,
    description: 'Save $20 with bulk visits',
    features: [
      '10 visits at $15 each (save $20)',
      'Never expires',
      'Transferable to family/friends',
      'All daily pass benefits'
    ],
    popular: false,
    cta: 'Buy Card',
    icon: CreditCard
  }
]

const specialRates = [
  {
    name: 'Group Rates',
    price: 15,
    description: 'Special pricing for large groups',
    features: [
      '10+ children eligibility',
      '$15 per child',
      'Perfect for daycares & schools',
      'Advanced booking required'
    ],
    icon: Users
  }
]

const partyPackages = [
  {
    name: 'Private Party',
    price: 'TBD',
    duration: '2 hours',
    includes: 'Full venue exclusivity',
    features: [
      'Exclusive use of entire venue',
      'Dedicated party host',
      'Tables, chairs, and decorations',
      'Paper goods provided',
      'Access to full play area',
      'Party setup and cleanup'
    ]
  },
  {
    name: 'Semi-Private Party',
    price: 'TBD', 
    duration: '2 hours',
    includes: 'Reserved party area',
    features: [
      'Reserved party room',
      'Dedicated party host',
      'Tables, chairs, and decorations',
      'Paper goods provided',
      'Shared play area access',
      'Party setup and cleanup'
    ]
  }
]

export function Pricing() {
  return (
    <section className="relative py-20 bg-neutral-50 overflow-hidden">
      {/* Playful Bee Pricing Decorations */}
      <PlayfulDecorations variant="pricing" density="light" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        {/* General Admission */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            Services & Pricing
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Choose the option that works best for your family
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {pricingPlans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div key={index} variants={fadeInUp}>
                <Card className={`h-full relative flex flex-col ${plan.popular ? 'ring-2 ring-primary-500 shadow-large' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                        <Star className="w-4 h-4 mr-1" />
                        Most Popular
                      </div>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <div className="text-2xl font-bold text-primary-600">
                        Coming Soon
                      </div>
                      {plan.originalPrice && (
                        <div className="text-sm text-neutral-500 line-through">
                          ${plan.originalPrice}
                        </div>
                      )}
                    </div>
                    <p className="text-neutral-600 mt-2 text-sm">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <Check className="w-4 h-4 text-secondary-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-neutral-600 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full mt-auto" 
                      variant={plan.popular ? 'primary' : 'outline'}
                      size="sm"
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Special Rates */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 text-center mb-8">
            Special Rates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {specialRates.map((rate, index) => {
              const Icon = rate.icon
              return (
                <motion.div key={index} variants={fadeInUp} className="h-full">
                  <Card className="text-center h-full flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-secondary-600" />
                      </div>
                      <CardTitle className="text-xl">{rate.name}</CardTitle>
                      <div className="mt-4">
                        <div className="text-3xl font-bold text-secondary-600">
                          Coming Soon
                        </div>
                      </div>
                      <p className="text-neutral-600 mt-2">{rate.description}</p>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col">
                      <ul className="space-y-2 mb-6 flex-1">
                        {rate.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <Check className="w-4 h-4 text-secondary-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-neutral-600 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full" variant="secondary">
                        Contact Us
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Party Packages */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-4">
            <Gift className="w-6 h-6 inline mr-2 text-primary-500" />
            Birthday Party Packages
          </h3>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Make your child's special day unforgettable with our party packages
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {partyPackages.map((pkg, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="h-full flex flex-col">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl text-primary-600">{pkg.name}</CardTitle>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-primary-600">
                      Coming Soon
                    </div>
                  </div>
                  <div className="text-neutral-600 mt-2">
                    <p className="font-medium">{pkg.duration} • {pkg.includes}</p>
                    <p className="text-sm text-neutral-500 mt-1">Pricing details available soon</p>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {pkg.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-4 h-4 text-secondary-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-neutral-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-auto" variant="secondary">
                    Book This Package
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Important Info */}
        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 text-center mb-6">
            Important Information
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="w-5 h-5 text-primary-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-neutral-900">Cash-Free Business</h4>
                  <p className="text-neutral-600 text-sm">We accept all major credit and debit cards</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary-500 text-lg mt-0.5">🧦</span>
                <div>
                  <h4 className="font-semibold text-neutral-900">Socks Required</h4>
                  <p className="text-neutral-600 text-sm">Don't worry if you forget - we sell branded socks!</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary-500 text-lg mt-0.5">📅</span>
                <div>
                  <h4 className="font-semibold text-neutral-900">No Reservations Required</h4>
                  <p className="text-neutral-600 text-sm">Just drop in and start playing!</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-primary-500 text-lg mt-0.5">🥪</span>
                <div>
                  <h4 className="font-semibold text-neutral-900">Outside Food Welcome</h4>
                  <p className="text-neutral-600 text-sm">Enjoy your own food in our café area. We also sell healthy snacks!</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary-500 text-lg mt-0.5">📱</span>
                <div>
                  <h4 className="font-semibold text-neutral-900">Stay Connected</h4>
                  <p className="text-neutral-600 text-sm">Follow us on social media or sign up for our newsletter</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
