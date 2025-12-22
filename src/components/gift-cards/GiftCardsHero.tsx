'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gift, CreditCard, Sparkles, Heart, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer } from '@/lib/utils';
import { PURCHASING_ENABLED } from '@/lib/feature-flags';

const features = [
  {
    icon: Heart,
    title: 'Perfect Gift',
    description: 'Give the gift of play and unforgettable memories',
  },
  {
    icon: Sparkles,
    title: 'Never Expires',
    description: 'Gift cards are good forever - no rush to redeem',
  },
  {
    icon: Send,
    title: 'Instant Delivery',
    description: 'Send directly to recipient or forward yourself',
  },
];

export function GiftCardsHero() {
  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-16 sm:py-20">
      <HoneycombPattern variant="dense" size="xl" />

      {/* Flying Bees */}
      <motion.div
        className="absolute left-8 top-1/4 z-10 hidden lg:block"
        initial={{ x: -100, opacity: 0, rotate: -20 }}
        animate={{ x: 0, opacity: 0.7, rotate: 0 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      >
        <Image
          src="/bee-flying-side2.png"
          alt=""
          width={120}
          height={120}
          className="drop-shadow-lg"
        />
      </motion.div>

      <motion.div
        className="absolute right-12 bottom-1/4 z-10 hidden lg:block"
        initial={{ x: 100, opacity: 0, rotate: 20 }}
        animate={{ x: 0, opacity: 0.7, rotate: 0 }}
        transition={{ duration: 1.2, delay: 0.7 }}
      >
        <Image
          src="/bee-flying-side1.png"
          alt=""
          width={100}
          height={100}
          className="drop-shadow-lg"
        />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg mb-6">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl mb-4">
              <span className="text-primary-600">Gift Cards</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-600">
              Give the gift of play! Perfect for birthdays, holidays, or just because.
              Your loved ones can use it for day passes, memberships, or party bookings.
            </p>
          </motion.div>

          {/* Main Action Cards */}
          <motion.div
            variants={fadeInUp}
            className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16"
          >
            {/* Purchase Card */}
            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-amber-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-yellow-50 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md mb-6">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal-800 mb-3">
                  Purchase a Gift Card
                </h2>
                <p className="text-charcoal-600 mb-6">
                  Choose an amount, add a personal message, and send it directly to someone special
                  or to yourself to forward later.
                </p>
                <ul className="space-y-2 mb-8 text-sm text-charcoal-600">
                  <li className="flex items-center">
                    <span className="text-amber-500 mr-2">✓</span>
                    Beautiful bee-themed digital card
                  </li>
                  <li className="flex items-center">
                    <span className="text-amber-500 mr-2">✓</span>
                    Add a personal message
                  </li>
                  <li className="flex items-center">
                    <span className="text-amber-500 mr-2">✓</span>
                    Preview before sending
                  </li>
                  <li className="flex items-center">
                    <span className="text-amber-500 mr-2">✓</span>
                    Instant email delivery
                  </li>
                </ul>
                {PURCHASING_ENABLED ? (
                  <Link href="/gift-cards/purchase">
                    <Button variant="primary" size="lg" className="w-full">
                      <Gift className="w-5 h-5 mr-2" />
                      Purchase Gift Card
                    </Button>
                  </Link>
                ) : (
                  <Button variant="primary" size="lg" className="w-full" disabled>
                    <Gift className="w-5 h-5 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </Card>

            {/* Redeem Card */}
            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-emerald-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-green-50 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal-800 mb-3">
                  Redeem a Gift Card
                </h2>
                <p className="text-charcoal-600 mb-6">
                  Have a gift card code? Redeem it here to add credit to your account.
                  Use it for any purchase at Busy Bees!
                </p>
                <ul className="space-y-2 mb-8 text-sm text-charcoal-600">
                  <li className="flex items-center">
                    <span className="text-emerald-500 mr-2">✓</span>
                    Enter your unique code
                  </li>
                  <li className="flex items-center">
                    <span className="text-emerald-500 mr-2">✓</span>
                    Credit added to your account instantly
                  </li>
                  <li className="flex items-center">
                    <span className="text-emerald-500 mr-2">✓</span>
                    Use for any purchase
                  </li>
                  <li className="flex items-center">
                    <span className="text-emerald-500 mr-2">✓</span>
                    Balance never expires
                  </li>
                </ul>
                {PURCHASING_ENABLED ? (
                  <Link href="/gift-cards/redeem">
                    <Button variant="outline" size="lg" className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Redeem Gift Card
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="lg" className="w-full border-gray-300 text-gray-500" disabled>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Features */}
          <motion.div variants={fadeInUp} className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-2xl bg-white/60 backdrop-blur-sm shadow-soft"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
                    <Icon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-charcoal-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-charcoal-600">{feature.description}</p>
                </div>
              );
            })}
          </motion.div>

          {/* Decorative Gift Card Preview */}
          <motion.div
            variants={fadeInUp}
            className="mt-16 flex justify-center"
          >
            <div className="relative">
              <div className="w-80 h-48 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="absolute top-4 right-4">
                  <Image
                    src="/busy-bees-logo.png"
                    alt="Busy Bees"
                    width={60}
                    height={60}
                    className="opacity-90"
                  />
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Gift Card</p>
                  <p className="text-white font-bold text-2xl">$50.00</p>
                  <p className="text-white/70 text-sm mt-2 font-mono">BBGC-XXXX-XXXX-XXXX</p>
                </div>
                {/* Honeycomb pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <pattern id="gift-honeycomb" patternUnits="userSpaceOnUse" width="20" height="17.32">
                      <polygon points="10,0 20,5.77 20,17.32 10,23.09 0,17.32 0,5.77" fill="none" stroke="white" strokeWidth="0.5"/>
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#gift-honeycomb)"/>
                  </svg>
                </div>
              </div>
              {/* Shadow card behind */}
              <div className="absolute -bottom-2 left-4 w-80 h-48 rounded-2xl bg-amber-900/20 -z-10 transform -rotate-3" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

