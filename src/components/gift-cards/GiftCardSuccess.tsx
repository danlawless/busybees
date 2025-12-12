'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Gift, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer } from '@/lib/utils';

export function GiftCardSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Brief loading to allow webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20 min-h-[600px] flex items-center justify-center">
        <HoneycombPattern variant="dense" size="xl" />
        <div className="relative z-20 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-charcoal-600">Processing your gift card...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20">
      <HoneycombPattern variant="dense" size="xl" />

      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="text-center"
        >
          {/* Success Icon */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="relative inline-block">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -right-2 -top-2 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shadow-md"
              >
                <Gift className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div variants={fadeInUp}>
            <h1 className="text-3xl font-bold tracking-tight text-charcoal-800 sm:text-4xl mb-4">
              Gift Card Purchased! 🎉
            </h1>
            <p className="text-lg text-charcoal-600 mb-8">
              Your gift card has been created and the email is on its way.
            </p>
          </motion.div>

          {/* Info Card */}
          <motion.div variants={fadeInUp}>
            <Card className="p-8 text-left mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal-800 mb-2">
                    Email Sent!
                  </h3>
                  <p className="text-charcoal-600 text-sm">
                    A beautifully designed gift card email has been sent to the recipient.
                    They&apos;ll find their unique redemption code inside, along with your
                    personal message.
                  </p>
                </div>
              </div>

              <hr className="my-6" />

              <div className="space-y-4 text-sm text-charcoal-600">
                <div className="flex items-center">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Gift card code generated and saved
                </div>
                <div className="flex items-center">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Payment processed successfully
                </div>
                <div className="flex items-center">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Email delivered to recipient
                </div>
              </div>
            </Card>
          </motion.div>

          {/* What's Next */}
          <motion.div variants={fadeInUp}>
            <Card className="p-6 bg-amber-50 border-amber-200 mb-8">
              <h3 className="font-semibold text-charcoal-800 mb-3 flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-600 mr-2" />
                What Happens Next?
              </h3>
              <p className="text-sm text-charcoal-600">
                The recipient will receive an email with their gift card code. They can
                redeem it at{' '}
                <Link href="/gift-cards" className="text-amber-600 font-medium hover:underline">
                  busybeesipc.com/gift-cards
                </Link>{' '}
                to add credit to their Busy Bees account. The credit never expires and
                can be used for any purchase!
              </p>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/gift-cards/purchase">
              <Button variant="primary" size="lg">
                <Gift className="w-5 h-5 mr-2" />
                Buy Another Gift Card
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Return Home
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

