'use client'

import { motion } from 'framer-motion'
import { Clock, Crown, Calendar, CheckCircle } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const partyTypes = [
  {
    name: 'Private Party',
    description: 'Exclusive access to the entire facility, giving you and your guests a private celebration experience.',
    icon: Crown,
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-300',
    accentColor: 'from-purple-500 to-purple-600',
    schedule: [
      { day: 'Saturday & Sunday', time: '1pm - 3pm or 3:30pm - 5:30pm', available: true }
    ],
    benefits: [
      'Exclusive access to entire facility',
      'Complete privacy for your celebration',
      'Premium experience with no distractions',
      'Perfect for larger groups',
      'Maximum flexibility and customization'
    ],
    priceNote: 'See package pricing below'
  }
]

export function PartyOptions() {
  return (
    <section className="relative py-16 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="md" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-honey-100 to-yellow-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Party Options
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
            Choose Your <span className="text-honey-600">Perfect Party Experience</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Our private parties give you exclusive access to the entire facility for an unforgettable celebration!
          </p>
        </motion.div>

        {/* Party Type Cards */}
        <motion.div
          className="grid max-w-xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {partyTypes.map((party, index) => {
            const Icon = party.icon
            return (
              <motion.div key={index} variants={fadeInUp} className="relative h-full">
                <Card className={`h-full card-pastel border-2 ${party.borderColor} hover:scale-105 transition-all duration-300 group flex flex-col`}>
                  <CardContent className="p-8 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 bg-gradient-to-br ${party.color} hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-charcoal-800 mb-3">
                        {party.name}
                      </h3>
                      
                      <div className="min-h-[60px] flex items-center justify-center">
                        <p className="text-charcoal-600 leading-relaxed">
                          {party.description}
                        </p>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-charcoal-800 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-honey-600" />
                        Available Times
                      </h4>
                      <div className="space-y-2">
                        {party.schedule.map((slot, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border">
                            <span className="font-medium text-charcoal-700">{slot.day}</span>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-honey-600" />
                              <span className="text-charcoal-600">{slot.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="mb-6 flex-1">
                      <h4 className="font-semibold text-charcoal-800 mb-3 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        What's Included
                      </h4>
                      <div className="space-y-2">
                        {party.benefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <div className="w-5 h-5 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <CheckCircle className="w-3 h-3 text-green-700" />
                            </div>
                            <span className="text-sm text-charcoal-600 leading-relaxed">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Note - Always at bottom */}
                    <div className="mt-auto">
                      <div className={`p-4 bg-gradient-to-r ${party.accentColor} rounded-lg text-white text-center`}>
                        <p className="font-medium">
                          💰 {party.priceNote}
                        </p>
                      </div>
                    </div>
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
