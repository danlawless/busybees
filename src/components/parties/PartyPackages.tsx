'use client'

import { motion } from 'framer-motion'
import { Gift, Users, Clock, Cake, Star, Check, Crown, Zap, Calendar } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const packages = [
  {
    name: 'Basic Bee',
    semiPrivatePrice: 299,
    privatePrice: 399,
    duration: '2 Hours',
    guests: '15 Kids Included',
    icon: Users,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    popular: false,
    features: [
      'Exclusive party room access',
      'Access to play area during public play',
      'Paper goods included (plates, napkins, cups)',
      'Table cloth and plastic cutlery',
      '15 kids included, additional guest pricing available soon',
      'Weekdays: 10am - 4pm available',
      'Weekends: 9am - 12pm available',
      'You bring food, drinks & decorations'
    ]
  },
  {
    name: 'Worker Bee',
    semiPrivatePrice: 399,
    privatePrice: 499,
    duration: '2 Hours',
    guests: '15 Kids Included',
    icon: Zap,
    color: 'from-yellow-200 to-yellow-300',
    borderColor: 'border-yellow-300',
    popular: true,
    features: [
      'Everything from Basic Bee',
      'Enhanced party decorations',
      'Special activity coordinator',
      'Birthday child gets special crown',
      'Photo session included',
      'Weekdays: 10am - 4pm available',
      'Weekends: 9am - 12pm or 1pm-3pm available',
      'You bring food, drinks & extra decorations'
    ]
  },
  {
    name: 'Queen Bee',
    semiPrivatePrice: 499,
    privatePrice: 599,
    duration: '2 Hours',
    guests: '15 Kids Included',
    icon: Crown,
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-300',
    popular: false,
    features: [
      'Everything from Worker Bee',
      'Exclusive access to entire play area (private only)',
      'Premium party decorations & setup',
      'Dedicated party host',
      'Professional photo package',
      'Special birthday throne for birthday child',
      'Custom party favors for all guests',
      'You bring food & drinks, we handle everything else'
    ]
  }
]

const addOns = [
  { name: 'Pizza Party', price: 49, icon: '🍕', description: 'Fresh pizza for all party guests' },
  { name: 'Face Painting', price: 75, icon: '🎨', description: 'Professional face painter for 1 hour' },
  { name: 'Balloon Artist', price: 85, icon: '🎈', description: 'Balloon sculptures for every child' },
  { name: 'Extra Hour', price: 99, icon: '⏰', description: 'Extend your party by one hour' },
  { name: 'Photo Booth', price: 125, icon: '📸', description: 'Props and instant photo prints' },
  { name: 'Custom Cake', price: 65, icon: '🎂', description: 'Personalized birthday cake' }
]

export function PartyPackages() {
  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            Choose Your <span className="text-gradient bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Perfect Party</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Every package includes everything you need for an unforgettable celebration. 
            No hidden fees, no stress – just pure birthday magic!
          </p>
        </motion.div>
        
        {/* Package Cards */}
        <motion.div
          className="grid lg:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {packages.map((pkg, index) => {
            const Icon = pkg.icon
            return (
              <motion.div key={index} variants={fadeInUp} className="relative">
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      <Star className="w-4 h-4 inline mr-2" />
                      MOST POPULAR
                    </div>
                  </div>
                )}
                
                <Card className={`h-full card-pastel border-2 ${pkg.borderColor} ${pkg.popular ? 'scale-105 shadow-xl' : 'hover:scale-105'} transition-all duration-300 group`}>
                  <CardContent className="p-8">
                    {/* Package Header */}
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 bg-gradient-to-br ${pkg.color} hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-charcoal-800 mb-2">
                        {pkg.name}
                      </h3>
                      
                      <div className="text-center mb-4">
                        <div className="flex items-baseline justify-center space-x-2 mb-2">
                          <span className="text-3xl font-bold text-honey-gradient">${pkg.semiPrivatePrice}</span>
                          <span className="text-sm text-charcoal-600">semi-private</span>
                        </div>
                        <div className="flex items-baseline justify-center space-x-2">
                          <span className="text-3xl font-bold text-honey-gradient">${pkg.privatePrice}</span>
                          <span className="text-sm text-charcoal-600">private</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-center space-x-4 text-sm text-charcoal-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{pkg.duration}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{pkg.guests}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Features List */}
                    <div className="space-y-3 mb-8">
                      {pkg.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <div className="w-5 h-5 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                            <Check className="w-3 h-3 text-green-700" />
                          </div>
                          <span className="text-sm text-charcoal-600 leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* CTA Button */}
                    <Button 
                      className={`w-full ${pkg.popular 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white' 
                        : ''} font-semibold`}
                      size="lg"
                      onClick={() => {
                        document.getElementById('party-calendar-section')?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start'
                        });
                      }}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Book {pkg.name}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
        
        
        {/* Special Offer Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white overflow-hidden relative">
            <CardContent className="p-8 text-center relative z-10">
              <div className="w-16 h-16 bg-white/20 hexagon-shape flex items-center justify-center mx-auto mb-6 hexagon-pulse">
                <Zap className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-4">
                🎉 Ready to Book Your Perfect Party? 🎉
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Choose from our three amazing packages and create unforgettable memories for your little bee!
              </p>
              
              <Button 
                size="lg" 
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
                onClick={() => {
                  // Scroll to the first package or booking section
                  document.querySelector('.grid')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Choose Your Package
              </Button>
            </CardContent>
            
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <HoneycombPattern variant="light" size="md" />
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
