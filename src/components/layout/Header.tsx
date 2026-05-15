'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, User, LogOut } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { PromoSpecial } from '@/lib/utils/promoHelpers'
import { PromoBanner } from '@/components/home/PromoBanner'
import { createClient } from '@/lib/supabase/client'
import { PURCHASING_ENABLED, SHOW_ACCOUNT_IN_HEADER, ACCOUNT_ACCESS_ENABLED, SHOW_GIFT_CARDS } from '@/lib/feature-flags'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/info' },
  { name: 'Events', href: '/events' },
  { name: 'Parties', href: '/parties' },
  { name: 'Groups', href: '/groups' },
  { name: 'After Dark', href: '/after-dark' },
  ...(SHOW_GIFT_CARDS ? [{ name: 'Gift Cards', href: '/gift-cards' }] : []),
  { name: 'About Us', href: '/about' },
  // { name: 'Jobs', href: '/jobs' },
  // { name: 'Contact', href: '/contact' },  // Hidden until contact form email is fixed
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/customer/login'
  }

  useEffect(() => {
    const supabase = createClient()

    // Check initial auth state (use getUser for reliable server-validated check)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
      setIsLoading(false)
    }).catch(() => {
      setIsLoggedIn(false)
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

      {/* Header Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-primary-200/30 shadow-soft">
        {/* Navigation Section */}
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8 py-3.5">
            {/* Compact logo */}
            <Link href="/" className="flex-shrink-0">
              <Logo size="md" animate={false} showText={false} />
            </Link>

            <div className="flex items-center justify-center gap-3 flex-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "font-medium tracking-wide uppercase rounded-full transition-all duration-200 text-sm py-2 px-4",
                      isActive
                        ? "text-charcoal-800 bg-primary-400 shadow-soft border border-primary-500/30"
                        : "text-charcoal-700 hover:text-charcoal-800 hover:bg-primary-100"
                    )}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Auth section - controlled by SHOW_ACCOUNT_IN_HEADER flag */}
            {SHOW_ACCOUNT_IN_HEADER && (
              <div className="flex-shrink-0 flex items-center gap-2">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/customer/dashboard"
                      className={cn(
                        "flex items-center gap-2 font-medium tracking-wide uppercase rounded-full transition-all duration-200 text-sm py-2 px-4",
                        pathname.startsWith('/customer')
                          ? "text-charcoal-800 bg-primary-400 shadow-soft border border-primary-500/30"
                          : "text-charcoal-700 hover:text-charcoal-800 hover:bg-primary-100"
                      )}
                    >
                      <User className="h-4 w-4" />
                      My Account
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 font-medium tracking-wide uppercase rounded-full transition-all duration-200 text-sm py-2 px-4 text-charcoal-700 hover:text-charcoal-800 hover:bg-red-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/customer/login"
                    className="flex items-center gap-2 font-medium tracking-wide uppercase rounded-full transition-all duration-200 text-sm py-2 px-4 text-charcoal-700 hover:text-charcoal-800 hover:bg-primary-100"
                  >
                    <User className="h-4 w-4" />
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center justify-between py-3.5">
            <Link href="/" className="flex-shrink-0">
              <Logo size="sm" animate={false} showText={false} />
            </Link>
            <button
              type="button"
              className="rounded-full text-charcoal-700 hover:bg-primary-100 hover:text-charcoal-800 transition-colors duration-200 p-2.5"
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
              className="fixed inset-0 md:hidden"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 9998 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 w-full max-w-sm shadow-2xl px-8 py-8 md:hidden rounded-l-3xl"
              style={{ backgroundColor: '#FFF3D0', zIndex: 9999, boxShadow: '-20px 0 40px rgba(0,0,0,0.15)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-between mb-8">
                <Link href="/" className="flex items-center">
                  <Logo size="md" animate={false} showText={false} />
                </Link>
                <button
                  type="button"
                  className="rounded-full p-2.5 text-charcoal-700 hover:bg-primary-100 hover:text-charcoal-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "block rounded-2xl px-5 py-3 text-lg font-medium uppercase tracking-wide transition-all duration-200",
                        isActive
                          ? "text-charcoal-800 bg-primary-400 shadow-soft"
                          : "text-charcoal-700 hover:bg-primary-100 hover:text-charcoal-800"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )
                })}
                {/* Auth section - controlled by ACCOUNT_ACCESS_ENABLED flag */}
                {ACCOUNT_ACCESS_ENABLED && (
                  <div className="mt-8 pt-8 border-t border-primary-200/30 space-y-2">
                    {isLoggedIn ? (
                      <>
                        <Link
                          href="/customer/dashboard"
                          className={cn(
                            "flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-medium uppercase tracking-wide transition-all duration-200",
                            pathname.startsWith('/customer')
                              ? "text-charcoal-800 bg-primary-400 shadow-soft"
                              : "text-charcoal-700 hover:bg-primary-100 hover:text-charcoal-800"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="h-5 w-5" />
                          My Account
                        </Link>
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false)
                            handleLogout()
                          }}
                          className="flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-medium uppercase tracking-wide text-charcoal-700 hover:bg-red-100 hover:text-charcoal-800 transition-all duration-200 w-full"
                        >
                          <LogOut className="h-5 w-5" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/customer/login"
                        className="flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-medium uppercase tracking-wide text-charcoal-700 hover:bg-primary-100 hover:text-charcoal-800"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        Login
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
