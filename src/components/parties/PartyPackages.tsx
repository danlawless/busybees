'use client'

import { motion } from 'framer-motion'
import { Gift, Users, Crown, Sparkles, Star, CheckCircle } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { PURCHASING_ENABLED } from '@/lib/feature-flags'

// Party packages updated per issue #101
const partyPackages = [
  {
    name: 'Basic Bee',
    description: 'Standard package with paper goods',
    icon: Gift,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    accentColor: 'from-blue-500 to-blue-600',
    semiPrivatePrice: 400,
    privatePrice: 475,
    maxGuests: 20,
    duration: '2 hours',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Birthday crown for birthday child',
      'Access to play area during party',
      'Dedicated party host assistance',
      'Basic cleanup service included',
      'Party setup & breakdown handled'
    ],
    popular: false
  },
  {
    name: 'Worker Bee+',
    description: 'Essential package with pizza and soda',
    icon: Sparkles,
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-300',
    accentColor: 'from-purple-500 to-purple-600',
    semiPrivatePrice: 450,
    privatePrice: 525,
    maxGuests: 20,
    duration: '2 hours',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Pizza for all guests',
      'Soda for all guests',
      'Dedicated party host assistance',
      'Party setup & breakdown handled',
      'Access to play area during party'
    ],
    popular: true
  },
  {
    name: 'Queen Bee+',
    description: 'Premium package with pizza, soda, cake and balloons',
    icon: Crown,
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-300',
    accentColor: 'from-pink-500 to-pink-600',
    semiPrivatePrice: 500,
    privatePrice: 575,
    maxGuests: 20,
    duration: '2 hours',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Pizza for all guests',
      'Soda for all guests',
      'Birthday cake included',
      'Balloon decorations',
      'Dedicated party host assistance'
    ],
    popular: false
  }
]

export function PartyPackages() {
  return (
    <section className="relative py-20 section-hexagon-subtle overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 rounded-full text-sm font-medium mb-4">
            Party Packages
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Choose Your <span className="text-gradient bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Perfect Package</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-4xl mx-auto leading-relaxed">
            Now that you know about our party options, choose your package! Every package is available as both
            semi-private and private - <strong>no hidden fees, no stress, just pure birthday magic!</strong>
          </p>
        </motion.div>

        {/* Package Cards */}
        <motion.div
          className="grid lg:grid-cols-3 gap-8 mb-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {partyPackages.map((pkg, index) => {
            const Icon = pkg.icon
            return (
              <motion.div key={index} variants={fadeInUp} className="relative">
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <Card className={`card-pastel border-2 ${pkg.borderColor} hover:scale-105 transition-all duration-300 group ${pkg.popular ? 'shadow-xl ring-2 ring-purple-200' : ''} h-full flex flex-col`}>
                  <CardContent className="p-8 flex-1 flex flex-col">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                      <div className={`w-20 h-20 bg-gradient-to-br ${pkg.color} hexagon-shape flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                        <Icon className="w-10 h-10 text-charcoal-700" />
                      </div>

                      <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
                        {pkg.name}
                      </h3>

                      <p className="text-charcoal-600 leading-relaxed mb-6 min-h-[3rem] flex items-center justify-center px-2">
                        {pkg.description}
                      </p>

                      {/* Package Info */}
                      <div className="flex justify-center items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-honey-600" />
                          <span className="text-sm text-charcoal-600">{pkg.maxGuests} guests</span>
                        </div>
                        <div className="w-1 h-1 bg-charcoal-400 rounded-full"></div>
                        <span className="text-sm text-charcoal-600">{pkg.duration}</span>
                      </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="text-center mb-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                          <span className="font-medium text-charcoal-700">Private:</span>
                          <span className="text-2xl font-bold text-charcoal-800">${pkg.privatePrice}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                          <span className="font-medium text-charcoal-700">Semi-Private:</span>
                          <span className="text-2xl font-bold text-charcoal-800">${pkg.semiPrivatePrice}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features Section */}
                    <div className="mb-8 flex-1">
                      <h4 className="font-semibold text-charcoal-800 mb-4 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        What's Included
                      </h4>
                      <div className="space-y-3">
                        {pkg.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <div className="w-5 h-5 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <CheckCircle className="w-3 h-3 text-green-700" />
                            </div>
                            <span className="text-sm text-charcoal-600 leading-relaxed">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button Section */}
                    <div className="mt-auto">
                      <Button
                        size="lg"
                        className={`w-full ${pkg.popular
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg'
                          : `bg-gradient-to-r ${pkg.accentColor} text-white hover:shadow-lg`
                        } font-semibold transition-all duration-300 transform hover:scale-105`}
                        onClick={() => {
                          document.getElementById('party-calendar-section')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                          });
                        }}
                        disabled={!PURCHASING_ENABLED}
                      >
                        <Gift className="w-5 h-5 mr-2" />
                        {PURCHASING_ENABLED ? 'Choose This Package' : 'Coming Soon'}
                      </Button>
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
