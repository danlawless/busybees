'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

function ValueIcon({ src, alt, title, className }: { src: string; alt: string; title: string; className?: string }) {
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

const values = [
  { iconSrc: '/icons/value-safety.png', title: 'Safety First', description: 'Every element is designed with safety in mind, from soft play surfaces to secure entry systems.', accentColor: 'bg-[#A8E6CF]/20', accentBorder: 'border-[#A8E6CF]/40' },
  { iconSrc: '/icons/value-family.png', title: 'Family Focus', description: 'We create experiences that bring families together and strengthen bonds through play.', accentColor: 'bg-[#FFB3BA]/20', accentBorder: 'border-[#FFB3BA]/40' },
  { iconSrc: '/icons/value-joy.png', title: 'Pure Joy', description: 'Every child deserves to experience the magic of uninhibited, creative play.', accentColor: 'bg-[#FFE08A]/20', accentBorder: 'border-[#FFE08A]/40' },
  { iconSrc: '/icons/value-community.png', title: 'Community', description: 'Building lasting friendships and connections within our local community.', accentColor: 'bg-[#B4D7E8]/20', accentBorder: 'border-[#B4D7E8]/40' },
  { iconSrc: '/icons/value-sustainability.png', title: 'Sustainability', description: 'Committed to eco-friendly practices and teaching environmental responsibility.', accentColor: 'bg-[#A8E6CF]/20', accentBorder: 'border-[#A8E6CF]/40' },
  { iconSrc: '/icons/value-learning.png', title: 'Learning', description: 'Play-based learning that develops cognitive, social, and motor skills naturally.', accentColor: 'bg-[#E8D5F2]/20', accentBorder: 'border-[#E8D5F2]/40' },
]

export function ValuesSection() {
  return (
    <section className="relative py-24 sm:py-28 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-primary-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Our Values
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
            What We <span className="text-honey-500">Stand For</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Our core values guide everything we do, from designing play spaces to interacting with families.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {values.map((value, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card padding="none" className={`h-full text-left group relative overflow-hidden ${value.accentColor} border-2 ${value.accentBorder} shadow-soft hover:shadow-honey transition-all duration-300 hover:-translate-y-1 rounded-3xl`}>
                <CardContent className="p-0 flex flex-col">
                  <div className="w-full h-48 sm:h-56 bg-white overflow-hidden relative p-3 sm:p-4">
                    <div className="absolute inset-0">
                      <ValueIcon src={value.iconSrc} alt={value.title} title={value.title} className="w-full h-full" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-charcoal-800 mb-3">{value.title}</h3>
                    <p className="text-charcoal-600 leading-relaxed text-sm">{value.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <Card className="max-w-4xl mx-auto border-2 border-primary-200/50 shadow-soft">
            <CardContent className="p-8 md:p-12 text-center">
              <h3 className="text-2xl font-bold text-charcoal-800 mb-6">
                Our <span className="text-honey-500">Mission</span>
              </h3>
              <p className="text-lg text-charcoal-600 leading-relaxed mb-8">
                &ldquo;To create a magical world where children can explore, learn, and grow through
                the power of play, while providing families with a safe, clean, and welcoming
                environment that fosters connection and joy.&rdquo;
              </p>
              <div className="flex flex-wrap justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey-600">10+</div>
                  <div className="text-sm text-charcoal-600">Years of Excellence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey-600">5000+</div>
                  <div className="text-sm text-charcoal-600">Happy Families</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey-600">15+</div>
                  <div className="text-sm text-charcoal-600">Safety Certifications</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
