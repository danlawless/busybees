'use client'

import { motion } from 'framer-motion'
import { Gift, Users, Clock, Cake, Star, Check, Crown, Zap } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const packages = [
  {
    name: 'Buzzing Basic',
    price: 199,
    duration: '1.5 Hours',
    guests: 'Up to 12 Kids',
    icon: Gift,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    popular: false,
    features: [
      'Private party area for 1.5 hours',
      'Dedicated party host',
      'Basic decorations included',
      'Birthday child gets special crown',
      'Free play time for all guests',
      'Party setup and cleanup',
      'Digital photo package',
      'Birthday song celebration'
    ]
  },
  {
    name: 'Sweet Celebration',
    price: 299,
    duration: '2 Hours',
    guests: 'Up to 16 Kids',
    icon: Cake,
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-300',
    popular: true,
    features: [
      'Private party area for 2 hours',
      'Dedicated party host + assistant',
      'Premium decorations & balloons',
      'Birthday child gets special crown',
      'Organized games and activities',
      'Party setup and cleanup',
      'Professional photo session',
      'Goodie bags for all guests',
      'Special birthday surprise',
      'Juice boxes and water included'
    ]
  },
  {
    name: 'Ultimate Hive',
    price: 399,
    duration: '2.5 Hours',
    guests: 'Up to 20 Kids',
    icon: Crown,
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-300',
    popular: false,
    features: [
      'Exclusive facility access for 2.5 hours',
      'Two dedicated party hosts',
      'Deluxe decorations & custom theme',
      'Birthday child gets royal treatment',
      'Organized games, activities & crafts',
      'Professional party setup/cleanup',
      'Premium photo & video package',
      'Deluxe goodie bags for all guests',
      'Special birthday cake ceremony',
      'Drinks and healthy snacks included',
      'Take-home party favor',
      'Personalized thank you cards'
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
      <HoneycombPattern variant="scattered" size="lg" animated />
      
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
          className="grid lg:grid-cols-3 gap-8 mb-16"
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
                      
                      <div className="flex items-baseline justify-center space-x-2 mb-4">
                        <span className="text-4xl font-bold text-honey-gradient">${pkg.price}</span>
                        <span className="text-charcoal-600">total</span>
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
        
        {/* Add-Ons Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              Make It Even More <span className="text-honey-gradient">Special</span>
            </h3>
            <p className="text-charcoal-600">
              Add these amazing extras to create the ultimate birthday experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addon, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="card-pastel group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{addon.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-charcoal-800">{addon.name}</h4>
                          <span className="text-lg font-bold text-honey-gradient">+${addon.price}</span>
                        </div>
                        <p className="text-sm text-charcoal-600">{addon.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
                🎉 Book This Month & Save $50! 🎉
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Limited time offer on all party packages. Use code <span className="font-bold bg-white/20 px-3 py-1 rounded">PARTY50</span>
              </p>
              
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 font-bold">
                <Calendar className="w-5 h-5 mr-2" />
                Book Now & Save
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
