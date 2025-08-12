'use client'

import { motion } from 'framer-motion'
import { Palette, Camera, Music, Utensils, Gift, Sparkles } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const themes = [
  {
    name: 'Princess & Knights',
    image: 'Princess castle with knight decorations',
    colors: ['from-pink-200', 'to-purple-300'],
    icon: '👑'
  },
  {
    name: 'Superhero Adventure',
    image: 'Superhero cityscape with capes and masks',
    colors: ['from-blue-200', 'to-red-300'],
    icon: '🦸‍♂️'
  },
  {
    name: 'Under the Sea',
    image: 'Ocean theme with mermaids and sea creatures',
    colors: ['from-blue-200', 'to-teal-300'],
    icon: '🧜‍♀️'
  },
  {
    name: 'Safari Adventure',
    image: 'Jungle theme with animal decorations',
    colors: ['from-green-200', 'to-yellow-300'],
    icon: '🦁'
  },
  {
    name: 'Space Explorer',
    image: 'Galaxy theme with rockets and planets',
    colors: ['from-purple-200', 'to-blue-300'],
    icon: '🚀'
  },
  {
    name: 'Rainbow Unicorn',
    image: 'Magical unicorn theme with rainbows',
    colors: ['from-pink-200', 'to-rainbow'],
    icon: '🦄'
  }
]

const entertainers = [
  {
    name: 'Face Painting Artist',
    description: 'Professional face painter creates amazing designs for every child',
    duration: '1-2 hours',
    price: 75,
    image: 'Face painter with colorful designs',
    icon: Palette
  },
  {
    name: 'Balloon Sculptor',
    description: 'Watch in amazement as balloons transform into animals and shapes',
    duration: '1-2 hours',
    price: 85,
    image: 'Balloon artist creating sculptures',
    icon: Gift
  },
  {
    name: 'DJ & Dance Party',
    description: 'Get the party moving with age-appropriate music and dance games',
    duration: '2 hours',
    price: 150,
    image: 'DJ with kids dancing',
    icon: Music
  },
  {
    name: 'Magic Show',
    description: 'Professional magician performs interactive magic show',
    duration: '45 minutes',
    price: 200,
    image: 'Magician performing tricks',
    icon: Sparkles
  }
]

const foodOptions = [
  {
    name: 'Pizza Party Pack',
    description: 'Fresh cheese and pepperoni pizzas for all guests',
    serves: 'Up to 20 kids',
    price: 49,
    image: 'Fresh pizza boxes',
    popular: true
  },
  {
    name: 'Healthy Snack Box',
    description: 'Fruit cups, veggie sticks, cheese cubes, and crackers',
    serves: 'Up to 20 kids',
    price: 35,
    image: 'Colorful healthy snacks',
    popular: false
  },
  {
    name: 'Sweet Treats Table',
    description: 'Cupcakes, cookies, and candy station',
    serves: 'Up to 20 kids',
    price: 45,
    image: 'Dessert table with treats',
    popular: false
  },
  {
    name: 'Custom Birthday Cake',
    description: 'Personalized cake with your child\'s favorite theme',
    serves: 'Up to 20 kids',
    price: 65,
    image: 'Beautiful custom birthday cake',
    popular: true
  }
]

export function PartyExtras() {
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
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full text-sm font-medium mb-4">
            Party Extras
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Customize Your <span className="text-gradient bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">Dream Party</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Make your celebration truly unique with our amazing themes, entertainment, 
            and delicious food options. Mix and match to create the perfect party!
          </p>
        </motion.div>
        
        {/* Party Themes */}
        <motion.div
          className="mb-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              🎨 Amazing <span className="text-honey-gradient">Party Themes</span>
            </h3>
            <p className="text-charcoal-600">
              Transform your party space with our magical themed decorations
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map((theme, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="card-pastel group hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Theme Image Placeholder */}
                    <div className={`aspect-[4/3] bg-gradient-to-br ${theme.colors[0]} ${theme.colors[1]} flex items-center justify-center relative`}>
                      <div className="text-center text-charcoal-600">
                        <div className="text-4xl mb-2">{theme.icon}</div>
                        <p className="text-sm font-medium px-4">{theme.image}</p>
                      </div>
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                        <Button 
                          className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0"
                          variant="outline"
                        >
                          Choose Theme
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-semibold text-charcoal-800 text-center">
                        {theme.name}
                      </h4>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Entertainment Options */}
        <motion.div
          className="mb-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              🎭 Professional <span className="text-honey-gradient">Entertainment</span>
            </h3>
            <p className="text-charcoal-600">
              Add amazing entertainment to keep the kids engaged and excited
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {entertainers.map((entertainer, index) => {
              const Icon = entertainer.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="card-pastel group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-6">
                        {/* Image Placeholder */}
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 via-pink-100 to-purple-200 rounded-2xl flex items-center justify-center hexagon-shape group-hover:scale-105 transition-transform duration-300">
                            <div className="text-center text-charcoal-600">
                              <Icon className="w-8 h-8 mx-auto mb-1" />
                              <p className="text-xs font-medium">Photo</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-charcoal-800">
                              {entertainer.name}
                            </h4>
                            <span className="text-xl font-bold text-honey-gradient">
                              +${entertainer.price}
                            </span>
                          </div>
                          
                          <p className="text-charcoal-600 text-sm mb-3 leading-relaxed">
                            {entertainer.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-500 bg-honey-50 px-2 py-1 rounded">
                              {entertainer.duration}
                            </span>
                            <Button size="sm" variant="outline">
                              Add to Party
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
        
        {/* Food Options */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
              🍕 Delicious <span className="text-honey-gradient">Food Options</span>
            </h3>
            <p className="text-charcoal-600">
              Keep everyone happy and energized with our tasty food selections
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {foodOptions.map((food, index) => (
              <motion.div key={index} variants={fadeInUp} className="relative">
                {food.popular && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      POPULAR
                    </div>
                  </div>
                )}
                
                <Card className="h-full card-pastel group hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    {/* Food Image Placeholder */}
                    <div className="aspect-square bg-gradient-to-br from-orange-100 via-yellow-100 to-orange-200 rounded-2xl mb-4 flex items-center justify-center">
                      <div className="text-center text-charcoal-600">
                        <Utensils className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs font-medium px-2">{food.image}</p>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h4 className="font-semibold text-charcoal-800 mb-2">
                        {food.name}
                      </h4>
                      
                      <p className="text-sm text-charcoal-600 mb-3 leading-relaxed">
                        {food.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-charcoal-500">{food.serves}</span>
                        <span className="text-lg font-bold text-honey-gradient">+${food.price}</span>
                      </div>
                      
                      <Button size="sm" className="w-full">
                        <Gift className="w-3 h-3 mr-2" />
                        Add to Party
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
