'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Heart, Gift, Calendar, Users, Star, MessageCircle } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const communityInitiatives = [
  {
    icon: Heart,
    title: 'Community Outreach',
    description: 'Regular charity events and fundraisers supporting local families in need.',
    image: 'Community event with families volunteering',
    src: '/images/community-outreach.jpg'
  },
  {
    icon: Gift,
    title: 'Birthday Celebrations',
    description: 'Special birthday packages that create unforgettable memories for children.',
    image: 'Birthday party celebration in play area',
    src: '/images/birthday-celebration-play.jpg'
  },
  {
    icon: Calendar,
    title: 'Special Events',
    description: 'Seasonal celebrations, educational workshops, and family fun days.',
    image: 'Holiday themed decorations and activities',
    src: '/images/holiday-decorations.jpg'
  },
  {
    icon: Users,
    title: 'Parent Groups',
    description: 'Support networks for parents to connect, share experiences, and build friendships.',
    image: 'Parents chatting while children play',
    src: '/images/parents-chatting.jpg'
  }
]

const testimonials = [
  {
    name: 'Jennifer Martinez',
    role: 'Mother of 2',
    content: 'Busy Bees has been a lifesaver! My kids love coming here, and I love that I can relax knowing they\'re safe and having fun.',
    rating: 5
  },
  {
    name: 'David Thompson',
    role: 'Father of 3',
    content: 'The staff is incredible. They truly care about each child and go above and beyond to make every visit special.',
    rating: 5
  },
  {
    name: 'Maria Garcia',
    role: 'Grandmother',
    content: 'I bring my grandchildren here regularly. It\'s clean, safe, and the activities are both fun and educational.',
    rating: 5
  }
]

const stats = [
  { number: '50+', label: 'Community Events', icon: Calendar },
  { number: '200+', label: 'Birthday Parties', icon: Gift },
  { number: '$25K+', label: 'Raised for Charity', icon: Heart },
  { number: '1000+', label: 'Parent Connections', icon: Users }
]

export function CommunitySection() {
  return (
    <section className="relative py-20 section-hexagon-medium hexagon-overlay overflow-hidden">
      <HoneycombPattern variant="medium" size="lg" animated />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Our Community
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            More Than Just <span className="text-honey-gradient">Play</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            We're deeply committed to our community, creating connections that extend far beyond our walls 
            and making a positive impact in the lives of local families.
          </p>
        </motion.div>
        
        {/* Community Initiatives */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {communityInitiatives.map((initiative, index) => {
            const Icon = initiative.icon
            return (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full card-pastel group hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    {/* Community Image */}
                    <div className="aspect-[4/3] rounded-2xl mb-4 overflow-hidden relative">
                      <Image
                        src={initiative.src}
                        alt={initiative.image}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>
                    
                    <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse">
                      <Icon className="w-6 h-6 text-charcoal-700" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-charcoal-800 mb-3">
                      {initiative.title}
                    </h3>
                    <p className="text-sm text-charcoal-600 leading-relaxed">
                      {initiative.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
        
        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <Card className="card-pastel">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-charcoal-800 text-center mb-8">
                Our <span className="text-honey-gradient">Community Impact</span>
              </h3>
              
              <div className="grid md:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-3 hexagon-pulse">
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      <div className="text-3xl font-bold text-honey-gradient mb-1">
                        {stat.number}
                      </div>
                      <div className="text-sm text-charcoal-600 font-medium">
                        {stat.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              What Families Are <span className="text-honey-gradient">Saying</span>
            </h3>
            <p className="text-charcoal-600">
              Don't just take our word for it – hear from the families who make Busy Bees special
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full card-pastel">
                  <CardContent className="p-6">
                    {/* Profile Image Placeholder */}
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-honey-100 to-honey-200 rounded-full flex items-center justify-center mr-3 hexagon-shape">
                        <Users className="w-6 h-6 text-honey-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-charcoal-800">{testimonial.name}</h4>
                        <p className="text-sm text-charcoal-600">{testimonial.role}</p>
                      </div>
                    </div>
                    
                    {/* Rating */}
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-honey-500 fill-current" />
                      ))}
                    </div>
                    
                    {/* Quote */}
                    <div className="relative">
                      <MessageCircle className="w-6 h-6 text-honey-300 absolute -top-1 -left-1" />
                      <p className="text-charcoal-600 italic leading-relaxed pl-6">
                        "{testimonial.content}"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Card className="max-w-2xl mx-auto card-pastel">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-6 hexagon-pulse">
                <Heart className="w-8 h-8 text-charcoal-700" />
              </div>
              
              <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
                Join Our <span className="text-honey-gradient">Community</span>
              </h3>
              <p className="text-charcoal-600 mb-6 leading-relaxed">
                Become part of the Busy Bees family! Whether you're planning your first visit 
                or looking to get more involved in our community initiatives, we'd love to connect with you.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Plan Your Visit
                </Button>
                <Button variant="outline" size="lg" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Join Parent Group
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
