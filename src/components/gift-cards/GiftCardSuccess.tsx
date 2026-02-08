'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Gift, Mail, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/productHelpers';

interface VerificationResult {
  status: 'complete' | 'processing' | 'payment_pending';
  payment_status: string;
  message?: string;
  gift_card?: {
    amount: number;
    recipient_name: string;
    recipient_email: string;
    purchaser_name: string;
    delivery_method: string;
    email_sent: boolean;
    card_status: string;
  };
  amount?: number | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  purchaser_name?: string | null;
  delivery_method?: string | null;
}

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 3000;

export function GiftCardSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const verifyPurchase = useCallback(async () => {
    if (!sessionId || !isMountedRef.current) return;

    try {
      const response = await fetch(
        `/api/gift-cards/verify?session_id=${encodeURIComponent(sessionId)}`
      );
      const data = await response.json();

      if (!isMountedRef.current) return;

      if (!response.ok) {
        setError(data.error || 'Failed to verify purchase');
        setLoading(false);
        return;
      }

      setVerification(data);
      setError(null);
      setLoading(false);

      // If still processing (rare — only if creation itself failed), retry a few times
      if (data.status === 'processing' && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        timerRef.current = setTimeout(verifyPurchase, RETRY_INTERVAL_MS);
      }
    } catch {
      if (!isMountedRef.current) return;
      setError('Unable to verify your purchase. Please check your email for confirmation.');
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;

    // Small delay to let Stripe finalize the redirect
    timerRef.current = setTimeout(verifyPurchase, 1000);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [verifyPurchase]);

  const handleManualRetry = () => {
    retryCountRef.current = 0;
    setLoading(true);
    setError(null);
    verifyPurchase();
  };

  // Extract display data
  const amount = verification?.gift_card?.amount ?? verification?.amount;
  const recipientName = verification?.gift_card?.recipient_name ?? verification?.recipient_name;
  const recipientEmail = verification?.gift_card?.recipient_email ?? verification?.recipient_email;
  const deliveryMethod = verification?.gift_card?.delivery_method ?? verification?.delivery_method;
  const emailSent = verification?.gift_card?.email_sent ?? false;
  const isComplete = verification?.status === 'complete';
  const isProcessing = verification?.status === 'processing';
  const retriesExhausted = isProcessing && retryCountRef.current >= MAX_RETRIES;

  if (loading && !verification) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20 min-h-[600px] flex items-center justify-center">
        <HoneycombPattern variant="dense" size="xl" />
        <div className="relative z-20 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-charcoal-600">Verifying your purchase...</p>
        </div>
      </section>
    );
  }

  if (error && !verification) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20 min-h-[600px] flex items-center justify-center">
        <HoneycombPattern variant="dense" size="xl" />
        <div className="relative z-20 text-center max-w-lg mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-charcoal-800 mb-4">
            Verification Issue
          </h2>
          <p className="text-charcoal-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleManualRetry} variant="primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/gift-cards">
              <Button variant="outline">
                Back to Gift Cards
              </Button>
            </Link>
          </div>
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
              Gift Card Purchased!
            </h1>
            <p className="text-lg text-charcoal-600 mb-8">
              {isComplete && emailSent
                ? 'Your gift card has been created and the email has been delivered.'
                : isComplete
                ? 'Your gift card has been created and the email is on its way.'
                : 'Payment confirmed! Your gift card is being prepared...'}
            </p>
          </motion.div>

          {/* Purchase Details Card */}
          {amount && (
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-left mb-8">
                <h3 className="font-semibold text-charcoal-800 mb-4 text-lg">
                  Purchase Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-charcoal-600">Amount</span>
                    <span className="font-bold text-charcoal-800 text-lg">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  {recipientName && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-charcoal-600">Recipient</span>
                      <span className="font-medium text-charcoal-800">{recipientName}</span>
                    </div>
                  )}
                  {recipientEmail && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-charcoal-600">
                        {deliveryMethod === 'email_self' ? 'Sent to (you)' : 'Sent to'}
                      </span>
                      <span className="text-charcoal-800">{recipientEmail}</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Status Card */}
          <motion.div variants={fadeInUp}>
            <Card className="p-8 text-left mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal-800 mb-2">
                    {isComplete && emailSent
                      ? 'Email Delivered!'
                      : retriesExhausted
                      ? 'Processing Taking Longer Than Expected'
                      : 'Email on the Way!'}
                  </h3>
                  <p className="text-charcoal-600 text-sm">
                    {retriesExhausted
                      ? 'Your payment was successful. The gift card email may take a few minutes to arrive. If you don\'t receive it within 10 minutes, please contact us at info@busybeesipc.com.'
                      : deliveryMethod === 'email_self'
                      ? 'A beautifully designed gift card email has been sent to you. You can forward it to the recipient whenever you\'re ready.'
                      : 'A beautifully designed gift card email has been sent to the recipient. They\'ll find their unique redemption code inside, along with your personal message.'}
                  </p>
                </div>
              </div>

              <hr className="my-6" />

              <div className="space-y-4 text-sm text-charcoal-600">
                <div className="flex items-center">
                  <span className="text-emerald-500 mr-2">&#10003;</span>
                  Payment processed successfully
                </div>
                <div className="flex items-center">
                  {isComplete ? (
                    <span className="text-emerald-500 mr-2">&#10003;</span>
                  ) : retriesExhausted ? (
                    <span className="text-amber-500 mr-2">&#9888;</span>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500 mr-2" />
                  )}
                  Gift card code generated and saved
                </div>
                <div className="flex items-center">
                  {isComplete && emailSent ? (
                    <span className="text-emerald-500 mr-2">&#10003;</span>
                  ) : retriesExhausted ? (
                    <span className="text-amber-500 mr-2">&#9888;</span>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500 mr-2" />
                  )}
                  Email delivered to recipient
                </div>
              </div>

              {retriesExhausted && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <Button onClick={handleManualRetry} variant="outline" size="sm" className="rounded-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Again
                  </Button>
                </div>
              )}
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
