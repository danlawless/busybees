'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Image from 'next/image'
import { Mail, Calendar, Bell, Gift, Send } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp } from '@/lib/utils'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to subscribe to newsletter')
      }

      setIsSubmitted(true)
      setTimeout(() => setIsSubmitted(false), 3000)
      setEmail('')
      setName('')
    } catch (error) {
      console.error('Newsletter signup error:', error)
      alert('There was an error subscribing to our newsletter. Please try again or contact us directly at info@busybeesipc.com')
    }
  }

  return (
    <section className="relative py-24 sm:py-28 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-primary-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Stay Connected
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
            Join Our <span className="text-honey-500">Hive</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Subscribe to our newsletter and stay updated on upcoming events, special promotions,
            and news from the Busy Bees family.
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
            <Card className="border-2 border-primary-200/50 shadow-soft rounded-3xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-honey-600" />
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
              Upcoming <span className="text-honey-500">Events</span>
            </h3>

            <Card className="border-2 border-primary-200/50 shadow-soft rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                {/* Photo collage header */}
                <div className="grid grid-cols-3 gap-0.5 h-40 sm:h-48">
                  <div className="relative overflow-hidden">
                    <Image src="/album/MH_12636.jpg" alt="" fill className="object-cover" sizes="33vw" />
                  </div>
                  <div className="relative overflow-hidden">
                    <Image src="/album/MH_12671.jpg" alt="" fill className="object-cover" sizes="33vw" />
                  </div>
                  <div className="relative overflow-hidden">
                    <Image src="/album/MH_12716.jpg" alt="" fill className="object-cover" sizes="33vw" />
                  </div>
                </div>
                <div className="p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Calendar className="w-7 h-7 text-honey-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-charcoal-800 mb-4">
                    Stay Tuned
                  </h4>
                  <p className="text-base text-charcoal-600 leading-relaxed">
                    Exciting events are coming soon. Subscribe to our newsletter to be the first to know about special celebrations, workshops, and family activities.
                  </p>
                </div>
              </CardContent>
            </Card>
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
          <Card className="max-w-4xl mx-auto border-2 border-primary-200/50 shadow-soft rounded-3xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-charcoal-800 mb-8 text-center">
                What You&apos;ll <span className="text-honey-500">Receive</span>
              </h3>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-honey-600" />
                  </div>
                  <h4 className="font-semibold text-charcoal-800 mb-2">Event Updates</h4>
                  <p className="text-sm text-charcoal-600">Early access to special events and party bookings</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-6 h-6 text-honey-600" />
                  </div>
                  <h4 className="font-semibold text-charcoal-800 mb-2">Exclusive Offers</h4>
                  <p className="text-sm text-charcoal-600">Special discounts and promotions for subscribers only</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-6 h-6 text-honey-600" />
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
