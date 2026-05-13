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

  // Fetch active promo from database on mount and refresh periodically
  useEffect(() => {
    const loadActivePromo = async () => {
      try {
        // Try to fetch from database first
        const response = await fetch('/api/promos?active=true');

        if (response.ok) {
          const { promos: dbPromos } = await response.json();

          // Convert database format to UI format
          const promos: PromoSpecial[] = dbPromos.map((promo: any) => ({
            id: promo.id,
            name: promo.name,
            startDate: promo.start_date,
            endDate: promo.end_date,
            discountPercent: promo.discount_percent,
            description: promo.description,
            stripeCouponCode: promo.stripe_coupon_code,
            bannerStyle: promo.banner_style,
            isActive: promo.is_active,
            createdAt: promo.created_at,
            updatedAt: promo.updated_at,
          }));

          const active = getActivePromo(promos);

          if (active && shouldShowBanner(active.id)) {
            setActivePromo(active);
            setShowBanner(true);
          } else {
            setActivePromo(null);
            setShowBanner(false);
          }

          return;
        }
      } catch (error) {
        console.error('Failed to load promos from database:', error);
      }

      // Fallback to localStorage if API fails
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

    // Refresh every 5 minutes in case promo expires or new ones are added
    const interval = setInterval(loadActivePromo, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismissBanner = () => {
    setShowBanner(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E7]">
      <Header activePromo={showBanner ? activePromo : null} onDismissBanner={handleDismissBanner} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
