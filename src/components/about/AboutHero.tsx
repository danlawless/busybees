'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Heart, Users, Star, Award } from 'lucide-react'
import { HoneycombPattern, FloatingHoneycombs } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const stats = [
  { icon: Heart, value: '10+', label: 'Years of Love' },
  { icon: Users, value: '5000+', label: 'Happy Families' },
  { icon: Star, value: '4.9', label: 'Average Rating' },
  { icon: Award, value: '15+', label: 'Safety Awards' }
]

export function AboutHero() {
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
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
                Our Story
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-6">
                Where Little
                <span className="text-honey-gradient block">Dreamers</span>
                Come to Play
              </h1>
            </motion.div>
            
            <motion.p variants={fadeInUp} className="text-lg text-charcoal-600 mb-8 leading-relaxed">
              For over a decade, Busy Bees has been the premier destination for families 
              seeking safe, fun, and educational play experiences. We're more than just 
              an indoor playground – we're a community where children's imaginations soar 
              and lifelong memories are made.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card key={index} className="text-center card-pastel">
                    <CardContent className="p-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-3 hexagon-pulse">
                        <Icon className="w-5 h-5 text-charcoal-700" />
                      </div>
                      <div className="text-2xl font-bold text-honey-gradient mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs text-charcoal-600 font-medium">
                        {stat.label}
                      </div>
                    </CardContent>
                  </Card>
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
              {/* Main Hero Image */}
              <div className="aspect-[4/3] relative">
                <Image
                  src="/images/children-playing-happily.jpg"
                  alt="Children playing happily at Busy Bees"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              
              {/* Floating overlay images */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-2xl shadow-lg overflow-hidden hexagon-shape">
                <Image
                  src="/images/team-photo.jpg"
                  alt="Busy Bees Team"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
              
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-gradient-to-br from-honey-200 to-honey-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape">
                <div className="text-center text-charcoal-600">
                  <Award className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-xs font-medium">Awards</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
