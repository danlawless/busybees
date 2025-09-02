'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Info', href: '/info' },
  { name: 'Parties', href: '/parties' },
  { name: 'Contact', href: '/contact' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100
      setIsScrolled(scrolled)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Logo Section - Not Sticky, Will Scroll Away */}
      <div className={cn(
        "bg-white/95 backdrop-blur-sm border-b border-neutral-200 transition-transform duration-300",
        isScrolled ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center py-2">
            <Link href="/" className="flex items-center">
              <Logo size="3xl" animate={true} showText={false} />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Section - Sticky Header */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:justify-between md:px-8 lg:px-16 xl:px-24">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "font-medium text-lg tracking-wide uppercase flex-1 text-center py-2 px-2 rounded-md transition-all duration-200",
                    isActive
                      ? "text-gray-900 shadow-md border border-yellow-400"
                      : "text-charcoal-700 hover:text-primary-600 hover:bg-primary-100"
                  )}
                  style={isActive ? { backgroundColor: '#fde047' } : {}}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex justify-center">
            <button
              type="button"
              className="rounded-md p-3 text-neutral-700 hover:bg-primary-100 hover:text-primary-600 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
              <span className="ml-2 text-sm font-medium">MENU</span>
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
              <div className="flex items-center justify-between mb-6">
                <Link href="/" className="flex items-center">
                  <Logo size="lg" animate={false} textSize="md" />
                </Link>
                <button
                  type="button"
                  className="rounded-md p-2 text-neutral-700 hover:bg-primary-100 hover:text-primary-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "block rounded-lg px-4 py-2 text-lg font-medium uppercase tracking-wide transition-all duration-200",
                        isActive
                          ? "text-gray-900 shadow-md border border-yellow-400"
                          : "text-charcoal-700 hover:bg-primary-100 hover:text-primary-600"
                      )}
                      style={isActive ? { backgroundColor: '#fde047' } : {}}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )
                })}
                <div className="mt-6 pt-6 border-t border-neutral-200">

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
