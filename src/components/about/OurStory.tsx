'use client'

import { motion } from 'framer-motion'
import { Calendar, MapPin, Lightbulb, Target, Users } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp } from '@/lib/utils'

const timeline = [
  {
    year: '2014',
    title: 'The Dream Begins',
    description: 'Founded by parents who wanted a safe, clean, and engaging space for children to play and learn.',
    icon: Lightbulb
  },
  {
    year: '2016',
    title: 'Community Growth',
    description: 'Expanded our facility and introduced specialized programs for different age groups.',
    icon: Users
  },
  {
    year: '2019',
    title: 'Innovation Focus',
    description: 'Added interactive learning stations and STEM-focused play areas.',
    icon: Target
  },
  {
    year: '2024',
    title: 'Continuing Excellence',
    description: 'Celebrating 10 years of bringing joy to families with ongoing improvements and new programs.',
    icon: Calendar
  }
]

export function OurStory() {
  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="subtle" size="lg" animated />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
              Our Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
              A Decade of <span className="text-honey-gradient">Wonder</span>
            </h2>
            <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
              What started as a simple dream has grown into a beloved community hub where 
              thousands of families have created cherished memories.
            </p>
          </motion.div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Story Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-charcoal-800">
                Born from a Parent's Vision
              </h3>
              <p className="text-charcoal-600 leading-relaxed">
                Once upon a time, a husband and wife had a dream: to create an indoor play center 
                for young children in their hometown. Inspired by the many play spaces they visited 
                with their two young kids, they envisioned something uniquely their own.
              </p>
              <p className="text-charcoal-600 leading-relaxed">
                What began as a simple idea grew into a heartfelt mission: to provide a safe, 
                playful, and inviting space where children could explore, imagine, and make 
                memories—while parents could relax, connect, and feel at home.
              </p>
              <p className="text-charcoal-600 leading-relaxed">
                And so, Busy Bees was born—built by a family, for families, right here in our community.
              </p>
              
              <div className="flex items-center space-x-4 p-4 bg-honey-50 rounded-xl border border-honey-200">
                <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center hexagon-pulse">
                  <MapPin className="w-6 h-6 text-charcoal-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-charcoal-800">Our Location</h4>
                  <p className="text-charcoal-600 text-sm">Proudly serving the community from our beautiful facility</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Founders Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="aspect-[4/3] bg-gradient-to-br from-honey-100 via-pastel-yellow to-honey-200 rounded-3xl shadow-lg flex items-center justify-center">
                <div className="text-center text-charcoal-600">
                  <div className="w-20 h-20 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4 hexagon-shape">
                    <Users className="w-10 h-10 text-honey-600" />
                  </div>
                  <p className="text-lg font-semibold">Founders Photo</p>
                  <p className="text-sm opacity-75">Sarah & Mike Johnson</p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-honey-300 to-honey-400 rounded-full opacity-20 hexagon-rotate"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-pastel-yellow to-honey-200 rounded-full opacity-30 hexagon-float"></div>
            </div>
          </motion.div>
        </div>
        
        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h3 className="text-2xl font-bold text-charcoal-800 text-center mb-12">
            Our <span className="text-honey-gradient">Journey</span>
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {timeline.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full card-pastel group hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:from-honey-300 group-hover:to-honey-400 transition-all duration-300 hexagon-pulse">
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      <div className="text-2xl font-bold text-honey-gradient mb-2">
                        {item.year}
                      </div>
                      <h4 className="font-semibold text-charcoal-800 mb-3">
                        {item.title}
                      </h4>
                      <p className="text-sm text-charcoal-600 leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
