'use client'

import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { PromoSpecial, getActivePromo, getPromosFromStorage, shouldShowBanner } from '@/lib/utils/promoHelpers'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [activePromo, setActivePromo] = useState<PromoSpecial | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Fetch active promo on mount and refresh periodically
  useEffect(() => {
    const loadActivePromo = () => {
      const promos = getPromosFromStorage();
      const active = getActivePromo(promos);

      if (active && shouldShowBanner(active.id)) {
        setActivePromo(active);
        setShowBanner(true);
      } else {
        setActivePromo(null);
        setShowBanner(false);
      }
    };

    // Load immediately
    loadActivePromo();

    // Refresh every 5 minutes in case promo expires
    const interval = setInterval(loadActivePromo, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismissBanner = () => {
    setShowBanner(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header activePromo={showBanner ? activePromo : null} onDismissBanner={handleDismissBanner} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
