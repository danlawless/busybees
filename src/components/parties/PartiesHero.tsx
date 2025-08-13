'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Gift, Calendar, Users, Star, Sparkles, Clock } from 'lucide-react'
import { HoneycombPattern, FloatingHoneycombs } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const partyHighlights = [
  { icon: Gift, text: 'Stress-Free Setup', color: 'from-pink-200 to-pink-300' },
  { icon: Users, text: 'Up to 20 Kids', color: 'from-blue-200 to-blue-300' },
  { icon: Clock, text: '2 Hours of Fun', color: 'from-green-200 to-green-300' },
  { icon: Sparkles, text: 'Magical Memories', color: 'from-purple-200 to-purple-300' }
]

const quickStats = [
  { number: '500+', label: 'Parties Hosted', icon: Gift },
  { number: '4.9', label: 'Star Rating', icon: Star },
  { number: '100%', label: 'Smiles Guaranteed', icon: Sparkles },
  { number: '0', label: 'Stress for Parents', icon: Users }
]

export function PartiesHero() {
  return (
    <section className="relative overflow-hidden section-hexagon-dense hexagon-overlay py-20 sm:py-24">
      <HoneycombPattern variant="dense" size="xl" animated />
      <FloatingHoneycombs />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Side */}
          <motion.div
            className="text-center lg:text-left"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-center lg:justify-start mb-6">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-pink-100 to-purple-100 px-4 py-2 rounded-full">
                  <Gift className="w-5 h-5 text-pink-600" />
                  <span className="text-pink-800 font-medium text-sm">Birthday Parties</span>
                </div>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-6">
                The Most
                <span className="text-honey-gradient block">Epic Birthday</span>
                <span className="text-gradient bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Parties Ever!</span>
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
                    className="flex flex-col items-center space-y-2 card-pastel px-3 py-4 rounded-2xl shadow-soft group hover:shadow-medium transition-all duration-300"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${highlight.color} hexagon-shape flex items-center justify-center group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                      <Icon className="w-6 h-6 text-charcoal-700" />
                    </div>
                    <span className="text-xs font-medium text-charcoal-800 text-center">{highlight.text}</span>
                  </div>
                )
              })}
            </motion.div>
            
            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                onClick={() => {
                  document.getElementById('party-calendar-section')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Your Party Now
              </Button>
              <Button variant="outline" size="lg" className="border-2 border-honey-400 text-honey-700 hover:bg-honey-50">
                <Gift className="w-5 h-5 mr-2" />
                View Packages
              </Button>
            </motion.div>
            
            {/* Quick Stats */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            </motion.div>
          </motion.div>
          
          {/* Image Side */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              {/* Main Party Image */}
              <div className="aspect-[4/3] relative">
                <Image
                  src="/images/epic-party-action.jpg"
                  alt="Epic party in action - kids celebrating with pure joy"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                
                {/* Floating party elements */}
                <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-pink-200 to-pink-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape hexagon-float">
                  <Sparkles className="w-8 h-8 text-charcoal-600" />
                </div>
                
                <div className="absolute top-4 right-4 w-14 h-14 bg-gradient-to-br from-purple-200 to-purple-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape hexagon-rotate">
                  <Star className="w-7 h-7 text-charcoal-600" />
                </div>
                
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-blue-200 to-blue-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape hexagon-pulse">
                  <Users className="w-6 h-6 text-charcoal-600" />
                </div>
                
                <div className="absolute bottom-4 right-4 w-18 h-18 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape">
                  <div className="text-center text-charcoal-600">
                    <Calendar className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-xs font-bold">BOOK</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating testimonial bubble */}
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 max-w-xs card-pastel"
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
                <div className="w-10 h-10 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full flex items-center justify-center hexagon-shape">
                  <Star className="w-5 h-5 text-charcoal-600" />
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
