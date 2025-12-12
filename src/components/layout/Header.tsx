'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, User } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { PromoSpecial } from '@/lib/utils/promoHelpers'
import { PromoBanner } from '@/components/home/PromoBanner'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Classes', href: '/classes' },
  { name: 'Info', href: '/info' },
  { name: 'Parties', href: '/parties' },
  { name: 'Gift Cards', href: '/gift-cards' },
  { name: 'Jobs', href: '/jobs' },
  { name: 'Contact', href: '/contact' },
]

interface HeaderProps {
  activePromo?: PromoSpecial | null;
  onDismissBanner?: () => void;
}

export function Header({ activePromo, onDismissBanner }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-50 transition-all duration-200">
      {/* Promo Banner */}
      {activePromo && (
        <PromoBanner promo={activePromo} onDismiss={onDismissBanner} />
      )}

      {/* Condensed Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-md">
        {/* Navigation Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8 py-3">
            {/* Compact logo */}
            <Link href="/" className="flex-shrink-0">
              <Logo size="md" animate={false} showText={false} />
            </Link>

            <div className="flex items-center justify-center gap-4 flex-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "font-medium tracking-wide uppercase rounded-md transition-all duration-200 text-sm py-2 px-3",
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

            {/* Auth section */}
            <div className="flex-shrink-0">
              {!isLoading && (
                isLoggedIn ? (
                  <Link
                    href="/customer/dashboard"
                    className={cn(
                      "flex items-center gap-2 font-medium tracking-wide uppercase rounded-md transition-all duration-200 text-sm py-2 px-3",
                      pathname.startsWith('/customer')
                        ? "text-gray-900 shadow-md border border-yellow-400"
                        : "text-charcoal-700 hover:text-primary-600 hover:bg-primary-100"
                    )}
                    style={pathname.startsWith('/customer') ? { backgroundColor: '#fde047' } : {}}
                  >
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                ) : (
                  <Link
                    href="/customer/login"
                    className="flex items-center gap-2 font-medium tracking-wide uppercase rounded-md transition-all duration-200 text-sm py-2 px-3 text-charcoal-700 hover:text-primary-600 hover:bg-primary-100"
                  >
                    <User className="h-4 w-4" />
                    Login
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center justify-between py-3">
            <Link href="/" className="flex-shrink-0">
              <Logo size="sm" animate={false} showText={false} />
            </Link>
            <button
              type="button"
              className="rounded-md text-neutral-700 hover:bg-primary-100 hover:text-primary-600 transition-colors duration-200 p-2"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span className="ml-2 font-medium text-xs">MENU</span>
            </button>
          </div>
        </div>
      </div>

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
                  <Logo size="md" animate={false} showText={false} />
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
                  {!isLoading && (
                    isLoggedIn ? (
                      <Link
                        href="/customer/dashboard"
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-2 text-lg font-medium uppercase tracking-wide transition-all duration-200",
                          pathname.startsWith('/customer')
                            ? "text-gray-900 shadow-md border border-yellow-400"
                            : "text-charcoal-700 hover:bg-primary-100 hover:text-primary-600"
                        )}
                        style={pathname.startsWith('/customer') ? { backgroundColor: '#fde047' } : {}}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        My Account
                      </Link>
                    ) : (
                      <Link
                        href="/customer/login"
                        className="flex items-center gap-2 rounded-lg px-4 py-2 text-lg font-medium uppercase tracking-wide text-charcoal-700 hover:bg-primary-100 hover:text-primary-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        Login
                      </Link>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
