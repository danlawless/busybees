'use client'

import { motion } from 'framer-motion'
import { Clock, Users, Crown, Calendar, MapPin, Star, CheckCircle } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const partyTypes = [
  {
    name: 'Semi-Private Party',
    description: 'Held during our normal business hours while we are open to the public.',
    icon: Users,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    accentColor: 'from-blue-500 to-blue-600',
    schedule: [
      { day: 'Weekdays', time: '10am - 4pm', available: true },
      { day: 'Saturday & Sunday', time: '9am - 12pm', available: true }
    ],
    benefits: [
      'Access to exclusive party room',
      'Access to play area during public play',
      'More affordable pricing option',
      'Perfect for younger children',
      'All party essentials included'
    ],
    priceNote: 'First price listed in packages below'
  },
  {
    name: 'Private Party',
    description: 'Scheduled outside of regular business hours, giving you and your guests exclusive access to the entire facility.',
    icon: Crown,
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-300',
    accentColor: 'from-purple-500 to-purple-600',
    popular: true,
    schedule: [
      { day: 'Friday', time: '4pm - 6pm', available: true },
      { day: 'Saturday & Sunday', time: '1pm - 3pm or 4pm - 6pm', available: true }
    ],
    benefits: [
      'Exclusive access to entire facility',
      'Complete privacy for your celebration',
      'Premium experience with no distractions',
      'Perfect for larger groups',
      'Maximum flexibility and customization'
    ],
    priceNote: 'Second price listed in packages below'
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
            Choose Your <span className="text-gradient bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">Perfect Party Experience</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            We offer two types of party experiences for you to choose from. Each option provides amazing value with everything you need for an unforgettable celebration!
          </p>
        </motion.div>

        {/* Party Type Cards */}
        <motion.div
          className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {partyTypes.map((party, index) => {
            const Icon = party.icon
            return (
              <motion.div key={index} variants={fadeInUp} className="relative">
                {party.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      <Star className="w-4 h-4 inline mr-2" />
                      MOST EXCLUSIVE
                    </div>
                  </div>
                )}
                
                <Card className={`h-full card-pastel border-2 ${party.borderColor} ${party.popular ? 'scale-105 shadow-xl' : 'hover:scale-105'} transition-all duration-300 group`}>
                  <CardContent className="p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 bg-gradient-to-br ${party.color} hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-charcoal-800 mb-3">
                        {party.name}
                      </h3>
                      
                      <p className="text-charcoal-600 leading-relaxed mb-4">
                        {party.description}
                      </p>
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
                    <div className="mb-6">
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

                    {/* Pricing Note */}
                    <div className={`p-4 bg-gradient-to-r ${party.accentColor} rounded-lg text-white text-center`}>
                      <p className="font-medium">
                        💰 {party.priceNote}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Important Note */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-honey-50 to-yellow-50 border-2 border-honey-200 max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <MapPin className="w-5 h-5 text-honey-600" />
                <h4 className="font-bold text-charcoal-800">Important Pricing Information</h4>
              </div>
              <p className="text-charcoal-600 leading-relaxed">
                <strong>Please note:</strong> In our party packages below, the <strong>first price listed</strong> reflects our 
                <strong> semi-private party rate</strong>, and the <strong>second price listed</strong> reflects our 
                <strong> private party rate</strong>. Choose the experience that works best for your celebration!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
