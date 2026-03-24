'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { HoneycombPattern } from '@/components/ui/BeeIcon'

function FeatureIcon({ src, alt, title, className }: { src: string; alt: string; title: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className={`flex items-center justify-center text-charcoal-500 font-bold text-2xl ${className ?? ''}`} aria-hidden>
        {title.charAt(0)}
      </span>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={200}
      height={200}
      className={`object-contain w-full h-full ${className ?? ''}`}
      onError={() => setFailed(true)}
    />
  )
}

const features = [
  {
    iconSrc: '/icons/family-first.png',
    title: 'Built by Parents, for Parents',
    description: 'We understand the challenges of entertaining little ones! Our space was designed by a family who knows exactly what you need for a perfect day out.',
    highlight: 'Family-First Design',
    accentColor: 'bg-[#FFB3BA]/20',
    accentBorder: 'border-[#FFB3BA]/40',
    iconBg: 'bg-[#FFB3BA]/30',
  },
  {
    iconSrc: '/icons/safety.png',
    title: 'Safety That Gives You Peace of Mind',
    description: 'Relax while your kids play! Our dedicated infant areas, soft surfaces, and secure environment let you actually enjoy watching them explore.',
    highlight: 'Parent-Approved Safety',
    accentColor: 'bg-[#A8E6CF]/20',
    accentBorder: 'border-[#A8E6CF]/40',
    iconBg: 'bg-[#A8E6CF]/30',
  },
  {
    iconSrc: '/icons/all-ages.png',
    title: 'Perfect for Every Age & Stage',
    description: 'From crawling babies to energetic 6-year-olds, every child finds their perfect play space. No more "too young" or "too old" worries!',
    highlight: 'All Ages Welcome',
    accentColor: 'bg-[#B4D7E8]/20',
    accentBorder: 'border-[#B4D7E8]/40',
    iconBg: 'bg-[#B4D7E8]/30',
  },
  {
    iconSrc: '/icons/parties.png',
    title: 'Unforgettable Birthday Magic',
    description: 'Transform your child\'s special day into pure magic! Our private party room and expert staff handle everything so you can focus on making memories.',
    highlight: 'Stress-Free Parties',
    accentColor: 'bg-[#FFE08A]/20',
    accentBorder: 'border-[#FFE08A]/40',
    iconBg: 'bg-[#FFE08A]/30',
  },
  {
    iconSrc: '/icons/adult-space.png',
    title: 'Parents Deserve Fun Too!',
    description: 'Grab a coffee, chat with other parents, or simply enjoy watching your little ones play. Our comfortable seating areas are designed for you to relax and recharge.',
    highlight: 'Adult-Friendly Space',
    accentColor: 'bg-[#FFB3BA]/20',
    accentBorder: 'border-[#FFB3BA]/40',
    iconBg: 'bg-[#FFB3BA]/30',
  },
  {
    iconSrc: '/icons/clean.png',
    title: 'Clean, Fresh & Always Ready',
    description: 'Walk into a spotless environment every single time. Our rigorous cleaning protocols and premium materials ensure a fresh, healthy play experience.',
    highlight: 'Hospital-Grade Clean',
    accentColor: 'bg-[#A8E6CF]/20',
    accentBorder: 'border-[#A8E6CF]/40',
    iconBg: 'bg-[#A8E6CF]/30',
  },
]

export function Features() {
  return (
    <section className="relative py-24 sm:py-28 section-hexagon-light hexagon-overlay overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />


      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-charcoal-800 sm:text-5xl mb-5">
            Why Families <span className="text-honey-500">Love Us</span>
          </h2>
          <p className="text-xl text-charcoal-600 max-w-2xl mx-auto">
            We&apos;re not just another play center. We&apos;re parents who built the space we wished existed for our own families.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card padding="none" className={`h-full text-left group relative overflow-hidden ${feature.accentColor} border-2 ${feature.accentBorder} shadow-soft hover:shadow-honey transition-all duration-300 hover:-translate-y-1 rounded-3xl`}>
                  <CardContent className="p-0 flex flex-col">
                    {/* Icon area - top of card, fills container */}
                    <div className="bg-[#FFFDF7] rounded-t-3xl w-full h-48 sm:h-56 overflow-hidden relative p-3 sm:p-4 group-hover:scale-[1.02] transition-transform duration-300">
                      <div className="absolute inset-0">
                        <FeatureIcon
                          src={feature.iconSrc}
                          alt={feature.highlight}
                          title={feature.title}
                          className="w-full h-full"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 lg:p-8 flex-1">
                      <h3 className="text-xl font-bold text-charcoal-800 leading-tight mb-3">
                        {feature.title}
                      </h3>
                      <div className="flex justify-start mb-4">
                        <span className="text-sm font-medium text-charcoal-700 bg-white px-4 py-1.5 rounded-full border border-charcoal-200">
                          {feature.highlight}
                        </span>
                      </div>
                      <p className="text-charcoal-700 leading-relaxed text-base">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </motion.div>

        {/* Descriptive Text */}
        {/* Call to Action */}
      </div>
    </section>
  )
}
