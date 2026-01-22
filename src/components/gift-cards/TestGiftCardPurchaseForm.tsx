'use client';

/**
 * TEST Gift Card Purchase Form
 * Copy of GiftCardPurchaseForm with PURCHASING_ENABLED check removed
 * For internal testing only - not for production use
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  ArrowLeft,
  ArrowRight,
  Mail,
  User,
  MessageSquare,
  Eye,
  Send,
  CreditCard,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer } from '@/lib/utils';
import { GiftCardPreview } from './GiftCardPreview';
import { logger } from '@/lib/client-logger';

interface Denomination {
  id: string;
  amount: number;
  is_active: boolean;
  sort_order: number;
}

interface FormData {
  amount: number | null;
  purchaser_name: string;
  purchaser_email: string;
  recipient_name: string;
  recipient_email: string;
  personal_message: string;
  delivery_method: 'email_recipient' | 'email_self';
}

const steps = [
  { id: 'amount', title: 'Select Amount', icon: Gift },
  { id: 'details', title: 'Recipient Details', icon: User },
  { id: 'message', title: 'Add Message', icon: MessageSquare },
  { id: 'preview', title: 'Preview & Send', icon: Eye },
];

export function TestGiftCardPurchaseForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    amount: null,
    purchaser_name: '',
    purchaser_email: '',
    recipient_name: '',
    recipient_email: '',
    personal_message: '',
    delivery_method: 'email_recipient',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch denominations on mount
  useEffect(() => {
    async function fetchDenominations() {
      try {
        const response = await fetch('/api/gift-cards');
        if (response.ok) {
          const data = await response.json();
          setDenominations(data.denominations || []);
        }
      } catch (error) {
        logger.error({ error }, 'Failed to fetch denominations');
      } finally {
        setLoading(false);
      }
    }
    fetchDenominations();
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.amount) {
          newErrors.amount = 'Please select an amount';
        }
        break;
      case 1:
        if (!formData.purchaser_name.trim()) {
          newErrors.purchaser_name = 'Your name is required';
        }
        if (!formData.purchaser_email.trim()) {
          newErrors.purchaser_email = 'Your email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.purchaser_email)) {
          newErrors.purchaser_email = 'Please enter a valid email';
        }
        if (!formData.recipient_name.trim()) {
          newErrors.recipient_name = 'Recipient name is required';
        }
        if (!formData.recipient_email.trim()) {
          newErrors.recipient_email = 'Recipient email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipient_email)) {
          newErrors.recipient_email = 'Please enter a valid email';
        }
        break;
      case 2:
        // Message is optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSendTestEmail = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/gift-cards/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          test_email: formData.purchaser_email,
        }),
      });

      if (response.ok) {
        setTestEmailSent(true);
        setTimeout(() => setTestEmailSent(false), 5000);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const handlePurchase = async () => {
    setSending(true);
    try {
      // Create checkout session for gift card
      const response = await fetch('/api/gift-cards/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || 'Failed to create checkout session' });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to start checkout');
      setErrors({ submit: 'Failed to start checkout. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20 min-h-[600px] flex items-center justify-center">
        <HoneycombPattern variant="dense" size="xl" />
        <div className="relative z-20">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20">
      <HoneycombPattern variant="dense" size="xl" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* TEST MODE BANNER */}
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-800">TEST MODE</p>
                <p className="text-sm text-orange-700">
                  This is a hidden test page for verifying Stripe integration.
                  Not linked from main navigation.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-charcoal-600 hover:text-charcoal-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-charcoal-800 sm:text-4xl">
              <span className="text-primary-600">TEST: Purchase a Gift Card</span>
            </h1>
          </motion.div>

          {/* Progress Steps */}
          <motion.div variants={fadeInUp} className="mb-12">
            <div className="flex items-center justify-center">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isComplete = index < currentStep;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isComplete
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-amber-500 text-white shadow-lg scale-110'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <p
                        className={`mt-2 text-xs font-medium hidden sm:block ${
                          isActive ? 'text-amber-600' : 'text-charcoal-500'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300 ${
                          index < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Form Content */}
          <motion.div variants={fadeInUp}>
            <Card className="p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Select Amount */}
                {currentStep === 0 && (
                  <motion.div
                    key="amount"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-6">
                      Choose a Gift Card Amount
                    </h2>
                    {denominations.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-charcoal-600">No denominations configured.</p>
                        <p className="text-sm text-charcoal-500 mt-2">
                          Add gift card denominations in the database to test.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {denominations.map((denom) => (
                          <button
                            key={denom.id}
                            onClick={() => updateFormData('amount', denom.amount)}
                            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                              formData.amount === denom.amount
                                ? 'border-amber-500 bg-amber-50 shadow-md scale-105'
                                : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                            }`}
                          >
                            <span className="text-2xl font-bold text-charcoal-800">
                              ${denom.amount}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.amount && (
                      <p className="mt-4 text-red-500 text-sm">{errors.amount}</p>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Recipient Details */}
                {currentStep === 1 && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-6">
                      Enter Details
                    </h2>

                    {/* Your Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-charcoal-600 uppercase tracking-wide">
                        Your Information
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Your Name
                          </label>
                          <input
                            type="text"
                            value={formData.purchaser_name}
                            onChange={(e) => updateFormData('purchaser_name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.purchaser_name ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                            placeholder="John Doe"
                          />
                          {errors.purchaser_name && (
                            <p className="mt-1 text-red-500 text-sm">{errors.purchaser_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Your Email
                          </label>
                          <input
                            type="email"
                            value={formData.purchaser_email}
                            onChange={(e) => updateFormData('purchaser_email', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.purchaser_email ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                            placeholder="you@example.com"
                          />
                          {errors.purchaser_email && (
                            <p className="mt-1 text-red-500 text-sm">{errors.purchaser_email}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recipient Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-charcoal-600 uppercase tracking-wide">
                        Recipient Information
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Recipient Name
                          </label>
                          <input
                            type="text"
                            value={formData.recipient_name}
                            onChange={(e) => updateFormData('recipient_name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.recipient_name ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                            placeholder="Jane Doe"
                          />
                          {errors.recipient_name && (
                            <p className="mt-1 text-red-500 text-sm">{errors.recipient_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Recipient Email
                          </label>
                          <input
                            type="email"
                            value={formData.recipient_email}
                            onChange={(e) => updateFormData('recipient_email', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.recipient_email ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                            placeholder="recipient@example.com"
                          />
                          {errors.recipient_email && (
                            <p className="mt-1 text-red-500 text-sm">{errors.recipient_email}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-charcoal-600 uppercase tracking-wide">
                        Delivery Method
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => updateFormData('delivery_method', 'email_recipient')}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.delivery_method === 'email_recipient'
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-gray-200 hover:border-amber-300'
                          }`}
                        >
                          <Mail className="w-5 h-5 text-amber-600 mb-2" />
                          <p className="font-medium text-charcoal-800">Send to Recipient</p>
                          <p className="text-sm text-charcoal-600">
                            Email sent directly to {formData.recipient_name || 'recipient'}
                          </p>
                        </button>
                        <button
                          onClick={() => updateFormData('delivery_method', 'email_self')}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.delivery_method === 'email_self'
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-gray-200 hover:border-amber-300'
                          }`}
                        >
                          <Send className="w-5 h-5 text-amber-600 mb-2" />
                          <p className="font-medium text-charcoal-800">Send to Me</p>
                          <p className="text-sm text-charcoal-600">
                            You&apos;ll receive it to forward yourself
                          </p>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Personal Message */}
                {currentStep === 2 && (
                  <motion.div
                    key="message"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-6">
                      Add a Personal Message (Optional)
                    </h2>
                    <div>
                      <textarea
                        value={formData.personal_message}
                        onChange={(e) => updateFormData('personal_message', e.target.value)}
                        rows={5}
                        maxLength={500}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        placeholder="Write a heartfelt message for the recipient..."
                      />
                      <p className="mt-2 text-sm text-charcoal-500 text-right">
                        {formData.personal_message.length}/500 characters
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Preview */}
                {currentStep === 3 && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-6">
                      Preview Your Gift Card
                    </h2>

                    {/* Gift Card Preview */}
                    <div className="mb-8">
                      <GiftCardPreview
                        amount={formData.amount || 0}
                        recipientName={formData.recipient_name}
                        purchaserName={formData.purchaser_name}
                        personalMessage={formData.personal_message}
                      />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h3 className="font-semibold text-charcoal-800 mb-4">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-charcoal-600">Gift Card Amount</span>
                          <span className="font-medium">${formData.amount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-charcoal-600">From</span>
                          <span className="font-medium">{formData.purchaser_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-charcoal-600">To</span>
                          <span className="font-medium">{formData.recipient_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-charcoal-600">Delivery</span>
                          <span className="font-medium">
                            {formData.delivery_method === 'email_recipient'
                              ? formData.recipient_email
                              : formData.purchaser_email}
                          </span>
                        </div>
                        <hr className="my-3" />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-amber-600">${formData.amount?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant="outline"
                        onClick={handleSendTestEmail}
                        disabled={sending}
                        className="flex-1"
                      >
                        {testEmailSent ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Test Email Sent!
                          </>
                        ) : sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Test Email
                          </>
                        )}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handlePurchase}
                        disabled={sending}
                        className="flex-1"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Proceed to Checkout (Stripe)
                          </>
                        )}
                      </Button>
                    </div>

                    {errors.submit && (
                      <p className="mt-4 text-red-500 text-sm text-center">{errors.submit}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              {currentStep < 3 && (
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={currentStep === 0 ? 'invisible' : ''}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleNext}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex justify-start mt-8 pt-6 border-t">
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Edit
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
