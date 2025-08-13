'use client'

import { motion } from 'framer-motion'
import { Calendar, Users, Gift, CreditCard, Phone, MessageCircle, CheckCircle } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const bookingSteps = [
  {
    step: 1,
    icon: Calendar,
    title: 'Pick Your Date',
    description: 'Choose your preferred date and time from our available slots',
    color: 'from-blue-200 to-blue-300',
    details: ['View real-time availability', 'Select 2-3 preferred dates', 'Instant confirmation']
  },
  {
    step: 2,
    icon: Gift,
    title: 'Choose Package',
    description: 'Select your party package and any fun extras you want',
    color: 'from-pink-200 to-pink-300',
    details: ['Compare all packages', 'Add themes & entertainment', 'Customize food options']
  },
  {
    step: 3,
    icon: Users,
    title: 'Party Details',
    description: 'Tell us about your birthday child and expected guests',
    color: 'from-purple-200 to-purple-300',
    details: ['Birthday child info', 'Guest count estimate', 'Special requests']
  },
  {
    step: 4,
    icon: CreditCard,
    title: 'Secure Payment',
    description: 'Complete your booking with our secure payment system',
    color: 'from-green-200 to-green-300',
    details: ['$50 deposit to book', 'Pay balance day of party', 'All major cards accepted']
  }
]

const contactMethods = [
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Speak directly with our party coordinators',
    action: 'Call Us',
    color: 'from-blue-200 to-blue-300',
    available: 'Mon-Fri 9AM-6PM'
  },
  {
    icon: MessageCircle,
    title: 'Text Us',
    description: 'Quick questions? Send us a text message',
    action: 'Text Us',
    color: 'from-green-200 to-green-300',
    available: 'Response within 1 hour'
  },
  {
    icon: Calendar,
    title: 'Online Booking',
    description: 'Book instantly through our online system',
    action: 'Book Now',
    color: 'from-purple-200 to-purple-300',
    available: '24/7 availability'
  }
]

const guarantees = [
  { icon: CheckCircle, text: 'No hidden fees or surprise charges' },
  { icon: CheckCircle, text: 'Full refund if cancelled 48hrs in advance' },
  { icon: CheckCircle, text: '100% satisfaction guarantee' },
  { icon: CheckCircle, text: 'Dedicated party coordinator assigned' }
]

export function BookingFlow() {
  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="subtle" size="lg" animated />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 text-green-800 rounded-full text-sm font-medium mb-4">
            Easy Booking
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Book Your Party in <span className="text-gradient bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">4 Easy Steps</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Our simple booking process makes planning your child's perfect party stress-free. 
            Get confirmed in minutes, not days!
          </p>
        </motion.div>
        
        {/* Booking Steps */}
        <motion.div
          className="mb-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="grid lg:grid-cols-4 gap-8">
            {bookingSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div key={index} variants={fadeInUp} className="relative">
                  {/* Connecting Line */}
                  {index < bookingSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-honey-200 to-honey-300 z-0">
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-honey-300 rounded-full"></div>
                    </div>
                  )}
                  
                  <Card className="h-full card-pastel group hover:shadow-xl transition-all duration-300 relative z-10">
                    <CardContent className="p-6 text-center">
                      {/* Step Number */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="w-8 h-8 bg-gradient-to-r from-honey-400 to-honey-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {step.step}
                        </div>
                      </div>
                      
                      {/* Icon */}
                      <div className={`w-16 h-16 bg-gradient-to-br ${step.color} hexagon-shape flex items-center justify-center mx-auto mb-6 mt-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-lg font-semibold text-charcoal-800 mb-3">
                        {step.title}
                      </h3>
                      <p className="text-sm text-charcoal-600 mb-4 leading-relaxed">
                        {step.description}
                      </p>
                      
                      {/* Details */}
                      <div className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center justify-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-honey-400 rounded-full"></div>
                            <span className="text-xs text-charcoal-600">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
        
        {/* Contact Methods */}
        <motion.div
          className="mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              Ready to Book? <span className="text-honey-gradient">Choose Your Way</span>
            </h3>
            <p className="text-charcoal-600">
              We make it easy to get started - pick the method that works best for you
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => {
              const Icon = method.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="h-full card-pastel group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8 text-center">
                      <div className={`w-16 h-16 bg-gradient-to-br ${method.color} hexagon-shape flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-charcoal-800 mb-3">
                        {method.title}
                      </h3>
                      <p className="text-charcoal-600 mb-4 leading-relaxed">
                        {method.description}
                      </p>
                      
                      <div className="mb-4">
                        <span className="text-sm text-charcoal-500 bg-honey-50 px-3 py-1 rounded-full">
                          {method.available}
                        </span>
                      </div>
                      
                      <Button 
                        size="lg" 
                        className={`w-full ${method.title === 'Online Booking' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white' 
                          : ''} font-semibold`}
                      >
                        {method.action}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
        
        {/* Guarantees */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-green-300 hexagon-shape flex items-center justify-center mx-auto mb-4 hexagon-pulse">
                  <CheckCircle className="w-8 h-8 text-green-700" />
                </div>
                <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
                  Our <span className="text-honey-gradient">Party Promise</span>
                </h3>
                <p className="text-charcoal-600 max-w-2xl mx-auto">
                  We're so confident you'll love your Busy Bees party experience, we guarantee it!
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {guarantees.map((guarantee, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-700" />
                    </div>
                    <span className="text-sm text-charcoal-700 font-medium">
                      {guarantee.text}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Start Booking Your Perfect Party
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
