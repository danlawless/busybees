'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/hooks/useAuth'
import { PartyPackageBackdrop } from '@/components/parties/PartyPackageBackdrop'
import { PartyAvailabilityPreview } from '@/components/parties/PartyAvailabilityPreview'
import { PartyBookingWizard } from '@/components/parties/PartyBookingWizard'
import { SummerPartyNotice } from '@/components/parties/SummerPartyNotice'
import { PartyPolicy } from '@/components/parties/PartyPolicy'
import { motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'

function PartiesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [showBookingWizard, setShowBookingWizard] = useState(false)
  const [showCancelledMessage, setShowCancelledMessage] = useState(false)

  // Handle booking button click - redirect to signup if not authenticated
  const handleBookParty = () => {
    if (authLoading) return

    if (isAuthenticated) {
      setShowBookingWizard(true)
    } else {
      // Redirect to signup with return URL
      router.push('/customer/signup?redirect=/parties')
    }
  }

  // Check for cancelled booking
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setShowCancelledMessage(true)
    }
  }, [searchParams])

  const handleBookingSuccess = (bookingId: string) => {
    // This typically won't be called as we redirect to Stripe
    console.log('Booking created:', bookingId)
  }

  return (
    <Layout>
      {/* Cancelled Message */}
      {showCancelledMessage && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <Card className="p-4 bg-amber-50 border-amber-200 shadow-lg max-w-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    Your booking was cancelled. No payment was processed.
                  </p>
                </div>
                <button
                  onClick={() => setShowCancelledMessage(false)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Summer Hours: Semi-Private notice (only renders during the summer window) */}
      <SummerPartyNotice />

      {/* Availability Calendar — the top of the page */}
      <PartyAvailabilityPreview
        onBookDate={() => {
          router.push('/customer/login?redirect=/customer/dashboard?tab=parties')
        }}
      />

      {/* Party Packages — the same cards as the homepage */}
      <div id="party-packages">
        <PartyPackageBackdrop onChoose={handleBookParty} />
      </div>

      {/* Cancellation & rescheduling policy — below the packages, before booking */}
      <PartyPolicy />

      {/* Booking Wizard Modal */}
      {showBookingWizard && (
        <PartyBookingWizard
          onClose={() => setShowBookingWizard(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </Layout>
  )
}

export default function PartiesPage() {
  return (
    <Suspense fallback={<Layout><div className="min-h-screen" /></Layout>}>
      <PartiesContent />
    </Suspense>
  )
}
