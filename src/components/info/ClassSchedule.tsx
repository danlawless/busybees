'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Star, Mail, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HoneycombPattern } from '@/components/ui/BeeIcon'

export function ClassSchedule() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setEmail('')
        setFirstName('')
        setLastName('')
        setTimeout(() => setIsSubmitted(false), 5000)
      }
    } catch (error) {
      console.error('Newsletter signup error:', error)
    }
  }

  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden min-h-[80vh] flex items-center">
      <HoneycombPattern variant="scattered" size="lg" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 w-full">
        {/* Main Content */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-block mb-6">
            <div className="relative">
              <Calendar className="w-24 h-24 text-honey-400 mx-auto mb-4 animate-pulse" />
              <Sparkles className="w-8 h-8 text-honey-500 absolute -top-2 -right-2 animate-bounce" />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-charcoal-800 mb-6">
            Stay <span className="text-honey-600">Tuned!</span>
          </h1>

          <p className="text-xl text-charcoal-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            We're developing exciting class programs for your little ones! From Mommy and Me sessions to Kids Yoga,
            Story Time to Zumbini - amazing activities are coming soon.
          </p>

          <div className="inline-flex items-center space-x-2 bg-honey-100 px-6 py-3 rounded-full mb-12">
            <Star className="w-5 h-5 text-honey-600" />
            <span className="text-charcoal-700 font-medium">Classes launching soon!</span>
            <Star className="w-5 h-5 text-honey-600" />
          </div>
        </motion.div>

        {/* Newsletter Signup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-br from-honey-50 to-yellow-50 border-2 border-honey-200 shadow-xl">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-charcoal-700" />
                </div>

                <h2 className="text-3xl font-bold text-charcoal-800 mb-3">
                  Be the First to Know!
                </h2>
                <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                  Sign up for our newsletter to get notified when classes launch, plus receive exclusive updates and special offers.
                </p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleNewsletterSubmit} className="max-w-xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="px-4 py-3 border-2 border-honey-200 rounded-lg bg-white focus:ring-2 focus:ring-honey-300 focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="px-4 py-3 border-2 border-honey-200 rounded-lg bg-white focus:ring-2 focus:ring-honey-300 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="mb-4">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border-2 border-honey-200 rounded-lg bg-white focus:ring-2 focus:ring-honey-300 focus:border-transparent transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-honey-400 to-honey-500 hover:from-honey-500 hover:to-honey-600 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Join Our Newsletter
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-700 mb-2">
                    Thank You!
                  </h3>
                  <p className="text-green-600">
                    You're all set! We'll notify you as soon as classes launch.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Coming Soon Preview */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="text-charcoal-600 mb-4">
            <span className="font-semibold text-charcoal-800">Coming Soon:</span> Mommy and Me • Story Time • Kids Yoga • Lego Build • Toddler Tunes • Zumbini
          </p>
          <p className="text-sm text-charcoal-500 italic">
            Designed for ages 0-6 years with engaging activities for every stage
          </p>
        </motion.div>
      </div>
    </section>
  )
}
