'use client'

import React from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Main layout component
 *
 * NOTE: Promo banner functionality has been temporarily disabled.
 * To re-enable promos in the future, restore the promo fetching logic
 * and pass activePromo to the Header component.
 * See git history for the original implementation.
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
