'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const faqs = [
  {
    category: 'General Information',
    questions: [
      {
        question: 'What age groups can play at Busy Bees?',
        answer: 'Busy Bees is designed for children ages 0-6 years. We have a dedicated infant area (0-2 years) and a main play area (2-6 years) to ensure age-appropriate and safe play for all children.'
      },
      {
        question: 'How much does it cost to visit?',
        answer: 'Daily admission is $15 for children 2+ years and $5 for infants under 2 (free with paid sibling). We also offer a 10-visit punch card for $130 and monthly memberships for $75.'
      },
      {
        question: 'Do I need to make a reservation?',
        answer: 'No reservations needed for open play! Just walk in during our open hours. Reservations are only required for birthday parties and private events.'
      },
      {
        question: 'Can I bring my own food and drinks?',
        answer: 'Yes! Outside food and drinks are welcome and should be consumed in our designated eating area. We also have snacks and drinks available for purchase.'
      }
    ]
  },
  {
    category: 'Safety & Policies',
    questions: [
      {
        question: 'What are your safety measures?',
        answer: 'Safety is our top priority! We require adult supervision at all times, have soft flooring throughout, age-appropriate zones, regular equipment sanitization, and trained staff on-site.'
      },
      {
        question: 'Do children need to wear socks?',
        answer: 'Yes, socks are required in all play areas for safety and hygiene. We have grip socks available for purchase at the front desk if needed.'
      },
      {
        question: 'What if my child gets hurt?',
        answer: 'Our staff are trained in basic first aid and we have first aid supplies on-site. For any injury, please notify staff immediately. We also have clear emergency procedures in place.'
      },
      {
        question: 'Can I leave my child unattended?',
        answer: 'No, children must be actively supervised by a parent or guardian at all times. This ensures safety and allows you to enjoy watching your child play and learn.'
      }
    ]
  },
  {
    category: 'Birthday Parties',
    questions: [
      {
        question: 'How do I book a birthday party?',
        answer: 'Call us at (123) 456-7890 to book your party! We recommend booking 2-3 weeks in advance, especially for weekend slots. We\'ll help you choose between private ($425) and semi-private ($350) packages.'
      },
      {
        question: 'What\'s included in party packages?',
        answer: 'Both packages include 2 hours of play time, dedicated party host, tables and chairs, decorations, paper goods, and access to the play area. Private parties get exclusive use of the party room.'
      },
      {
        question: 'Can I bring my own decorations and cake?',
        answer: 'Absolutely! You can bring your own decorations, cake, and party favors. We provide basic decorations, but you\'re welcome to personalize the space for your child\'s special day.'
      },
      {
        question: 'What if I have more than 15 children?',
        answer: 'No problem! Additional children are $12 each beyond the 15 included in both party packages. Just let us know your final headcount when you book.'
      }
    ]
  },
  {
    category: 'Memberships & Visits',
    questions: [
      {
        question: 'How does the monthly membership work?',
        answer: 'Our $75 monthly membership includes unlimited visits, priority party booking, member-only events, 10% off snacks, and 2 free guest passes per month. It\'s perfect for families who visit regularly!'
      },
      {
        question: 'Do punch cards expire?',
        answer: 'No! Our 10-visit punch cards never expire and can be transferred to family or friends. At $13 per visit, you save $20 compared to daily admission.'
      },
      {
        question: 'What if the weather is bad?',
        answer: 'Perfect! We\'re an indoor facility, so weather never affects your visit. We\'re especially busy on rainy, snowy, or extremely hot days when outdoor play isn\'t ideal.'
      },
      {
        question: 'Can grandparents bring their grandchildren?',
        answer: 'Of course! Any responsible adult can supervise children at Busy Bees. We just require that children are actively supervised at all times during their visit.'
      }
    ]
  }
]

export function FAQ() {
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            <HelpCircle className="w-8 h-8 inline mr-3 text-primary-500" />
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Got questions? We've got answers! Here are the most common questions from families.
          </p>
        </motion.div>

        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            >
              <h3 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                {category.category}
              </h3>
              
              <div className="space-y-3">
                {category.questions.map((faq, faqIndex) => {
                  const itemId = `${categoryIndex}-${faqIndex}`
                  const isOpen = openItems.includes(itemId)
                  
                  return (
                    <Card key={faqIndex} className="overflow-hidden">
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-2xl"
                      >
                        <CardContent className="p-6 hover:bg-neutral-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-neutral-900 pr-4">
                              {faq.question}
                            </h4>
                            <ChevronDown
                              className={cn(
                                "w-5 h-5 text-neutral-500 transition-transform flex-shrink-0",
                                isOpen && "transform rotate-180"
                              )}
                            />
                          </div>
                        </CardContent>
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="px-6 pb-6 pt-0">
                              <div className="border-t border-neutral-100 pt-4">
                                <p className="text-neutral-600 leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Still Have Questions */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="bg-primary-50 border-primary-200">
            <CardContent className="p-8">
              <h4 className="font-semibold text-neutral-900 mb-3">Still have questions?</h4>
              <p className="text-neutral-600 mb-4">
                We're here to help! Give us a call or stop by during our open hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
                <div className="flex items-center">
                  <span className="font-medium text-primary-700">📞 (123) 456-7890</span>
                </div>
                <div className="hidden sm:block text-neutral-400">•</div>
                <div className="flex items-center">
                  <span className="font-medium text-primary-700">📧 info@busybeesipc.com</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
