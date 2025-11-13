'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Users, CreditCard, Gift, Star, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatPrice, fadeInUp, staggerContainer } from '@/lib/utils'

const admissionPricing = [
  {
    category: 'General Admission (Ages 2+)',
    price: 17,
    description: 'All day access for children ages 2+',
    features: ['All-day access to play areas', 'Age-appropriate zones (2-6 years)', 'Safe, clean environment', 'No time limits']
  },
  {
    category: 'Infants (Under 2)',
    price: 7,
    description: 'Special pricing for our littlest visitors',
    features: ['Access to infant-safe areas', 'Free with paid sibling admission', 'Dedicated infant play space', 'Parent supervision required'],
    highlight: 'Free with sibling'
  }
]

const membershipOptions = [
  {
    title: '10-Visit Punch Card (Toddler)',
    price: 150,
    description: 'Bulk purchase convenience',
    features: [
      '10 visits at $15 each',
      'Never expires',
      'Transferable to family/friends',
      'All daily pass benefits'
    ],
    popular: false
  },
  {
    title: '10-Visit Punch Card (Infant)',
    price: 50,
    description: 'Save with bulk visits',
    features: [
      '10 visits at $5 each',
      'Never expires',
      'Transferable to family/friends'
    ],
    popular: false
  },
  {
    title: 'Monthly Membership (Toddler)',
    price: 115,
    description: 'Best value for regular families',
    features: [
      'Unlimited visits for 1 child',
      '10% off birthday bookings',
      '10% off all classes (Mommy & Me, Story Time, Kids Yoga & more)',
      'Member exclusive events',
      '10% off second child ($103.50)',
      '20% off third child ($92)'
    ],
    popular: true
  },
  {
    title: 'Monthly Membership (Infant)',
    price: 80,
    description: 'Perfect for regular infant visitors',
    features: [
      'Unlimited visits for 1 infant',
      'Access to infant-safe areas',
      'Perfect for regular visitors',
      'Member exclusive events'
    ],
    popular: false
  }
]

const additionalServices = [
  {
    icon: Gift,
    title: 'Birthday Pass',
    description: 'Free admission on your child\'s birthday',
    price: 'FREE',
    note: 'Valid with ID, one per child per year'
  },
  {
    icon: Users,
    title: 'Group Rates',
    description: 'Homeschool & daycare groups (10+ children)',
    price: 'Contact us',
    note: 'Special pricing available'
  }
]

export function PricingDetails() {
  return (
    <section className="py-16 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            <DollarSign className="w-8 h-8 inline mr-3 text-primary-500" />
            Complete Pricing Guide
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Transparent pricing with options for every family's needs
          </p>
        </motion.div>

        {/* Daily Admission */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">Daily Admission</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {admissionPricing.map((pricing, index) => (
              <Card key={index} className={pricing.highlight ? 'ring-2 ring-secondary-500' : ''}>
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{pricing.category}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-primary-600">
                      Coming Soon
                    </span>
                    {pricing.highlight && (
                      <div className="mt-2">
                        <span className="bg-secondary-100 text-secondary-700 px-3 py-1 rounded-full text-sm font-medium">
                          {pricing.highlight}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-neutral-600 mt-2">{pricing.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {pricing.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-neutral-600">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Membership Options */}
        <motion.div
          className="mb-12"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
            Memberships & Packages
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {membershipOptions.map((option, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className={`h-full relative ${option.popular ? 'ring-2 ring-primary-500 shadow-large' : ''}`}>
                  {option.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                        <Star className="w-4 h-4 mr-1" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{option.title}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-primary-600">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-neutral-600 mt-2">{option.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-3 mb-6">
                      {option.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start text-sm text-neutral-600">
                          <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={option.popular ? 'primary' : 'outline'}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
