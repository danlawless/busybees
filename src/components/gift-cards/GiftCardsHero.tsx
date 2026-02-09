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
    accent: 'bg-[#FFB3BA]/25',
  },
  {
    icon: Sparkles,
    title: 'Never Expires',
    description: 'Gift cards are good forever - no rush to redeem',
    accent: 'bg-[#A8E6CF]/25',
  },
  {
    icon: Send,
    title: 'Instant Delivery',
    description: 'Send directly to recipient or forward yourself',
    accent: 'bg-[#B4D7E8]/25',
  },
];

export function GiftCardsHero() {
  return (
    <section className="relative overflow-hidden section-hexagon-medium hexagon-overlay py-20 sm:py-28">
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

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-14">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 shadow-honey mb-6">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl mb-5">
              <span className="text-primary-600">Gift Cards</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-charcoal-600 leading-relaxed">
              Give the gift of play! Perfect for birthdays, holidays, or just because.
              Your loved ones can use it for day passes, memberships, or party bookings.
            </p>
          </motion.div>

          {/* Main Action Cards */}
          <motion.div
            variants={fadeInUp}
            className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto mb-20"
          >
            {/* Purchase Card */}
            <Card className="p-9 hover:shadow-honey transition-all duration-300 border-2 border-transparent hover:border-primary-300 group relative overflow-hidden rounded-3xl">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-primary-100 to-primary-50 rounded-bl-full opacity-40 group-hover:opacity-80 transition-opacity" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-500 shadow-soft mb-6">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal-800 mb-3">
                  Purchase a Gift Card
                </h2>
                <p className="text-charcoal-600 mb-6 leading-relaxed">
                  Choose an amount, add a personal message, and send it directly to someone special
                  or to yourself to forward later.
                </p>
                <ul className="space-y-2.5 mb-8 text-sm text-charcoal-600">
                  <li className="flex items-center">
                    <span className="text-primary-500 mr-2.5">✓</span>
                    Beautiful bee-themed digital card
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary-500 mr-2.5">✓</span>
                    Add a personal message
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary-500 mr-2.5">✓</span>
                    Preview before sending
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary-500 mr-2.5">✓</span>
                    Instant email delivery
                  </li>
                </ul>
                {PURCHASING_ENABLED ? (
                  <Link href="/gift-cards/purchase">
                    <Button variant="primary" size="lg" className="w-full rounded-full">
                      <Gift className="w-5 h-5 mr-2" />
                      Purchase Gift Card
                    </Button>
                  </Link>
                ) : (
                  <Button variant="primary" size="lg" className="w-full rounded-full" disabled>
                    <Gift className="w-5 h-5 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </Card>

            {/* Redeem Card */}
            <Card className="p-9 hover:shadow-honey transition-all duration-300 border-2 border-transparent hover:border-[#A8E6CF] group relative overflow-hidden rounded-3xl">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#A8E6CF]/30 to-[#A8E6CF]/10 rounded-bl-full opacity-40 group-hover:opacity-80 transition-opacity" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6cc9a1] to-[#4db887] shadow-soft mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal-800 mb-3">
                  Redeem a Gift Card
                </h2>
                <p className="text-charcoal-600 mb-6 leading-relaxed">
                  Have a gift card code? Redeem it here to add credit to your account.
                  Use it for any purchase at Busy Bees!
                </p>
                <ul className="space-y-2.5 mb-8 text-sm text-charcoal-600">
                  <li className="flex items-center">
                    <span className="text-[#4db887] mr-2.5">✓</span>
                    Enter your unique code
                  </li>
                  <li className="flex items-center">
                    <span className="text-[#4db887] mr-2.5">✓</span>
                    Credit added to your account instantly
                  </li>
                  <li className="flex items-center">
                    <span className="text-[#4db887] mr-2.5">✓</span>
                    Use for any purchase
                  </li>
                  <li className="flex items-center">
                    <span className="text-[#4db887] mr-2.5">✓</span>
                    Balance never expires
                  </li>
                </ul>
                {PURCHASING_ENABLED ? (
                  <Link href="/gift-cards/redeem">
                    <Button variant="outline" size="lg" className="w-full rounded-full border-[#A8E6CF] text-[#3a9d73] hover:bg-[#A8E6CF]/15">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Redeem Gift Card
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="lg" className="w-full rounded-full border-charcoal-300 text-charcoal-500" disabled>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Photo Accent Strip */}
          <motion.div variants={fadeInUp} className="max-w-5xl mx-auto mb-20">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 rounded-3xl overflow-hidden">
              {['/album/MH_12631.jpg', '/album/MH_12668.jpg', '/album/MH_12706.jpg', '/album/MH_12756.jpg'].map((src, i) => (
                <div key={i} className="relative aspect-[3/2] overflow-hidden">
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="25vw"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-charcoal-500 mt-3">
              Give the gift of unforgettable play experiences
            </p>
          </motion.div>

          {/* Features */}
          <motion.div variants={fadeInUp} className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-7 rounded-3xl bg-white/60 backdrop-blur-sm shadow-soft border border-primary-200/20"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${feature.accent} mb-5`}>
                    <Icon className="w-7 h-7 text-charcoal-700" />
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
            className="mt-20 flex justify-center"
          >
            <div className="relative">
              <div
                className="w-80 h-48 rounded-3xl shadow-honey p-6 transform rotate-3 hover:rotate-0 transition-transform duration-300 overflow-hidden"
                style={{
                  background: 'linear-gradient(to bottom right, #FFC933, #FFB900, #E6A600)',
                }}
              >
                {/* Honeycomb pattern behind content */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <pattern id="gift-hero-honeycomb" patternUnits="userSpaceOnUse" width="20" height="17.32">
                      <polygon points="10,0 20,5.77 20,17.32 10,23.09 0,17.32 0,5.77" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#gift-hero-honeycomb)" />
                  </svg>
                </div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/90 text-xs uppercase tracking-wide">Gift Card</p>
                      <p className="text-white font-bold text-sm mt-0.5">Busy Bees</p>
                    </div>
                    <Image
                      src="/busy-bees-logo.png"
                      alt=""
                      width={48}
                      height={48}
                      className="opacity-95 shrink-0"
                    />
                  </div>
                  <div className="mt-auto pt-4">
                    <p className="text-white font-bold text-2xl">$50.00</p>
                    <p className="text-white/90 text-sm mt-1.5 font-mono tracking-wide">BBGC-XXXX-XXXX-XXXX</p>
                  </div>
                </div>
              </div>
              {/* Shadow card behind */}
              <div
                className="absolute -bottom-2 left-4 w-80 h-48 rounded-3xl -z-10 transform -rotate-3"
                style={{ backgroundColor: 'rgba(153, 109, 0, 0.2)' }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
