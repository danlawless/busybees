'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Clock, 
  Baby,
  Shirt,
  Utensils,
  Car,
  Phone,
  Heart
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const safetyPolicies = [
  {
    icon: Shield,
    title: 'Adult Supervision Required',
    description: 'Children must be actively supervised by a parent or guardian at all times'
  },
  {
    icon: Users,
    title: 'Age-Appropriate Areas',
    description: 'Please respect designated age zones for the safety of all children'
  },
  {
    icon: Shirt,
    title: 'No Shoes in Play Areas',
    description: 'Socks required - grip socks available for purchase at front desk'
  },
  {
    icon: Baby,
    title: 'Diaper Changes',
    description: 'Please use designated changing areas in the restrooms only'
  }
]

const generalRules = [
  {
    icon: Utensils,
    title: 'Food & Drink Policy',
    description: 'Outside food welcome in eating area only. Please clean up after yourself.'
  },
  {
    icon: Car,
    title: 'Parking',
    description: 'Free parking available. Please park only in designated spaces.'
  },
  {
    icon: Phone,
    title: 'Lost & Found',
    description: 'Items held for 30 days. Please check with staff before leaving.'
  },
  {
    icon: Heart,
    title: 'Kindness Policy',
    description: 'We promote sharing, kindness, and respectful play for all families.'
  }
]

const importantNotices = [
  {
    title: 'Health & Wellness',
    items: [
      'Please do not visit if you or your child are feeling unwell',
      'Hand sanitizer stations available throughout the facility',
      'Regular cleaning and sanitization of all play equipment',
      'First aid kit and trained staff available for minor injuries'
    ]
  },
  {
    title: 'Liability & Waivers',
    items: [
      'All visitors must sign liability waiver before first visit',
      'Parents/guardians assume responsibility for children\'s safety',
      'Busy Bees is not responsible for lost, stolen, or damaged items',
      'Photography/video may be taken for promotional purposes'
    ]
  },
  {
    title: 'Cancellations & Refunds',
    items: [
      'Memberships: 24-hour notice required for cancellation',
      'Parties: 48-hour notice required for full refund',
      'Daily passes: No refunds, but can be used another day',
      'Weather-related closures: Make-up visits or refunds available'
    ]
  }
]

export function Policies() {
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
            <Shield className="w-8 h-8 inline mr-3 text-primary-500" />
            Policies & Guidelines
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Simple rules to ensure a safe, fun experience for all families
          </p>
        </motion.div>

        {/* Safety Policies */}
        <motion.div
          className="mb-12"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">
            Safety First
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safetyPolicies.map((policy, index) => {
              const Icon = policy.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="h-full border-l-4 border-primary-500">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-900 mb-2">{policy.title}</h4>
                          <p className="text-neutral-600">{policy.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* General Rules */}
        <motion.div
          className="mb-12"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">
            General Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generalRules.map((rule, index) => {
              const Icon = rule.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-secondary-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-900 mb-2">{rule.title}</h4>
                          <p className="text-neutral-600">{rule.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Important Notices */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">
            Important Information
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {importantNotices.map((notice, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-accent-500" />
                      {notice.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-3">
                      {notice.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start text-sm text-neutral-600">
                          <div className="w-2 h-2 bg-accent-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <h4 className="font-semibold text-red-900 mb-2">Emergency Procedures</h4>
              <p className="text-red-800 text-sm mb-4">
                In case of emergency, please notify staff immediately. Emergency exits are clearly marked. 
                First aid and AED equipment available on-site.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-red-500 mr-2" />
                  <span className="font-medium">Emergency: 911</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-red-500 mr-2" />
                  <span className="font-medium">Busy Bees: (123) 456-7890</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
