'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone, Clock } from 'lucide-react'
import { BeeIcon } from '@/components/ui/BeeIcon'
import { Button } from '@/components/ui/Button'
import { cn, isOpen, getBusinessHours } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Info', href: '/info' },
  { name: 'Parties', href: '/parties' },
  { name: 'Contact', href: '/contact' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const businessOpen = isOpen()

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <BeeIcon size="lg" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-neutral-900">Busy Bees</span>
                <span className="text-xs text-neutral-600">Indoor Play Center</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-neutral-700 hover:text-primary-600 transition-colors duration-200 font-medium"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Business Status & CTA */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span className={cn(
                "font-medium",
                businessOpen ? "text-secondary-600" : "text-neutral-600"
              )}>
                {businessOpen ? "Open Now" : "Closed"}
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-600">{getBusinessHours()}</span>
            </div>
            <Button size="sm">
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white px-6 py-6 sm:ring-1 sm:ring-neutral-900/10 md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                  <BeeIcon size="md" />
                  <span className="text-lg font-bold text-neutral-900">Busy Bees</span>
                </Link>
                <button
                  type="button"
                  className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-base font-semibold text-neutral-900 hover:bg-neutral-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <div className="flex items-center space-x-2 text-sm mb-4">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span className={cn(
                      "font-medium",
                      businessOpen ? "text-secondary-600" : "text-neutral-600"
                    )}>
                      {businessOpen ? "Open Now" : "Closed"}
                    </span>
                  </div>
                  <Button className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
