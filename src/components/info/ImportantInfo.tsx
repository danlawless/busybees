'use client'

import { motion } from 'framer-motion'
import { Shirt, Clock, Coffee, Users, Bell } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const importantInfo = [

  {
    icon: Shirt,
    title: 'Socks Required',
    description: 'All guests must wear socks. Forgot yours? We sell branded socks on-site.',
    accent: 'bg-[#FFB3BA]/25',
  },
  {
    icon: Clock,
    title: 'No Reservations',
    description: 'Just show up and play! No need to book ahead for regular play.',
    accent: 'bg-[#B4D7E8]/25',
  },
  {
    icon: Coffee,
    title: 'Food Welcome',
    description: 'Bring your own food and drinks, or buy from our snack bar.',
    accent: 'bg-[#A8E6CF]/25',
  },
  {
    icon: Users,
    title: 'Ages 0-6',
    description: 'Designed for infants, toddlers, and young children with distinct areas.',
    accent: 'bg-[#FFE08A]/25',
  },
  {
    icon: Bell,
    title: 'Stay Connected',
    description: 'Follow us on social media or sign up for our newsletter for updates.',
    accent: 'bg-[#B4D7E8]/25',
  }
]

export function ImportantInfo() {
  return (
    <section className="relative py-20 sm:py-24 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="subtle" size="md" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 mb-4">
            Good to <span className="text-honey-gradient">Know</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Quick info to help make your visit smooth and enjoyable
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {importantInfo.map((info, index) => {
            const Icon = info.icon
            return (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full group hover:shadow-honey transition-all duration-300 rounded-3xl">
                  <CardContent className="p-8 text-center">
                    <div className={`w-14 h-14 ${info.accent} rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-7 h-7 text-charcoal-700" />
                    </div>

                    <h3 className="text-lg font-semibold text-charcoal-800 mb-3">
                      {info.title}
                    </h3>
                    <p className="text-sm text-charcoal-600 leading-relaxed">
                      {info.description}
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
