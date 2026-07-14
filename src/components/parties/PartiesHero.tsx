'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Gift, Calendar, Users, Star, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'
interface PartiesHeroProps {
  onBookParty?: () => void
}

const partyHighlights = [
  { icon: Gift, text: 'Stress-Free Setup' },
  { icon: Users, text: 'Up to 20 Kids' },
  { icon: Clock, text: '2 Hours of Fun' },
  { icon: Sparkles, text: 'Magical Memories' }
]

const quickStats = [
  { number: '500+', label: 'Parties Hosted', icon: Gift },
  { number: '4.9', label: 'Star Rating', icon: Star },
  { number: '100%', label: 'Smiles Guaranteed', icon: Sparkles },
  { number: '0', label: 'Stress for Parents', icon: Users }
]

export function PartiesHero({ onBookParty }: PartiesHeroProps) {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 min-h-[28rem]">
      {/* Hero background - in-component so it always shows */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <Image
          src="/hero-background.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF7]/20 via-transparent to-[#FFF8E7]/15" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Content */}
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>


              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-6">
                Let's Party!
              </h1>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-lg text-charcoal-600 mb-8 leading-relaxed">
              Let us handle everything while you enjoy watching your child's face light up!
              Our all-inclusive party packages make celebrating stress-free and absolutely magical.
            </motion.p>

            {/* Party Highlights */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {partyHighlights.map((highlight, index) => {
                const Icon = highlight.icon
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-2 bg-white/90 backdrop-blur-sm px-3 py-4 rounded-2xl shadow-soft border border-primary-200/30 group hover:shadow-medium transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-honey-600" />
                    </div>
                    <span className="text-xs font-medium text-charcoal-800 text-center">{highlight.text}</span>
                  </div>
                )
              })}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                variant="primary"
                size="lg"
                className="shadow-soft hover:shadow-medium transition-all duration-300"
                onClick={() => router.push('/customer/login')}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Purchase in My Account
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-primary-300 text-charcoal-700 hover:bg-primary-50"
                onClick={() => {
                  document.getElementById('party-packages')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
              >
                <Gift className="w-5 h-5 mr-2" />
                View Packages
              </Button>
            </motion.div>

            {/* Quick Stats hidden until opening */}
            {/* <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {quickStats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-2 hexagon-pulse">
                      <Icon className="w-5 h-5 text-charcoal-700" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-honey-gradient">
                      {stat.number}
                    </div>
                    <div className="text-xs text-charcoal-600 font-medium">
                      {stat.label}
                    </div>
                  </div>
                )
              })}
            </motion.div> */}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
