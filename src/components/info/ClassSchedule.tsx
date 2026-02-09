'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Calendar, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${firstName} ${lastName}`.trim(), email }),
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
    <section className="relative py-16 sm:py-24 overflow-hidden min-h-[80vh] flex items-center">
      {/* Hero background - in-component Image so it always shows (z-0, not negative) */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <Image
          src="/hero-background.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF7]/20 via-transparent to-[#FFF8E7]/15" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-primary-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Classes
          </span>
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-8 h-8 text-honey-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-charcoal-800 mb-4">
            Stay <span className="text-honey-500">Tuned</span>
          </h1>
          <p className="text-lg text-charcoal-600 max-w-xl mx-auto leading-relaxed mb-6">
            We&apos;re developing class programs for your little ones—Mommy and Me, Story Time, Kids Yoga, Lego Build, Toddler Tunes, Zumbini and more.
          </p>
          <p className="text-sm text-charcoal-500 font-medium">
            Classes launching soon
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="border-2 border-primary-200/50 shadow-soft rounded-3xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-honey-600" />
                </div>
                <h2 className="text-xl font-bold text-charcoal-800 mb-2">Be the First to Know</h2>
                <p className="text-charcoal-600 text-sm max-w-md mx-auto">
                  Sign up and we&apos;ll notify you when classes launch, plus exclusive updates and offers.
                </p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="px-4 py-3 border border-primary-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="px-4 py-3 border border-primary-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-primary-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                  <Button type="submit" size="lg" className="w-full">
                    <Mail className="w-4 h-4 mr-2" />
                    Notify Me
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-800 mb-2">Thank you</h3>
                  <p className="text-charcoal-600 text-sm">We&apos;ll notify you when classes launch.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity photo previews */}
        <motion.div
          className="mt-10 grid grid-cols-4 gap-2"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          viewport={{ once: true }}
        >
          {['/album/MH_12624.jpg', '/album/MH_12675.jpg', '/album/MH_12719.jpg', '/album/MH_12787.jpg'].map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-soft border border-primary-200/30">
              <Image src={src} alt="" fill className="object-cover" sizes="25vw" loading="lazy" />
            </div>
          ))}
        </motion.div>

        <motion.p
          className="mt-5 text-center text-sm text-charcoal-500"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
        >
          Ages 0–6 • Mommy and Me • Story Time • Kids Yoga • Lego Build • Toddler Tunes • Zumbini
        </motion.p>
      </div>
    </section>
  )
}
