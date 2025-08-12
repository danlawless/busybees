'use client'

import { motion } from 'framer-motion'
import { Shield, Heart, Sparkles, Users, Leaf, BookOpen } from 'lucide-react'
import { HoneycombPattern, HexGrid } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const values = [
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Every element is designed with safety in mind, from soft play surfaces to secure entry systems.',
    color: 'from-red-200 to-red-300'
  },
  {
    icon: Heart,
    title: 'Family Focus',
    description: 'We create experiences that bring families together and strengthen bonds through play.',
    color: 'from-pink-200 to-pink-300'
  },
  {
    icon: Sparkles,
    title: 'Pure Joy',
    description: 'Every child deserves to experience the magic of uninhibited, creative play.',
    color: 'from-honey-200 to-honey-300'
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Building lasting friendships and connections within our local community.',
    color: 'from-blue-200 to-blue-300'
  },
  {
    icon: Leaf,
    title: 'Sustainability',
    description: 'Committed to eco-friendly practices and teaching environmental responsibility.',
    color: 'from-green-200 to-green-300'
  },
  {
    icon: BookOpen,
    title: 'Learning',
    description: 'Play-based learning that develops cognitive, social, and motor skills naturally.',
    color: 'from-purple-200 to-purple-300'
  }
]

export function ValuesSection() {
  return (
    <section className="relative py-20 section-charcoal-soft overflow-hidden">
      <HoneycombPattern variant="light" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Our Values
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-cream-white mb-6">
            What We <span className="text-honey-gradient">Stand For</span>
          </h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Our core values guide everything we do, from designing play spaces to 
            interacting with families. These principles ensure every visit is special.
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Values Grid */}
          <motion.div
            className="space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon
                return (
                  <motion.div key={index} variants={fadeInUp}>
                    <Card className="card-pastel group hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className={`w-14 h-14 bg-gradient-to-br ${value.color} hexagon-shape flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse`}>
                          <Icon className="w-7 h-7 text-charcoal-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-charcoal-800 mb-3">
                          {value.title}
                        </h3>
                        <p className="text-sm text-charcoal-600 leading-relaxed">
                          {value.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
          
          {/* Values Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <div className="aspect-[4/3] bg-gradient-to-br from-honey-100 via-pastel-yellow to-honey-200 flex items-center justify-center">
                <div className="text-center text-charcoal-600">
                  <div className="w-24 h-24 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4 hexagon-shape">
                    <Heart className="w-12 h-12 text-honey-600" />
                  </div>
                  <p className="text-lg font-semibold">Values in Action</p>
                  <p className="text-sm opacity-75">Children & families enjoying our space</p>
                </div>
              </div>
              
              {/* Floating value icons */}
              <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape hexagon-float">
                <Leaf className="w-8 h-8 text-charcoal-600" />
              </div>
              
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-blue-200 to-blue-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape hexagon-pulse">
                <Users className="w-8 h-8 text-charcoal-600" />
              </div>
              
              <div className="absolute bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-purple-200 to-purple-300 rounded-2xl shadow-lg flex items-center justify-center hexagon-shape hexagon-rotate">
                <BookOpen className="w-8 h-8 text-charcoal-600" />
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Card className="max-w-4xl mx-auto card-pastel">
            <CardContent className="p-8 md:p-12">
              <div className="w-20 h-20 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-6 hexagon-pulse">
                <Sparkles className="w-10 h-10 text-charcoal-700" />
              </div>
              <h3 className="text-2xl font-bold text-charcoal-800 mb-6">
                Our <span className="text-honey-gradient">Mission</span>
              </h3>
              <p className="text-lg text-charcoal-600 leading-relaxed mb-6">
                "To create a magical world where children can explore, learn, and grow through 
                the power of play, while providing families with a safe, clean, and welcoming 
                environment that fosters connection and joy."
              </p>
              <div className="flex justify-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey-gradient">10+</div>
                  <div className="text-sm text-charcoal-600">Years of Excellence</div>
                </div>
                <div className="w-px bg-honey-300 mx-4"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey-gradient">5000+</div>
                  <div className="text-sm text-charcoal-600">Happy Families</div>
                </div>
                <div className="w-px bg-honey-300 mx-4"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey-gradient">15+</div>
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
