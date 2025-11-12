'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { PromoSpecial } from '@/lib/utils/promoHelpers'
import { PromoBanner } from '@/components/home/PromoBanner'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Classes', href: '/classes' },
  { name: 'Info', href: '/info' },
  { name: 'Parties', href: '/parties' },
  { name: 'Jobs', href: '/jobs' },
  { name: 'Contact', href: '/contact' },
]

interface HeaderProps {
  activePromo?: PromoSpecial | null;
  onDismissBanner?: () => void;
}

export function Header({ activePromo, onDismissBanner }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY
          setIsScrolled(scrollPosition > 50)
          ticking = false
        })
        ticking = true
      }
    }

    // Check initial scroll position
    setIsScrolled(window.scrollY > 50)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50 transition-all duration-200">
      {/* Promo Banner */}
      {activePromo && (
        <PromoBanner promo={activePromo} onDismiss={onDismissBanner} />
      )}

      {/* Single Unified Header - transitions smoothly between states */}
      <div
        className={cn(
          "bg-white/95 backdrop-blur-sm border-b transition-all duration-200",
          isScrolled ? "border-neutral-200 shadow-md" : "border-white"
        )}
      >
        {/* Logo Section - only show when not scrolled */}
        {!isScrolled && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center py-2">
              <Link href="/" className="flex items-center">
                <Logo size="2xl" animate={true} showText={false} />
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div
            className={cn(
              "hidden md:flex md:items-center transition-all duration-200",
              isScrolled ? "md:gap-8 py-3" : "md:justify-between md:px-8 lg:px-16 xl:px-24 py-4"
            )}
          >
            {/* Compact logo when scrolled */}
            {isScrolled && (
              <Link href="/" className="flex-shrink-0">
                <Logo size="md" animate={false} showText={false} />
              </Link>
            )}

            <div className={cn(
              "flex items-center transition-all duration-200",
              isScrolled ? "justify-center gap-4 flex-1" : "justify-between flex-1"
            )}>
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "font-medium tracking-wide uppercase rounded-md transition-all duration-200",
                      isScrolled
                        ? "text-sm py-2 px-3"
                        : "text-lg py-2 px-2 flex-1 text-center",
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
          </div>

          {/* Mobile menu button */}
          <div className={cn(
            "md:hidden flex items-center",
            isScrolled ? "justify-between py-3" : "justify-center py-3"
          )}>
            {isScrolled && (
              <Link href="/" className="flex-shrink-0">
                <Logo size="sm" animate={false} showText={false} />
              </Link>
            )}
            <button
              type="button"
              className={cn(
                "rounded-md text-neutral-700 hover:bg-primary-100 hover:text-primary-600 transition-colors duration-200",
                isScrolled ? "p-2" : "p-3"
              )}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className={cn(isScrolled ? "h-5 w-5" : "h-6 w-6")} aria-hidden="true" />
              <span className={cn("ml-2 font-medium", isScrolled ? "text-xs" : "text-sm")}>MENU</span>
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

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
