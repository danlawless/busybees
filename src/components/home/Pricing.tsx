'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Gift } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatPrice, fadeInUp, staggerContainer } from '@/lib/utils'

const pricingPlans = [
  {
    name: 'Daily Pass',
    price: 15,
    description: 'Perfect for occasional visits',
    features: [
      'All-day access to play areas',
      'Age-appropriate zones',
      'Free for infants under 2 with paid sibling'
    ],
    popular: false,
    cta: 'Visit Today'
  },
  {
    name: 'Monthly Membership',
    price: 75,
    description: 'Best value for regular families',
    features: [
      'Unlimited visits all month',
      'Priority party booking',
      'Member-only events',
      '10% off snacks and drinks',
      'Free guest passes (2 per month)'
    ],
    popular: true,
    cta: 'Join Now'
  },
  {
    name: '10-Visit Punch Card',
    price: 130,
    description: 'Save $20 with bulk visits',
    features: [
      '10 visits for $13 each',
      'Never expires',
      'Transferable to family/friends',
      'All daily pass benefits'
    ],
    popular: false,
    cta: 'Buy Card'
  }
]

const partyPackages = [
  {
    name: 'Private Party',
    price: 425,
    duration: '2 hours',
    includes: '15 kids included',
    additional: '$12 per additional child',
    features: [
      'Exclusive use of party room',
      'Dedicated party host',
      'Tables, chairs, and decorations',
      'Paper goods provided',
      'Access to full play area'
    ]
  },
  {
    name: 'Semi-Private Party',
    price: 350,
    duration: '2 hours',
    includes: '15 kids included',
    additional: '$12 per additional child',
    features: [
      'Reserved party area',
      'Dedicated party host',
      'Tables, chairs, and decorations',
      'Paper goods provided',
      'Shared play area access'
    ]
  }
]

export function Pricing() {
  return (
    <section className="py-20 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* General Admission */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            Simple, Fair Pricing
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Choose the option that works best for your family
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {pricingPlans.map((plan, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className={`h-full relative ${plan.popular ? 'ring-2 ring-primary-500 shadow-large' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-primary-600">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-neutral-600 ml-2">
                      {plan.name.includes('Monthly') ? '/month' : ''}
                    </span>
                  </div>
                  <p className="text-neutral-600 mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-secondary-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-neutral-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'primary' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Party Packages */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            <Gift className="w-8 h-8 inline mr-3 text-primary-500" />
            Birthday Party Packages
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Make your child's special day unforgettable with our party packages
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {partyPackages.map((pkg, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-primary-600">{pkg.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-neutral-900">
                      {formatPrice(pkg.price)}
                    </span>
                  </div>
                  <div className="text-neutral-600 mt-2">
                    <p>{pkg.duration} • {pkg.includes}</p>
                    <p className="text-sm">{pkg.additional}</p>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-secondary-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-neutral-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="secondary">
                    Book This Package
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
