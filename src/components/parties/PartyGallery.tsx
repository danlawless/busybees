'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Camera, Star, Heart, Users, Gift, Sparkles } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const galleryImages = [
  {
    title: 'Princess Party Magic',
    description: 'Birthday girl and friends in princess costumes',
    category: 'Princess Theme',
    color: 'from-pink-100 to-purple-200',
    src: '/images/princess-party-magic.jpg'
  },
  {
    title: 'Superhero Squad',
    description: 'Kids in capes celebrating superhero style',
    category: 'Superhero Theme',
    color: 'from-blue-100 to-red-200',
    src: '/images/superhero-squad.jpg'
  },
  {
    title: 'Face Painting Fun',
    description: 'Professional face painter creating masterpieces',
    category: 'Entertainment',
    color: 'from-yellow-100 to-orange-200',
    src: '/images/face-painting-fun.jpg'
  },
  {
    title: 'Birthday Cake Moment',
    description: 'Special cake cutting celebration',
    category: 'Celebration',
    color: 'from-green-100 to-blue-200',
    src: '/images/birthday-cake-moment.jpg'
  },
  {
    title: 'Play Area Adventures',
    description: 'Kids having blast in our play zones',
    category: 'Play Time',
    color: 'from-purple-100 to-pink-200',
    src: '/images/play-area-adventures.jpg'
  },
  {
    title: 'Group Photo Joy',
    description: 'All party guests together with birthday child',
    category: 'Memories',
    color: 'from-honey-100 to-yellow-200',
    src: '/images/group-photo-joy.jpg'
  }
]

const testimonials = [
  {
    name: 'Sarah M.',
    child: 'Emma (Age 6)',
    rating: 5,
    text: 'Emma\'s princess party was absolutely perfect! The staff took care of everything and the kids had an amazing time. Worth every penny!',
    theme: 'Princess Party',
    date: '2 weeks ago'
  },
  {
    name: 'Mike T.',
    child: 'Jake (Age 8)',
    rating: 5,
    text: 'Best birthday party ever! The superhero theme was incredible and the balloon artist was a huge hit. Jake is still talking about it!',
    theme: 'Superhero Party',
    date: '1 month ago'
  },
  {
    name: 'Lisa K.',
    child: 'Sophia (Age 5)',
    rating: 5,
    text: 'The staff was amazing with the kids. Everything was so well organized and clean. Sophia felt like a real princess for the day!',
    theme: 'Princess Party',
    date: '3 weeks ago'
  },
  {
    name: 'David R.',
    child: 'Mason (Age 7)',
    rating: 5,
    text: 'Stress-free party planning! They handled everything perfectly. The kids loved the face painting and the play areas were spotless.',
    theme: 'Safari Party',
    date: '2 months ago'
  }
]

const partyStats = [
  { number: '500+', label: 'Parties Hosted', icon: Gift },
  { number: '98%', label: 'Return Customers', icon: Heart },
  { number: '4.9/5', label: 'Average Rating', icon: Star },
  { number: '2000+', label: 'Happy Kids', icon: Users }
]

export function PartyGallery() {
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
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 rounded-full text-sm font-medium mb-4">
            Party Gallery
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            See the <span className="text-gradient bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Magic</span> in Action
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Take a peek at some of our amazing parties and see why families choose 
            Busy Bees for their most special celebrations!
          </p>
        </motion.div>
        
        {/* Image Gallery */}
        <motion.div
          className="mb-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryImages.map((image, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="card-pastel group hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Generated Image */}
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <Image
                        src={image.src}
                        alt={image.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 text-center">
                            <p className="font-semibold text-charcoal-800 text-sm">{image.title}</p>
                            <p className="text-xs text-charcoal-600 mt-1">{image.category}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Party Stats */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="card-pastel">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-charcoal-800 text-center mb-8">
                Our <span className="text-honey-gradient">Party Success</span>
              </h3>
              
              <div className="grid md:grid-cols-4 gap-8">
                {partyStats.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-4 hexagon-pulse">
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      <div className="text-3xl font-bold text-honey-gradient mb-2">
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
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              What <span className="text-honey-gradient">Parents</span> Are Saying
            </h3>
            <p className="text-charcoal-600">
              Real reviews from real families who celebrated with us
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full card-pastel">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-200 rounded-full flex items-center justify-center hexagon-shape">
                          <Users className="w-6 h-6 text-charcoal-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-charcoal-800">{testimonial.name}</h4>
                          <p className="text-sm text-charcoal-600">{testimonial.child}</p>
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="flex space-x-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                        ))}
                      </div>
                    </div>
                    
                    {/* Review Text */}
                    <p className="text-charcoal-600 italic mb-4 leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="bg-honey-100 text-honey-800 px-3 py-1 rounded-full font-medium">
                        {testimonial.theme}
                      </span>
                      <span className="text-charcoal-500">{testimonial.date}</span>
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
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-white/20 hexagon-shape flex items-center justify-center mx-auto mb-6 hexagon-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-4">
                Ready to Create Amazing Memories?
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Join hundreds of families who've celebrated with us. Your child's perfect party awaits!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-purple-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                  📞 Call (555) 123-BEES
                </button>
                <button className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                  📅 Book Online Now
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
