'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, Calendar, Users, Gift, DollarSign, Clock, Utensils } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp } from '@/lib/utils'

const faqCategories = [
  {
    category: 'Booking & Scheduling',
    icon: Calendar,
    color: 'from-blue-200 to-blue-300',
    faqs: [
      {
        question: 'How far in advance should I book my party?',
        answer: 'We recommend booking at least 2-3 weeks in advance, especially for weekend parties. Popular dates like holidays and summer weekends fill up quickly, so earlier is always better!'
      },
      {
        question: 'Can I change my party date after booking?',
        answer: 'Yes! You can reschedule your party up to 48 hours before the event without any fees. We understand that plans can change, and we\'re here to help make it work.'
      },
      {
        question: 'What if I need to cancel my party?',
        answer: 'We offer a full refund if you cancel at least 48 hours before your party. For cancellations within 48 hours, we can apply your deposit to a future party date.'
      }
    ]
  },
  {
    category: 'Party Details',
    icon: Gift,
    color: 'from-pink-200 to-pink-300',
    faqs: [
      {
        question: 'How many kids can attend my party?',
        answer: 'Our packages accommodate different group sizes: Basic (up to 12 kids), Sweet Celebration (up to 16 kids), and Ultimate Hive (up to 20 kids). We can discuss larger groups on a case-by-case basis.'
      },
      {
        question: 'Can adults participate in the party activities?',
        answer: 'Absolutely! Parents and guardians are welcome to join in the fun. Our play areas are designed for family enjoyment, and we encourage parent participation in games and activities.'
      },
      {
        question: 'What happens if some kids don\'t show up?',
        answer: 'No worries! Your party package price remains the same regardless of actual attendance. We prepare for your estimated guest count, but understand that RSVPs can change.'
      }
    ]
  },
  {
    category: 'Food & Refreshments',
    icon: Utensils,
    color: 'from-orange-200 to-orange-300',
    faqs: [
      {
        question: 'Can I bring my own food and cake?',
        answer: 'Yes! You\'re welcome to bring your own cake and outside food. We also offer convenient food add-ons like pizza parties and custom cakes if you prefer to have everything handled for you.'
      },
      {
        question: 'Do you have options for kids with food allergies?',
        answer: 'Absolutely! Please inform us of any allergies when booking. We can accommodate most dietary restrictions and ensure all food options are clearly labeled and safely prepared.'
      },
      {
        question: 'What drinks are included?',
        answer: 'All packages include water and juice boxes. Our higher-tier packages also include healthy snacks. You\'re also welcome to bring additional beverages if needed.'
      }
    ]
  },
  {
    category: 'Pricing & Payments',
    icon: DollarSign,
    color: 'from-green-200 to-green-300',
    faqs: [
      {
        question: 'Are there any hidden fees?',
        answer: 'Never! Our package prices include everything listed - decorations, setup, cleanup, party host, and all activities. The only additional costs are optional add-ons you choose.'
      },
      {
        question: 'When do I need to pay?',
        answer: 'We require a $50 deposit to secure your booking, and the remaining balance is due on the day of your party. We accept all major credit cards and cash.'
      },
      {
        question: 'Do you offer any discounts?',
        answer: 'Yes! We offer discounts for weekday parties, repeat customers, and military families. Check our current promotions or ask about available discounts when booking.'
      }
    ]
  }
]

const quickAnswers = [
  { icon: Clock, question: 'How long are parties?', answer: '1.5-2.5 hours depending on package' },
  { icon: Users, question: 'Age range for parties?', answer: 'Perfect for ages 2-12 years old' },
  { icon: Calendar, question: 'Available party times?', answer: 'Weekends 10am-6pm, Weekdays 4pm-7pm' },
  { icon: Gift, question: 'What\'s included?', answer: 'Host, decorations, activities, cleanup & more!' }
]

export function PartyFAQ() {
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? null : id)
  }

  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="subtle" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-100 to-green-100 text-blue-800 rounded-full text-sm font-medium mb-4">
            Party FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Got <span className="text-gradient bg-gradient-to-r from-blue-500 to-green-600 bg-clip-text text-transparent">Questions?</span> We've Got Answers!
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Everything you need to know about planning the perfect party at Busy Bees. 
            Can't find what you're looking for? Just give us a call!
          </p>
        </motion.div>
        
        {/* Quick Answers */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickAnswers.map((item, index) => {
              const Icon = item.icon
              return (
                <Card key={index} className="card-pastel text-center group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 hexagon-pulse">
                      <Icon className="w-6 h-6 text-charcoal-700" />
                    </div>
                    <h3 className="font-semibold text-charcoal-800 text-sm mb-2">
                      {item.question}
                    </h3>
                    <p className="text-xs text-charcoal-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </motion.div>
        
        {/* Detailed FAQ Sections */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {faqCategories.map((category, categoryIndex) => {
            const CategoryIcon = category.icon
            return (
              <motion.div
                key={categoryIndex}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                <Card className="card-pastel overflow-hidden">
                  <CardContent className="p-0">
                    {/* Category Header */}
                    <div className={`bg-gradient-to-r ${category.color} p-6`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/60 hexagon-shape flex items-center justify-center hexagon-pulse">
                          <CategoryIcon className="w-6 h-6 text-charcoal-700" />
                        </div>
                        <h3 className="text-xl font-bold text-charcoal-800">
                          {category.category}
                        </h3>
                      </div>
                    </div>
                    
                    {/* FAQ Items */}
                    <div className="divide-y divide-honey-100">
                      {category.faqs.map((faq, faqIndex) => {
                        const faqId = `${categoryIndex}-${faqIndex}`
                        const isOpen = openFAQ === faqId
                        
                        return (
                          <div key={faqIndex} className="p-6">
                            <button
                              onClick={() => toggleFAQ(faqId)}
                              className="w-full flex items-center justify-between text-left group"
                            >
                              <h4 className="font-semibold text-charcoal-800 group-hover:text-honey-600 transition-colors duration-200">
                                {faq.question}
                              </h4>
                              <div className="ml-4 flex-shrink-0">
                                {isOpen ? (
                                  <ChevronUp className="w-5 h-5 text-honey-600" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-charcoal-500 group-hover:text-honey-600 transition-colors duration-200" />
                                )}
                              </div>
                            </button>
                            
                            <motion.div
                              initial={false}
                              animate={{
                                height: isOpen ? 'auto' : 0,
                                opacity: isOpen ? 1 : 0
                              }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4">
                                <p className="text-charcoal-600 leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            </motion.div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
        
        {/* Still Have Questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Card className="max-w-2xl mx-auto card-pastel">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-green-300 hexagon-shape flex items-center justify-center mx-auto mb-6 hexagon-pulse">
                <HelpCircle className="w-8 h-8 text-charcoal-700" />
              </div>
              
              <h3 className="text-2xl font-bold text-charcoal-800 mb-4">
                Still Have <span className="text-honey-gradient">Questions?</span>
              </h3>
              <p className="text-charcoal-600 mb-6 leading-relaxed">
                Our friendly party coordinators are here to help! We love talking about parties 
                and making sure every detail is perfect for your special day.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 text-white font-semibold">
                  📞 Call (555) 123-BEES
                </Button>
                <Button variant="outline" size="lg">
                  💬 Text Your Questions
                </Button>
              </div>
              
              <div className="mt-6 text-sm text-charcoal-500">
                <p>📞 Phone: Mon-Fri 9AM-6PM | 💬 Text: Response within 1 hour</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
