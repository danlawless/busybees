'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from 'lucide-react'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { getBusinessHours } from '@/lib/utils'

const footerNavigation = {
  main: [
    { name: 'About', href: '/about' },
    { name: 'Info', href: '/info' },
    { name: 'Parties', href: '/parties' },
    { name: 'Contact', href: '/contact' },
    { name: 'Jobs', href: '/jobs' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Waiver', href: '/waiver' },
  ],
  social: [
    { name: 'Facebook', href: '#', icon: Facebook },
    { name: 'Instagram', href: '#', icon: Instagram },
  ],
}

const businessHours = [
  { days: 'Monday - Friday', hours: '10:00 AM - 5:00 PM' },
  { days: 'Saturday - Sunday', hours: '9:00 AM - 12:00 PM' },
  { days: 'Saturday - Sunday', hours: '1:00 PM - 6:00 PM (Parties)' },
]

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-charcoal-50 to-charcoal-100 border-t border-charcoal-200">
      <HoneycombPattern variant="light" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <BeeIcon size="lg" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-charcoal-800">Busy Bees</span>
                <span className="text-sm text-charcoal-600">Indoor Play Center</span>
              </div>
            </div>
            <p className="text-charcoal-600 mb-6 max-w-md">
              A modern, safe and engaging indoor play space for children ages 0-6. 
              Creating a go-to destination for families to play, socialize and celebrate.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-neutral-900 font-medium">380-432 John Fitch Highway</p>
                  <p className="text-neutral-600">Suite A-190 and A-200</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <a href="tel:+1234567890" className="text-neutral-900 hover:text-primary-600 transition-colors">
                  (123) 456-7890
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <a href="mailto:info@busybeesipc.com" className="text-neutral-900 hover:text-primary-600 transition-colors">
                  info@busybeesipc.com
                </a>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              {footerNavigation.main.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-neutral-600 hover:text-primary-600 transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours & Social */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
              <Clock className="w-4 h-4 inline mr-2" />
              Hours
            </h3>
            <div className="space-y-2 mb-6">
              {businessHours.map((schedule, index) => (
                <div key={index}>
                  <p className="text-sm font-medium text-neutral-900">{schedule.days}</p>
                  <p className="text-sm text-neutral-600">{schedule.hours}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
              Follow Us
            </h3>
            <div className="flex space-x-3">
              {footerNavigation.social.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-neutral-600 hover:text-primary-600 transition-colors duration-200"
                  >
                    <span className="sr-only">{item.name}</span>
                    <Icon className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-wrap justify-center md:justify-start space-x-6 mb-4 md:mb-0">
              {footerNavigation.legal.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm text-neutral-600 hover:text-primary-600 transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <p className="text-sm text-neutral-600">
              © {new Date().getFullYear()} Busy Bees Indoor Play Center. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
