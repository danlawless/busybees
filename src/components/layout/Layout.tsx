'use client'

import React from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { FloatingBees } from '@/components/ui/FloatingBees'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Magical floating bees for that extra fun factor! */}
      <FloatingBees count={2} enabled={true} />
      
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
