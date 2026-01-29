'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Gift, Calendar, Users, Star, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { PURCHASING_ENABLED } from '@/lib/feature-flags'

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
  const { isAuthenticated, loading: authLoading } = useAuth()

  // Handle booking button click - redirect to signup if not authenticated
  const handleBookParty = () => {
    if (authLoading) return

    if (isAuthenticated) {
      // Use the callback prop to show booking wizard if provided
      if (onBookParty) {
        onBookParty()
      }
    } else {
      // Redirect to signup with return URL
      router.push('/customer/signup?redirect=/parties')
    }
  }

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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Side */}
          <motion.div
            className="text-center lg:text-left"
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
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button
                variant="primary"
                size="lg"
                className="shadow-soft hover:shadow-medium transition-all duration-300"
                onClick={handleBookParty}
                disabled={!PURCHASING_ENABLED || authLoading}
              >
                <Calendar className="w-5 h-5 mr-2" />
                {PURCHASING_ENABLED ? 'Book Your Party Now' : 'Coming Soon'}
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

          {/* Image Side */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-soft border border-primary-200/30">
              {/* Main Party Image */}
              <div className="aspect-[4/3] relative">
                <Image
                  src="/birthday-parties.png"
                  alt="Happy kids celebrating birthday party at Busy Bees"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />

                {/* Floating party elements - honey/amber theme */}
                <div className="absolute top-4 left-4 w-14 h-14 bg-primary-100 rounded-xl shadow-soft flex items-center justify-center border border-primary-200/50">
                  <Sparkles className="w-7 h-7 text-honey-600" />
                </div>

                <div className="absolute top-4 right-4 w-12 h-12 bg-primary-100 rounded-xl shadow-soft flex items-center justify-center border border-primary-200/50">
                  <Star className="w-6 h-6 text-honey-600" />
                </div>

                <div className="absolute bottom-4 left-4 w-12 h-12 bg-primary-100 rounded-xl shadow-soft flex items-center justify-center border border-primary-200/50">
                  <Users className="w-6 h-6 text-honey-600" />
                </div>

                <div className="absolute bottom-4 right-4 w-14 h-14 bg-primary-100 rounded-xl shadow-soft flex items-center justify-center border border-primary-200/50">
                  <div className="text-center text-honey-600">
                    <Calendar className="w-6 h-6 mx-auto mb-0.5" />
                    <p className="text-xs font-bold">BOOK</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating testimonial bubble */}
            <motion.div
              className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-soft border border-primary-200/30 p-4 max-w-xs"
              animate={{
                y: [0, -5, 0],
                rotate: [0, 1, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200/50">
                  <Star className="w-5 h-5 text-honey-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal-800">"Best party ever!"</p>
                  <p className="text-xs text-charcoal-600">- Happy Parent</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
