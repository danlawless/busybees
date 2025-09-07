'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Users, Ticket } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
    cta: 'Coming Soon',
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
    cta: 'Coming Soon',
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
    cta: 'Coming Soon',
    icon: Star
  },
  {
    name: '10-Visit Punch Card',
    price: 150,
    originalPrice: 170,
    description: 'Save $20 with bulk visits',
    features: [
      '10 visits at $15 each (save $20)',
      'One punch per child per visit',
      'Never expires',
      'Transferable to family/friends',
      'All daily pass benefits'
    ],
    popular: false,
    cta: 'Coming Soon',
    icon: Ticket
  }
]



export function Pricing() {
  return (
    <section className="relative py-20 bg-neutral-50 overflow-hidden">
      
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

      </div>
    </section>
  )
}
