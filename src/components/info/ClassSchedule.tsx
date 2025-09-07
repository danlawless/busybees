'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Users, Heart, Book, Zap, Music, Baby, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const classes = [
  {
    name: 'Mommy and Me',
    description: 'A bonding experience for parent and child with sensory play, songs, and early development activities.',
    ageRange: '6 months - 2 years',
    duration: '45 minutes',
    icon: Heart,
    schedule: 'Mondays & Wednesdays 10:00 AM',
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-300',
    highlights: ['Parent-child bonding', 'Sensory exploration', 'Social interaction', 'Early development']
  },
  {
    name: 'Story Time',
    description: 'Interactive storytelling sessions with books, songs, and creative activities to foster language development.',
    ageRange: '2-5 years',
    duration: '30 minutes',
    icon: Book,
    schedule: 'Tuesdays & Thursdays 11:00 AM',
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    highlights: ['Language development', 'Imagination building', 'Listening skills', 'Interactive storytelling']
  },
  {
    name: 'Kids Yoga',
    description: 'Fun and gentle yoga poses designed for little ones to improve flexibility, balance, and mindfulness.',
    ageRange: '3-6 years',
    duration: '30 minutes',
    icon: Zap,
    schedule: 'Fridays 10:30 AM',
    color: 'from-green-200 to-green-300',
    borderColor: 'border-green-300',
    highlights: ['Flexibility & balance', 'Mindfulness practice', 'Body awareness', 'Relaxation techniques']
  },
  {
    name: 'Lego Build',
    description: 'Creative building sessions with age-appropriate Lego sets to develop fine motor skills and creativity.',
    ageRange: '3-6 years',
    duration: '45 minutes',
    icon: Users,
    schedule: 'Saturdays 10:00 AM',
    color: 'from-orange-200 to-orange-300',
    borderColor: 'border-orange-300',
    highlights: ['Fine motor skills', 'Creative thinking', 'Problem solving', 'Teamwork']
  },
  {
    name: 'Toddler Tunes',
    description: 'Musical exploration with instruments, dancing, and singing to develop rhythm and musicality.',
    ageRange: '18 months - 3 years',
    duration: '30 minutes',
    icon: Music,
    schedule: 'Wednesdays 11:30 AM',
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-300',
    highlights: ['Musical development', 'Rhythm & movement', 'Instrument exploration', 'Group participation']
  },
  {
    name: 'Zumbini',
    description: 'High-energy music and movement program combining Zumba moves with child development activities.',
    ageRange: '0-4 years with caregiver',
    duration: '45 minutes',
    icon: Baby,
    schedule: 'Thursdays 10:00 AM',
    color: 'from-red-200 to-red-300',
    borderColor: 'border-red-300',
    highlights: ['Physical activity', 'Music & movement', 'Parent participation', 'Cultural music exposure']
  },
  {
    name: 'New Parent Support Group',
    description: 'A supportive environment for new parents to connect, share experiences, and learn together.',
    ageRange: 'Parents with infants 0-12 months',
    duration: '60 minutes',
    icon: UserPlus,
    schedule: 'Tuesdays 2:00 PM',
    color: 'from-yellow-200 to-yellow-300',
    borderColor: 'border-yellow-300',
    highlights: ['Peer support', 'Expert guidance', 'Parenting tips', 'Community building']
  },
  {
    name: 'Book Club',
    description: 'Interactive reading sessions where children explore stories, discuss characters, and develop a love for literature.',
    ageRange: '4-6 years',
    duration: '60 minutes',
    icon: Book,
    schedule: 'Fridays 2:00 PM',
    color: 'from-indigo-200 to-indigo-300',
    borderColor: 'border-indigo-300',
    highlights: ['Reading comprehension', 'Discussion skills', 'Critical thinking', 'Literature appreciation']
  }
]

export function ClassSchedule() {
  return (
    <section className="relative py-20 bg-gradient-to-br from-honey-50 via-primary-50 to-charcoal-50 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <motion.span 
            variants={fadeInUp}
            className="inline-block px-4 py-2 bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-800 rounded-full text-sm font-medium mb-4"
          >
            ✨ Structured Learning & Fun
          </motion.span>
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6"
          >
            Our <span className="text-honey-600">Classes & Programs</span>
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-lg text-charcoal-600 max-w-3xl mx-auto"
          >
            Join our engaging classes designed to support your child's development through play, creativity, and social interaction. All classes include member discounts!
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {classes.map((classItem, index) => {
            const Icon = classItem.icon
            return (
              <motion.div key={index} variants={fadeInUp} className="h-full">
                <Card className={`h-full card-pastel border-2 ${classItem.borderColor} hover:scale-105 transition-all duration-300 group overflow-hidden flex flex-col`}>
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${classItem.color} hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-charcoal-700" />
                    </div>
                    <CardTitle className="text-xl font-bold text-charcoal-800 mb-2">
                      {classItem.name}
                    </CardTitle>
                    <div className="min-h-[60px] flex items-center justify-center">
                      <p className="text-sm text-charcoal-600 leading-relaxed">
                        {classItem.description}
                      </p>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    {/* Class Details */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-charcoal-600">
                          <Users className="w-4 h-4" />
                          <span>{classItem.ageRange}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-charcoal-600">
                          <Clock className="w-4 h-4" />
                          <span>{classItem.duration}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-primary-600 font-medium bg-primary-50 rounded-lg p-2">
                        <Calendar className="w-4 h-4" />
                        <span>{classItem.schedule}</span>
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2 mb-6 flex-1">
                      <h4 className="text-sm font-semibold text-charcoal-700">What Your Child Will Love:</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {classItem.highlights.map((highlight, idx) => (
                          <div key={idx} className="flex items-start space-x-1 text-xs text-charcoal-600">
                            <div className="w-1.5 h-1.5 bg-secondary-400 rounded-full flex-shrink-0 mt-1.5"></div>
                            <span className="leading-tight">{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button - Always at bottom */}
                    <div className="mt-auto">
                      <Button 
                        className="w-full bg-gradient-to-r from-honey-500 to-primary-600 hover:from-honey-600 hover:to-primary-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Coming Soon
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom CTA Section */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-honey-500 to-primary-600 text-white overflow-hidden relative max-w-4xl mx-auto shadow-2xl">
            <CardContent className="p-8 text-center relative z-10">
              <h3 className="text-2xl font-bold mb-4">
                Ready to Join the Fun?
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Contact us to register for classes or learn more about our programs. Members save 10% on all classes!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  className="bg-white text-primary-600 hover:bg-honey-50 hover:text-honey-700 font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  View Full Schedule
                </Button>
                <Button 
                  className="bg-white text-honey-600 border-2 border-white hover:bg-honey-50 hover:text-honey-700 font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  variant="outline"
                  size="lg"
                >
                  Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
