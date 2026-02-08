'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Clock,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer } from '@/lib/utils';
import { GiftCardPreview } from './GiftCardPreview';
import { logger } from '@/lib/client-logger';
import { PURCHASING_ENABLED } from '@/lib/feature-flags';
import { useAuth } from '@/hooks/useAuth';

// Gift card purchase intent stored in sessionStorage
interface GiftCardPurchaseIntent {
  amount: number | null;
  recipient_name: string;
  recipient_email: string;
  personal_message: string;
  delivery_method: 'email_recipient' | 'email_self';
}

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

export function GiftCardPurchaseForm() {
  const router = useRouter();
  const { isAuthenticated, userProfile, loading: authLoading } = useAuth();
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

  // Check for purchase intent on mount and pre-fill form
  useEffect(() => {
    if (!authLoading && isAuthenticated && userProfile) {
      // Pre-fill purchaser info from user profile (skip internal staff accounts)
      const isInternalAccount =
        userProfile.email?.endsWith('@busybees.internal') ||
        userProfile.role === 'staff' ||
        userProfile.role === 'admin';

      if (!isInternalAccount) {
        setFormData((prev) => ({
          ...prev,
          purchaser_name: prev.purchaser_name || userProfile.name || '',
          purchaser_email: prev.purchaser_email || userProfile.email || '',
        }));
      }

      // Check for stored purchase intent (from redirect after signup)
      const storedIntent = sessionStorage.getItem('giftCardPurchaseIntent');
      if (storedIntent) {
        try {
          const intent: GiftCardPurchaseIntent = JSON.parse(storedIntent);
          setFormData((prev) => ({
            ...prev,
            amount: intent.amount ?? prev.amount,
            recipient_name: intent.recipient_name || prev.recipient_name,
            recipient_email: intent.recipient_email || prev.recipient_email,
            personal_message: intent.personal_message || prev.personal_message,
            delivery_method: intent.delivery_method || prev.delivery_method,
          }));
          // Clear the stored intent
          sessionStorage.removeItem('giftCardPurchaseIntent');
          // Skip to the step after amount if amount was pre-selected
          if (intent.amount) {
            setCurrentStep(1);
          }
        } catch {
          sessionStorage.removeItem('giftCardPurchaseIntent');
        }
      }
    }
  }, [authLoading, isAuthenticated, userProfile]);

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
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store purchase intent for after signup/login
      const purchaseIntent: GiftCardPurchaseIntent = {
        amount: formData.amount,
        recipient_name: formData.recipient_name,
        recipient_email: formData.recipient_email,
        personal_message: formData.personal_message,
        delivery_method: formData.delivery_method,
      };
      sessionStorage.setItem('giftCardPurchaseIntent', JSON.stringify(purchaseIntent));
      // Redirect to signup with return URL
      router.push('/customer/signup?redirect=/gift-cards/purchase');
      return;
    }

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
        logger.error({ error: error.error, status: response.status }, 'Gift card checkout failed');
        // Handle 401 unauthorized - redirect to login
        if (response.status === 401) {
          const purchaseIntent: GiftCardPurchaseIntent = {
            amount: formData.amount,
            recipient_name: formData.recipient_name,
            recipient_email: formData.recipient_email,
            personal_message: formData.personal_message,
            delivery_method: formData.delivery_method,
          };
          sessionStorage.setItem('giftCardPurchaseIntent', JSON.stringify(purchaseIntent));
          router.push('/customer/signup?redirect=/gift-cards/purchase');
          return;
        }
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

  // Show Coming Soon message when purchasing is disabled
  if (!PURCHASING_ENABLED) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-24 min-h-[600px] flex items-center justify-center">
        <HoneycombPattern variant="dense" size="xl" />
        <div className="relative z-20 text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary-500" />
          </div>
          <h2 className="text-3xl font-bold text-charcoal-800 mb-4">Coming Soon</h2>
          <p className="text-charcoal-600 mb-8">
            Gift card purchases will be available soon. Check back later!
          </p>
          <Link href="/gift-cards">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gift Cards
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-24 min-h-[600px] flex items-center justify-center">
        <HoneycombPattern variant="dense" size="xl" />
        <div className="relative z-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-24">
      <HoneycombPattern variant="dense" size="xl" />

      <div className="relative mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 z-20">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-10">
            <Link
              href="/gift-cards"
              className="inline-flex items-center text-charcoal-600 hover:text-charcoal-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gift Cards
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-charcoal-800 sm:text-4xl">
              <span className="text-primary-600">Purchase a Gift Card</span>
            </h1>
          </motion.div>

          {/* Progress Steps */}
          <motion.div variants={fadeInUp} className="mb-10">
            <div className="flex items-center justify-center">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isComplete = index < currentStep;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => { if (isComplete) setCurrentStep(index); }}
                      disabled={!isComplete}
                      className="flex flex-col items-center group"
                    >
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isComplete
                            ? 'bg-[#6cc9a1] text-white cursor-pointer group-hover:scale-110'
                            : isActive
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110'
                            : 'bg-charcoal-100 text-charcoal-400'
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <p
                        className={`mt-2 text-[10px] sm:text-xs font-medium transition-colors ${
                          isActive ? 'text-primary-600' : isComplete ? 'text-[#6cc9a1]' : 'text-charcoal-400'
                        }`}
                      >
                        {step.title}
                      </p>
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-8 sm:w-20 h-0.5 mx-1 sm:mx-2 rounded-full transition-all duration-300 mb-5 ${
                          index < currentStep ? 'bg-[#6cc9a1]' : 'bg-charcoal-200'
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
            <Card className="p-9 rounded-3xl">
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
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-2">
                      Choose a Gift Card Amount
                    </h2>
                    <p className="text-sm text-charcoal-500 mb-7">
                      Select how much you&apos;d like to gift. Valid for all Busy Bees purchases.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                      {denominations.map((denom) => {
                        const isSelected = Number(formData.amount) === Number(denom.amount);
                        return (
                          <button
                            key={denom.id}
                            onClick={() => updateFormData('amount', denom.amount)}
                            className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400 shadow-lg shadow-amber-400/30 scale-105 ring-2 ring-amber-300 ring-offset-2'
                                : 'border-charcoal-200 bg-white hover:border-amber-300 hover:bg-amber-50 hover:shadow-lg hover:shadow-amber-400/15 hover:scale-[1.04]'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <span className={`text-2xl font-bold ${
                              isSelected
                                ? 'text-charcoal-800'
                                : 'text-charcoal-800'
                            }`}>
                              ${denom.amount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
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
                    className="space-y-7"
                  >
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-2">
                      Who&apos;s this gift for?
                    </h2>
                    <p className="text-sm text-charcoal-500 mb-7">
                      Tell us about you and the lucky recipient.
                    </p>

                    {/* Your Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-charcoal-700 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs">1</span>
                        Your Information
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                            Your Name
                          </label>
                          <input
                            type="text"
                            value={formData.purchaser_name}
                            onChange={(e) => updateFormData('purchaser_name', e.target.value)}
                            autoComplete="off"
                            className={`w-full px-4 py-3 rounded-xl border ${
                              errors.purchaser_name ? 'border-red-400' : 'border-primary-200/50'
                            } focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white`}
                            placeholder="John Doe"
                          />
                          {errors.purchaser_name && (
                            <p className="mt-1 text-red-500 text-sm">{errors.purchaser_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                            Your Email
                          </label>
                          <input
                            type="email"
                            value={formData.purchaser_email}
                            onChange={(e) => updateFormData('purchaser_email', e.target.value)}
                            autoComplete="off"
                            className={`w-full px-4 py-3 rounded-xl border ${
                              errors.purchaser_email ? 'border-red-400' : 'border-primary-200/50'
                            } focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white`}
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
                      <h3 className="text-sm font-semibold text-charcoal-700 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs">2</span>
                        Recipient Information
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                            Recipient Name
                          </label>
                          <input
                            type="text"
                            value={formData.recipient_name}
                            onChange={(e) => updateFormData('recipient_name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border ${
                              errors.recipient_name ? 'border-red-400' : 'border-primary-200/50'
                            } focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white`}
                            placeholder="Jane Doe"
                          />
                          {errors.recipient_name && (
                            <p className="mt-1 text-red-500 text-sm">{errors.recipient_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                            Recipient Email
                          </label>
                          <input
                            type="email"
                            value={formData.recipient_email}
                            onChange={(e) => updateFormData('recipient_email', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border ${
                              errors.recipient_email ? 'border-red-400' : 'border-primary-200/50'
                            } focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white`}
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
                      <h3 className="text-sm font-semibold text-charcoal-700 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs">3</span>
                        Delivery Method
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-5">
                        {([
                          { value: 'email_recipient' as const, icon: Mail, label: 'Send to Recipient', desc: `Email sent directly to ${formData.recipient_name || 'recipient'}` },
                          { value: 'email_self' as const, icon: Send, label: 'Send to Me', desc: "You'll receive it to forward yourself" },
                        ]).map((option) => {
                          const isSelected = formData.delivery_method === option.value;
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.value}
                              onClick={() => updateFormData('delivery_method', option.value)}
                              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-400 shadow-lg shadow-amber-400/30 ring-2 ring-amber-300 ring-offset-2'
                                  : 'border-charcoal-200 bg-white hover:border-amber-300 hover:bg-amber-50 hover:shadow-md'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                              <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-charcoal-700' : 'text-charcoal-400'}`} />
                              <p className={`font-medium ${isSelected ? 'text-charcoal-800' : 'text-charcoal-800'}`}>
                                {option.label}
                              </p>
                              <p className={`text-sm ${isSelected ? 'text-charcoal-700/70' : 'text-charcoal-500'}`}>
                                {option.desc}
                              </p>
                            </button>
                          );
                        })}
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
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-2">
                      Add a Personal Message
                    </h2>
                    <p className="text-sm text-charcoal-500 mb-7">
                      Optional - this will appear on the gift card email. Skip it if you prefer!
                    </p>
                    <div>
                      <textarea
                        value={formData.personal_message}
                        onChange={(e) => updateFormData('personal_message', e.target.value)}
                        rows={5}
                        maxLength={500}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-primary-200/40 focus:ring-2 focus:ring-primary-300 focus:border-primary-300 resize-none bg-white text-charcoal-800 placeholder:text-charcoal-400"
                        placeholder="e.g., Happy Birthday! Hope you enjoy some playtime at Busy Bees! 🐝"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-charcoal-400">
                          {formData.personal_message.length === 0 ? 'Tip: A personal touch makes it special!' : ''}
                        </p>
                        <p className={`text-xs ${formData.personal_message.length > 450 ? 'text-amber-500' : 'text-charcoal-400'}`}>
                          {formData.personal_message.length}/500
                        </p>
                      </div>
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
                    <h2 className="text-xl font-semibold text-charcoal-800 mb-7">
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
                    <div className="bg-primary-50/40 rounded-2xl p-7 mb-7">
                      <h3 className="font-semibold text-charcoal-800 mb-4">Order Summary</h3>
                      <div className="space-y-2.5 text-sm">
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
                        <hr className="my-3 border-primary-200/40" />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary-600">${formData.amount?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Authentication Notice */}
                    {!authLoading && !isAuthenticated && (
                      <div className="mb-7 p-5 bg-primary-50 border border-primary-200/50 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <LogIn className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-charcoal-800">
                              Account required to purchase
                            </p>
                            <p className="text-sm text-charcoal-600 mt-1">
                              Please sign up or log in to complete your gift card purchase.
                              Your gift card details will be saved.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant="outline"
                        onClick={handleSendTestEmail}
                        disabled={sending}
                        className="flex-1 rounded-full"
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
                        disabled={sending || authLoading}
                        className="flex-1 rounded-full"
                      >
                        {authLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : !isAuthenticated ? (
                          <>
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign Up to Purchase
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Proceed to Checkout
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
                <div className="flex justify-between mt-9 pt-7 border-t border-primary-100/50">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={`rounded-full ${currentStep === 0 ? 'invisible' : ''}`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleNext} className="rounded-full">
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex justify-start mt-9 pt-7 border-t border-primary-100/50">
                  <Button variant="outline" onClick={handleBack} className="rounded-full">
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
