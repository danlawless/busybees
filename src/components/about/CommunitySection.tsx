'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Mail, Calendar, Bell, Gift, Send } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp } from '@/lib/utils'

const upcomingEvents = [
  {
    icon: Gift,
    title: 'Holiday Celebration',
    date: 'December 15, 2024',
    description: 'Join us for our annual holiday party with special activities, treats, and festive fun!'
  },
  {
    icon: Calendar,
    title: 'New Year Open Play',
    date: 'January 1, 2025',
    description: 'Start the new year with family fun! Extended hours and special New Year activities.'
  },
  {
    icon: Bell,
    title: 'Parent Workshop Series',
    date: 'Ongoing',
    description: 'Monthly workshops on child development, safety, and parenting tips.'
  }
]

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to your newsletter service
    console.log('Newsletter signup:', { email, name })
    setIsSubmitted(true)
    setTimeout(() => setIsSubmitted(false), 3000)
    setEmail('')
    setName('')
  }

  return (
    <section className="relative py-20 section-hexagon-medium overflow-hidden">
      <HoneycombPattern variant="medium" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Stay Connected
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Join Our <span className="text-honey-gradient">Hive</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Subscribe to our newsletter and stay updated on upcoming events, special promotions, 
            and exciting news from the Busy Bees family.
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Newsletter Signup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="card-pastel">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-charcoal-700" />
                </div>
                
                <h3 className="text-2xl font-bold text-charcoal-800 text-center mb-4">
                  Subscribe to Newsletters & Upcoming Events
                </h3>
                <p className="text-charcoal-600 text-center mb-8">
                  Be the first to know about special events, promotions, and new activities at Busy Bees!
                </p>
                
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-charcoal-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-honey-200 rounded-xl focus:ring-2 focus:ring-honey-300 focus:border-transparent bg-white/80 backdrop-blur-sm"
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-honey-200 rounded-xl focus:ring-2 focus:ring-honey-300 focus:border-transparent bg-white/80 backdrop-blur-sm"
                        placeholder="Enter your email address"
                      />
                    </div>
                    
                    <Button type="submit" size="lg" className="w-full flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      Subscribe to Updates
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-charcoal-800 mb-2">Thank You!</h4>
                    <p className="text-charcoal-600">
                      You've successfully subscribed to our newsletter. Welcome to the Busy Bees family!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-charcoal-800 mb-8 text-center lg:text-left">
              Upcoming <span className="text-honey-gradient">Events</span>
            </h3>
            
            <div className="space-y-6">
              {upcomingEvents.map((event, index) => {
                const Icon = event.icon
                return (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="card-pastel group hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-charcoal-700" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-charcoal-800 mb-2">
                              {event.title}
                            </h4>
                            <p className="text-sm text-honey-600 font-medium mb-2">
                              {event.date}
                            </p>
                            <p className="text-sm text-charcoal-600 leading-relaxed">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
        
        {/* Newsletter Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Card className="max-w-4xl mx-auto card-pastel">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-charcoal-800 mb-8">
                What You'll <span className="text-honey-gradient">Receive</span>
              </h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-charcoal-700" />
                  </div>
                  <h4 className="font-semibold text-charcoal-800 mb-2">Event Updates</h4>
                  <p className="text-sm text-charcoal-600">Early access to special events and party bookings</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-6 h-6 text-charcoal-700" />
                  </div>
                  <h4 className="font-semibold text-charcoal-800 mb-2">Exclusive Offers</h4>
                  <p className="text-sm text-charcoal-600">Special discounts and promotions for subscribers only</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-6 h-6 text-charcoal-700" />
                  </div>
                  <h4 className="font-semibold text-charcoal-800 mb-2">Important News</h4>
                  <p className="text-sm text-charcoal-600">Stay informed about facility updates and new programs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
