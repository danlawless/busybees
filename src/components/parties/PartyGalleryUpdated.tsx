'use client'

import { motion } from 'framer-motion'
import { Star, Heart, Users, Gift } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const galleryImages = [
  {
    title: 'Princess Party Magic',
    description: 'Birthday girl and friends in princess costumes',
    category: 'Princess Theme',
    src: '/images/princess-party-magic.jpg', // Generated image path
    alt: 'Children in princess costumes at birthday party'
  },
  {
    title: 'Superhero Squad',
    description: 'Kids in capes celebrating superhero style',
    category: 'Superhero Theme',
    src: '/images/superhero-squad.jpg', // Generated image path
    alt: 'Children in superhero costumes playing together'
  },
  {
    title: 'Face Painting Fun',
    description: 'Professional face painter creating masterpieces',
    category: 'Entertainment',
    src: '/images/face-painting-fun.jpg', // Generated image path
    alt: 'Face painter working on child at party'
  },
  {
    title: 'Birthday Cake Moment',
    description: 'Special cake cutting celebration',
    category: 'Celebration',
    src: '/images/birthday-cake-moment.jpg', // Generated image path
    alt: 'Birthday child blowing out candles on cake'
  },
  {
    title: 'Play Area Adventures',
    description: 'Kids having blast in our play zones',
    category: 'Play Time',
    src: '/images/play-area-adventures.jpg', // Generated image path
    alt: 'Children playing in indoor playground equipment'
  },
  {
    title: 'Group Photo Joy',
    description: 'All party guests together with birthday child',
    category: 'Memories',
    src: '/images/group-photo-joy.jpg', // Generated image path
    alt: 'Group photo of birthday party guests'
  }
]

const partyStats = [
  { number: '500+', label: 'Parties Hosted', icon: Gift },
  { number: '98%', label: 'Return Customers', icon: Heart },
  { number: '4.9/5', label: 'Average Rating', icon: Star },
  { number: '2000+', label: 'Happy Kids', icon: Users }
]

export function PartyGalleryUpdated() {
  return (
    <section className="relative py-20 section-hexagon-medium hexagon-overlay overflow-hidden">
      <HoneycombPattern variant="medium" size="lg" />
      
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
                    {/* Real Image or Placeholder */}
                    <ImagePlaceholder
                      src={image.src}
                      alt={image.alt}
                      description={image.description}
                      className="group-hover:scale-105 transition-transform duration-300"
                      priority={index < 3} // Load first 3 images with priority
                    />
                    
                    {/* Image Info Overlay */}
                    <div className="p-4">
                      <h3 className="font-semibold text-charcoal-800 mb-1">
                        {image.title}
                      </h3>
                      <p className="text-xs text-charcoal-600">
                        {image.category}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Party Stats - Same as before */}
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
      </div>
    </section>
  )
}
