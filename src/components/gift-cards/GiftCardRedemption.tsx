'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Gift,
  ArrowLeft,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { logger } from '@/lib/client-logger';

interface ValidationResult {
  valid: boolean;
  error?: string;
  gift_card?: {
    amount: number;
    remaining_amount: number;
    status: string;
    purchaser_name: string;
    personal_message?: string;
  };
}

interface RedemptionResult {
  success: boolean;
  amount_credited?: number;
  new_balance?: number;
  message?: string;
  error?: string;
}

export function GiftCardRedemption() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Format the code as user types (BBGC-XXXX-XXXX-XXXX)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Auto-format with dashes
    const parts = value.replace(/-/g, '').match(/.{1,4}/g) || [];
    if (parts.length > 0 && parts[0].length === 4 && !parts[0].startsWith('BBGC')) {
      value = parts.join('-');
    } else if (parts.length > 1) {
      value = parts.slice(0, 4).join('-');
    }

    setCode(value);
    setValidation(null);
    setError(null);
  };

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Please enter a gift card code');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await fetch(`/api/gift-cards/redeem?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      setValidation(data);

      if (!data.valid) {
        setError(data.error || 'Invalid gift card code');
      }
    } catch (err) {
      logger.error({ error: err }, 'Failed to validate gift card');
      setError('Failed to validate gift card. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleRedeem = async () => {
    if (!user) {
      setError('Please log in to redeem your gift card');
      return;
    }

    setRedeeming(true);
    setError(null);

    try {
      const response = await fetch('/api/gift-cards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        setRedemptionResult(data);
      } else {
        setError(data.error || 'Failed to redeem gift card');
      }
    } catch (err) {
      logger.error({ error: err }, 'Failed to redeem gift card');
      setError('Failed to redeem gift card. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  // Show success state
  if (redemptionResult?.success) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20">
        <HoneycombPattern variant="dense" size="xl" />

        <div className="relative mx-auto max-w-xl px-4 sm:px-6 lg:px-8 z-20">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg mx-auto"
              >
                <Sparkles className="w-12 h-12 text-white" />
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h1 className="text-3xl font-bold text-charcoal-800 mb-4">
                Gift Card Redeemed! 🎉
              </h1>
              <p className="text-lg text-charcoal-600 mb-8">
                ${redemptionResult.amount_credited?.toFixed(2)} has been added to your account!
              </p>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="p-6 mb-8">
                <div className="text-center">
                  <p className="text-sm text-charcoal-500 mb-2">Your New Balance</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    ${redemptionResult.new_balance?.toFixed(2)}
                  </p>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp} className="space-y-4">
              <Link href="/customer/dashboard">
                <Button variant="primary" size="lg" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="lg" className="w-full">
                  Continue Browsing
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20">
      <HoneycombPattern variant="dense" size="xl" />

      <div className="relative mx-auto max-w-xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <Link
              href="/gift-cards"
              className="inline-flex items-center text-charcoal-600 hover:text-charcoal-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gift Cards
            </Link>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-charcoal-800 sm:text-4xl">
              Redeem Gift Card
            </h1>
            <p className="text-charcoal-600 mt-2">
              Enter your gift card code to add credit to your account
            </p>
          </motion.div>

          {/* Code Entry */}
          <motion.div variants={fadeInUp}>
            <Card className="p-8">
              {/* Code Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Gift Card Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="BBGC-XXXX-XXXX-XXXX"
                  maxLength={19}
                  className="w-full px-4 py-4 text-center text-xl font-mono tracking-wider rounded-2xl border border-primary-200/50 focus:ring-2 focus:ring-[#A8E6CF] focus:border-transparent uppercase bg-white"
                  disabled={validating || redeeming}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Validation Result */}
              {validation?.valid && validation.gift_card && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center mb-3">
                    <Check className="w-5 h-5 text-emerald-600 mr-2" />
                    <span className="font-semibold text-emerald-800">Valid Gift Card!</span>
                  </div>
                  <div className="space-y-2 text-sm text-charcoal-600">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold text-emerald-700">
                        ${validation.gift_card.remaining_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>From:</span>
                      <span className="font-medium">{validation.gift_card.purchaser_name}</span>
                    </div>
                    {validation.gift_card.personal_message && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-100">
                        <p className="text-xs text-charcoal-500 mb-1">Message:</p>
                        <p className="italic text-charcoal-700">
                          &ldquo;{validation.gift_card.personal_message}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!validation?.valid ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleValidate}
                  disabled={!code.trim() || validating}
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Validate Code
                    </>
                  )}
                </Button>
              ) : userLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : !user ? (
                <div className="space-y-4">
                  <p className="text-center text-charcoal-600 text-sm mb-4">
                    Please log in or create an account to redeem your gift card
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Link href={`/customer/login?redirect=/gift-cards/redeem&code=${encodeURIComponent(code)}`}>
                      <Button variant="primary" size="lg" className="w-full">
                        <LogIn className="w-4 h-4 mr-2" />
                        Log In
                      </Button>
                    </Link>
                    <Link href={`/customer/signup?redirect=/gift-cards/redeem&code=${encodeURIComponent(code)}`}>
                      <Button variant="outline" size="lg" className="w-full">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleRedeem}
                  disabled={redeeming}
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Redeem ${validation?.gift_card?.remaining_amount.toFixed(2)}
                    </>
                  )}
                </Button>
              )}
            </Card>
          </motion.div>

          {/* Help Text */}
          <motion.div variants={fadeInUp} className="mt-8 text-center text-sm text-charcoal-500">
            <p>
              Need help? Your gift card code is in the email you received.
              <br />
              It looks like: <span className="font-mono">BBGC-XXXX-XXXX-XXXX</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

