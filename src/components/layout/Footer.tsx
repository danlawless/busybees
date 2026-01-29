'use client'

import React, { useState } from 'react'
import { MapPin, Mail, Phone, Instagram, Facebook } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HoneycombPattern } from '@/components/ui/BeeIcon'

const businessHours = [
  { label: 'Mon - Fri', time: '9:00 AM - 5:00 PM', type: 'Open Play', isWeekday: true },
  { label: 'Sat / Sun', time: '9:00 AM - 12:30 PM', type: 'Open Play' },
  { label: '', time: '1:00 PM - 3:00 PM', type: 'Private Parties' },
  { label: '', time: '3:30 PM - 5:30 PM', type: 'Private Parties' },
]

export function Footer() {
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
        setTimeout(() => setIsSubmitted(false), 3000)
      }
    } catch (error) {
      console.error('Newsletter signup error:', error)
    }
  }

  return (
    <footer className="relative bg-[#FFFDF7] border-t border-primary-200/30">
      <HoneycombPattern variant="light" size="lg" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Find Us At */}
          <div>
            <h3 className="text-sm font-bold text-charcoal-800 uppercase tracking-wider mb-5">
              Find Us At
            </h3>
            <div className="space-y-4 text-sm text-charcoal-600">
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Lunenburg Crossing</p>
                  <p>301 Massachusetts Avenue Rt. 2A</p>
                  <p>Lunenburg, Massachusetts 01462</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <a href="tel:+19787850015" className="hover:text-primary-500 transition-colors">
                  (978) 785-0015
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <a href="mailto:info@busybeesipc.com" className="hover:text-primary-500 transition-colors">
                  info@busybeesipc.com
                </a>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-sm font-bold text-charcoal-800 uppercase tracking-wider mb-5">
              Hours
            </h3>
            <div className="text-sm text-charcoal-600">
              {businessHours.map((schedule, index) => (
                <div
                  key={index}
                  className={`leading-tight ${schedule.isWeekday ? 'mb-4' : 'mb-1.5'}`}
                >
                  {schedule.label && (
                    <>
                      <span className="font-medium">{schedule.label}</span>
                      <br />
                    </>
                  )}
                  <span>{schedule.time}</span>
                  {schedule.type && (
                    <span className="text-xs text-charcoal-500 ml-2">({schedule.type})</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Join Our List */}
          <div>
            <h3 className="text-sm font-bold text-charcoal-800 uppercase tracking-wider mb-5">
              Join Our List
            </h3>
            {!isSubmitted ? (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="px-4 py-2.5 text-xs border border-primary-200/50 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="px-4 py-2.5 text-xs border border-primary-200/50 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 text-xs border border-primary-200/50 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white text-xs rounded-xl"
                >
                  Sign Up
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-green-600 font-medium">Thank you for signing up!</p>
              </div>
            )}
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="text-sm font-bold text-charcoal-800 uppercase tracking-wider mb-5">
              Follow Us
            </h3>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com/busybeesipc"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center hover:bg-primary-200 hover:shadow-soft transition-all duration-200"
              >
                <Instagram className="w-5 h-5 text-primary-600" />
              </a>
              <a
                href="https://facebook.com/busybeesipc"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center hover:bg-primary-200 hover:shadow-soft transition-all duration-200"
              >
                <Facebook className="w-5 h-5 text-primary-600" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-200/30 text-center">
          <p className="text-xs text-charcoal-500">
            © {new Date().getFullYear()} Busy Bees Indoor Play Center. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
