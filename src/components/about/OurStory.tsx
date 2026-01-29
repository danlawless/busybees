'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export function OurStory() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Hero background - same as home */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, rgba(255,253,247,0.5) 0%, transparent 40%, transparent 70%, rgba(255,248,231,0.4) 100%), url("/hero-background.png") center center / cover no-repeat',
          backgroundColor: 'var(--cream-white)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-primary-100 text-honey-800 rounded-full text-sm font-medium mb-4">
              Our Story
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-4">
              Built By a Family For <span className="text-honey-500">Families</span>
            </h1>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Story Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-charcoal-800">Our Story</h3>
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
          </motion.div>

          {/* Family Image - kept as requested */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-large border-2 border-primary-200/40">
              <div className="aspect-[4/3] relative">
                <Image
                  src="/family/image000000.jpeg"
                  alt="The Busy Bees Family - Founders"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
