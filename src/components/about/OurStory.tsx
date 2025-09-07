'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { HoneycombPattern } from '@/components/ui/BeeIcon'

export function OurStory() {
  return (
    <section className="relative py-20 sm:py-24 section-hexagon-dense hexagon-overlay overflow-hidden">
      <HoneycombPattern variant="dense" size="xl" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-6">
              Built By a Family For <span className="text-honey-gradient">Families</span>
            </h1>
          </motion.div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Story Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-charcoal-800 mb-4">Our Story</h3>
              <p className="text-lg text-charcoal-600 leading-relaxed">
                Once upon a time, a husband and wife had a dream: to create an indoor play center 
                for young children in or around their hometown. Inspired by the many play spaces 
                they visited with their two young kids, they envisioned something uniquely their 
                own—something that reflected their values and love for family fun.
              </p>
              <p className="text-lg text-charcoal-600 leading-relaxed">
                What began as a simple idea soon grew into a heartfelt mission: to provide a safe, 
                playful, and inviting space where children could explore, imagine, and make 
                memories—while their parents and guardians could relax, connect, and feel at home.
              </p>
              <p className="text-lg text-charcoal-600 leading-relaxed">
                And so, Busy Bees was born—built by a family, for families, right here in our community.
              </p>
            </div>
          </motion.div>
          
          {/* Family Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl shadow-lg overflow-hidden">
                <Image
                  src="/images/family/busy-bees-family.png"
                  alt="The Busy Bees Family"
                  fill
                  className="object-cover rounded-3xl"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-honey-300 to-honey-400 rounded-full opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-pastel-yellow to-honey-200 rounded-full opacity-30"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
