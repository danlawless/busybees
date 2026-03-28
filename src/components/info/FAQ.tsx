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
        answer: 'Once you log in to your account, parties can be purchased under the Parties section. We recommend booking at least a week in advance, especially for weekend slots. We offer three party packages: Basic Bee ($475), Worker Bee ($525), and Queen Bee ($575) — all include exclusive use of the entire facility.'
      },
      {
        question: 'What\'s included in party packages?',
        answer: 'Private parties get exclusive use of the party room and play space. All packages include 2 hours of celebration time, tables and chairs, and paper goods. Worker Bee and Queen Bee packages also include pizza and soda. The Queen Bee package adds sheet cake and decorations!'
      },
      {
        question: 'Can I bring my own decorations and cake?',
        answer: 'Absolutely! You can bring your own decorations, cake, and party favors. We provide basic decorations, but you\'re welcome to personalize the space for your child\'s special day.'
      },
      {
        question: 'How many kids are included in a party package?',
        answer: 'Our Queen Bee package includes 20 kids, and our Worker Bee and Basic Bee packages include 15 kids. Each additional child beyond the included amount is $15/child. Queen Bee can accommodate up to 25 kids, and Worker Bee/Basic Bee can accommodate up to 20.'
      }
    ]
  },
  {
    category: 'Memberships & Visits',
    questions: [
      {
        question: 'How much is general admission?',
        answer: 'General admission is $17 per child ages 2+, and $7 for infants under 2 years old. Infants are FREE with a paid sibling admission! This gives you all-day access to our play areas with no time limits.'
      },
      {
        question: 'How does the monthly membership work?',
        answer: 'Once your monthly membership is used or activated, it starts a 1-month calendar timer until its expiration. During that month you can enjoy unlimited visits for your child. Monthly memberships default to auto-renew upon expiration, however auto-renew can be turned off in the My Account section.'
      },
      {
        question: 'Do punch cards expire?',
        answer: 'No! Our 10-visit punch cards never expire and can be transferred to family or friends. Toddler punch cards are $150 (10 visits at $15 each) and infant punch cards are $50 (10 visits at $5 each).'
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
    <section className="py-20 sm:py-24 bg-[#FFFDF7]">
      <div className="mx-auto max-w-4xl px-6 sm:px-8 lg:px-12">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 sm:text-4xl mb-4">
            <HelpCircle className="w-8 h-8 inline mr-3 text-primary-500" />
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Got questions? We've got answers! Here are the most common questions from families.
          </p>
        </motion.div>

        <div className="space-y-10">
          {faqs.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            >
              <h3 className="text-xl font-semibold text-charcoal-800 mb-5 flex items-center">
                <div className="w-2.5 h-2.5 bg-primary-500 rounded-full mr-3"></div>
                {category.category}
              </h3>

              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const itemId = `${categoryIndex}-${faqIndex}`
                  const isOpen = openItems.includes(itemId)

                  return (
                    <Card key={faqIndex} className="overflow-hidden rounded-2xl">
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 rounded-2xl"
                      >
                        <CardContent className="p-6 hover:bg-primary-50/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-charcoal-800 pr-4">
                              {faq.question}
                            </h4>
                            <ChevronDown
                              className={cn(
                                "w-5 h-5 text-charcoal-500 transition-transform flex-shrink-0",
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
                              <div className="border-t border-primary-100/50 pt-4">
                                <p className="text-charcoal-600 leading-relaxed">
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
        </motion.div>
      </div>
    </section>
  )
}
