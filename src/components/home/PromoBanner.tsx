'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { PromoSpecial, getPromoStatus, generatePromoMessages, dismissBanner } from '@/lib/utils/promoHelpers';
import { getBannerStyleComponent } from './PromoBannerStyles';

interface PromoBannerProps {
  promo: PromoSpecial;
  onDismiss?: () => void;
}

export function PromoBanner({ promo, onDismiss }: PromoBannerProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const status = getPromoStatus(promo);
  const messages = generatePromoMessages(promo);

  // Rotate messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promo.stripeCouponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismissBanner(promo.id);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  const BannerStyleWrapper = getBannerStyleComponent(promo.bannerStyle);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <BannerStyleWrapper promo={promo}>
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Message and Countdown */}
            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              {/* Rotating Message */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={messageIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-gray-900 font-bold text-lg sm:text-xl lg:text-2xl"
                  >
                    {messages[messageIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border-2 border-yellow-600">
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {status.daysRemaining}
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">
                        {status.daysRemaining === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                    <div className="text-orange-600 text-xl font-bold">:</div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {status.hoursRemaining.toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">
                        {status.hoursRemaining === 1 ? 'Hour' : 'Hours'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Discount Badge and Code */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Discount Badge */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                className="hidden sm:block bg-red-500 text-white rounded-full px-4 py-2 shadow-xl border-4 border-white"
              >
                <div className="text-3xl font-black">
                  {promo.discountPercent}%
                </div>
                <div className="text-xs uppercase font-bold tracking-wide">
                  OFF
                </div>
              </motion.div>

              {/* Promo Code */}
              <button
                onClick={handleCopyCode}
                className="bg-white/95 backdrop-blur-sm hover:bg-white transition-colors rounded-lg px-4 py-3 shadow-lg border-2 border-yellow-600 group"
                aria-label="Copy promo code"
              >
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                      Use Code
                    </div>
                    <div className="text-lg font-mono font-bold text-gray-900">
                      {promo.stripeCouponCode}
                    </div>
                  </div>
                  <div className="ml-2">
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                    )}
                  </div>
                </div>
              </button>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-5 w-5 text-gray-900" />
              </button>
            </div>
          </div>

          {/* Mobile Discount Badge */}
          <div className="sm:hidden mt-3 flex justify-center">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className="bg-red-500 text-white rounded-full px-6 py-3 shadow-xl border-4 border-white inline-flex items-center gap-2"
            >
              <div className="text-3xl font-black">
                {promo.discountPercent}%
              </div>
              <div className="text-xs uppercase font-bold tracking-wide">
                OFF
              </div>
            </motion.div>
          </div>

          {/* Copied Feedback */}
          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl font-bold text-lg z-10"
              >
                ✓ Code Copied!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </BannerStyleWrapper>
      </motion.div>
    </AnimatePresence>
  );
}

