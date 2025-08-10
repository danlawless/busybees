'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Users, CreditCard, Gift, Star, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatPrice, fadeInUp, staggerContainer } from '@/lib/utils'

const admissionPricing = [
  {
    category: 'Children (2+ years)',
    price: 15,
    description: 'All-day access to all play areas',
    features: ['Unlimited play time', 'Access to all zones', 'Clean, safe environment']
  },
  {
    category: 'Infants (Under 2)',
    price: 5,
    description: 'Dedicated infant play area',
    features: ['Soft play area', 'Sensory toys', 'FREE with paid sibling'],
    highlight: 'Free with sibling'
  }
]

const membershipOptions = [
  {
    title: '10-Visit Punch Card',
    price: 130,
    savings: 20,
    description: 'Perfect for regular visitors',
    features: [
      '$13 per visit (save $2 each time)',
      'Never expires',
      'Transferable to family/friends',
      'All daily admission benefits'
    ],
    popular: false
  },
  {
    title: 'Monthly Membership',
    price: 75,
    description: 'Unlimited fun for active families',
    features: [
      'Unlimited visits all month',
      'Priority party booking',
      'Member-only special events',
      '10% discount on snacks',
      '2 free guest passes per month'
    ],
    popular: true
  },
  {
    title: 'Summer Special',
    price: 150,
    originalPrice: 225,
    description: '3-month pass (June, July, August)',
    features: [
      'Unlimited summer visits',
      'Beat the heat indoors',
      'Save $75 over monthly rates',
      'All membership benefits'
    ],
    seasonal: true
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
                      {formatPrice(pricing.price)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  {option.seasonal && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-accent-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Limited Time
                      </div>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{option.title}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-primary-600">
                        {formatPrice(option.price)}
                      </span>
                      {option.originalPrice && (
                        <span className="text-lg text-neutral-400 line-through ml-2">
                          {formatPrice(option.originalPrice)}
                        </span>
                      )}
                      {option.savings && (
                        <div className="mt-2">
                          <span className="bg-secondary-100 text-secondary-700 px-3 py-1 rounded-full text-sm font-medium">
                            Save ${option.savings}
                          </span>
                        </div>
                      )}
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

        {/* Additional Services */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
            Special Offers & Group Rates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {additionalServices.map((service, index) => {
              const Icon = service.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-neutral-900">{service.title}</h4>
                            <span className="text-lg font-bold text-primary-600">{service.price}</span>
                          </div>
                          <p className="text-neutral-600 mb-2">{service.description}</p>
                          <p className="text-sm text-neutral-500">{service.note}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="max-w-2xl mx-auto bg-primary-50 border-primary-200">
            <CardContent className="p-6">
              <h4 className="font-semibold text-neutral-900 mb-3">We Accept</h4>
              <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-neutral-600">
                <span>💳 All Major Credit Cards</span>
                <span>•</span>
                <span>💵 Cash</span>
                <span>•</span>
                <span>📱 Mobile Payments</span>
              </div>
              <p className="text-xs text-neutral-500 mt-3">
                All prices subject to applicable taxes
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
