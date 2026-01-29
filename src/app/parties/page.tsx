'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/hooks/useAuth'
import { PartiesHero } from '@/components/parties/PartiesHero'
import { PartyPackageBackdrop } from '@/components/parties/PartyPackageBackdrop'
import { PartyBookingWizard } from '@/components/parties/PartyBookingWizard'
import { motion } from 'framer-motion'
import { Gift, Calendar, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PURCHASING_ENABLED } from '@/lib/feature-flags'

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

      <PartiesHero onBookParty={handleBookParty} />

      {/* Book Party CTA Section */}
      <section className="relative py-16 overflow-hidden min-h-[20rem] flex items-center bg-[#FFF8E7]/70">
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-charcoal-800 mb-4">
              Ready to Plan Your Perfect Party?
            </h2>
            <p className="text-lg text-charcoal-600 mb-8 max-w-2xl mx-auto">
              Book your child&apos;s birthday party at Busy Bees Indoor Play Center!
              Our easy booking process takes just a few minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleBookParty}
                disabled={!PURCHASING_ENABLED || authLoading}
                className="shadow-soft hover:shadow-medium transition-all duration-300"
              >
                <Gift className="w-6 h-6 mr-2" />
                {PURCHASING_ENABLED ? 'Book Your Party Now' : 'Coming Soon'}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  document.getElementById('party-packages')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
                className="border-2 border-primary-300 text-charcoal-700 hover:bg-primary-50"
              >
                <Calendar className="w-5 h-5 mr-2" />
                View Packages First
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-charcoal-600">
              <span className="flex items-center gap-1">
                ✓ 15 kids included
              </span>
              <span className="flex items-center gap-1">
                ✓ 2-hour party
              </span>
              <span className="flex items-center gap-1">
                ✓ Dedicated party host
              </span>
              <span className="flex items-center gap-1">
                ✓ Secure online payment
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Party Packages with Hexagon Backdrop */}
      <div id="party-packages">
        <PartyPackageBackdrop />
      </div>

      {/* Bottom CTA */}
      <section className="relative py-16 bg-charcoal-800 overflow-hidden">
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Let&apos;s Celebrate Together!
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Create magical memories at Busy Bees Indoor Play Center.
              Book your party today!
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleBookParty}
              disabled={!PURCHASING_ENABLED || authLoading}
              className="bg-primary-500 hover:bg-primary-600 text-charcoal-800 font-bold text-lg shadow-soft hover:shadow-medium border-0"
            >
              <Gift className="w-6 h-6 mr-2" />
              {PURCHASING_ENABLED ? 'Start Booking Now' : 'Coming Soon'}
            </Button>
          </motion.div>
        </div>
      </section>

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
