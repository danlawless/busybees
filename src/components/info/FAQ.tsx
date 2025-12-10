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
        answer: 'Book your party online! We recommend booking at least a week in advance, especially for weekend slots. We offer three party packages (Basic Bee, Worker Bee and Queen Bee) in both Private and Semi-Private options. Semi-Private packages ($400 - $500) include an exclusive party room with shared play area. Private packages ($475 - $575) include exclusive use of the entire facility.'
      },
      {
        question: 'What\'s included in party packages?',
        answer: 'Private parties get exclusive use of the party room and play space. All packages include 2 hours of celebration time, tables and chairs, and paper goods. Worker Bee and Queen Bee packages also include pizza and soda. The Queen Bee package adds sheet cake and balloons!'
      },
      {
        question: 'Can I bring my own decorations and cake?',
        answer: 'Absolutely! You can bring your own decorations, cake, and party favors. We provide basic decorations, but you\'re welcome to personalize the space for your child\'s special day.'
      },
      {
        question: 'What if I have more than 15 children?',
        answer: 'No problem! Additional children are $15 each beyond the 15 included in both party packages. Just let us know your final headcount when you book.'
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
        answer: 'Our monthly membership is perfect for families who visit regularly! Toddler membership (ages 2+) is $115 for the first child, with discounts for additional children (10% off second child at $103.50, 20% off third child at $92). Infant membership (under 2) is $80. Memberships include unlimited visits and member-exclusive events. It pays for itself after just 7 visits!'
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
  },
  {
    category: 'Classes & Programs',
    questions: [
      {
        question: 'What classes do you offer?',
        answer: 'We offer a variety of structured programs including Mommy and Me, Story Time, Kids Yoga, Lego Build, Toddler Tunes, Zumbini, and New Parent Support Group. Each class is designed for specific age ranges and developmental goals.'
      },
      {
        question: 'Do I need to register for classes in advance?',
        answer: 'Yes, class registration is required as space is limited. Members receive a 10% discount on all classes. Contact us to register or check availability for upcoming sessions.'
      },
      {
        question: 'What ages are the classes for?',
        answer: 'Our classes range from infants (0-12 months) to preschoolers (up to 6 years). Each class listing includes the recommended age range. We also have programs for parents, like our New Parent Support Group.'
      },
      {
        question: 'Can I try a class before committing?',
        answer: 'Absolutely! We offer drop-in rates for most classes so you can try before signing up for a full session. Contact us to learn about trial options for specific programs.'
      },
      {
        question: 'What should my child wear to classes?',
        answer: 'Comfortable, play-friendly clothing is recommended. For Kids Yoga, loose-fitting clothes work best. For all classes, remember that socks are required in our play areas for safety and hygiene.'
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
        </motion.div>
      </div>
    </section>
  )
}
