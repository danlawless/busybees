'use client'

import { motion } from 'framer-motion'
import { Users, Clock, DollarSign, Calendar, Mail, CheckCircle, Briefcase, Heart } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const jobPositions = [
  {
    title: 'Shift Manager',
    hourlyRate: 15,
    icon: Briefcase,
    color: 'from-honey-200 to-honey-300',
    borderColor: 'border-honey-300',
    totalHours: 57, // 28 + 9 + 20
    schedules: [
      { days: 'Monday - Thursday', hours: '9:30 AM - 4:30 PM', weeklyHours: 28 },
      { days: 'Friday', hours: '9:30 AM - 6:30 PM', weeklyHours: 9 },
      { days: 'Saturday - Sunday', hours: '8:30 AM - 6:30 PM', weeklyHours: 20 }
    ],
    responsibilities: [
      'Supervise daily operations and staff',
      'Ensure facility safety and cleanliness standards',
      'Handle customer service and parent interactions',
      'Manage opening and closing procedures',
      'Coordinate party setups and activities'
    ]
  },
  {
    title: 'Party Assistant',
    hourlyRate: 15,
    icon: Heart,
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-300',
    totalHours: 15, // 3 + 12
    schedules: [
      { days: 'Friday', hours: '3:30 PM - 6:30 PM', weeklyHours: 3 },
      { days: 'Saturday - Sunday', hours: '12:30 PM - 6:30 PM', weeklyHours: 12 }
    ],
    responsibilities: [
      'Assist with party setup and decoration',
      'Help coordinate party activities and games',
      'Support families during celebrations',
      'Maintain party areas between events',
      'Ensure memorable experiences for birthday children'
    ]
  },
  {
    title: 'Class Instructor',
    hourlyRate: 15,
    icon: Users,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    totalHours: 'Flexible',
    schedules: [
      { days: 'Flexible Schedule', hours: 'Various Class Times', weeklyHours: 'TBD' }
    ],
    responsibilities: [
      'Lead engaging classes for children ages 0-6',
      'Create fun and educational activities',
      'Interact positively with children and parents',
      'Maintain safe and organized class environment',
      'Adapt activities to different age groups'
    ]
  }
]

const applicationRequirements = [
  'Position preference (Shift Manager, Party Assistant, or Class Instructor)',
  'Number of hours you prefer to work per week',
  'Availability preference (weekdays or weekends)',
  'Specific hours and days available',
  'Email resume to krista@busybeesipc.com'
]

const benefits = [
  'Competitive hourly wage of $15/hour',
  'Fun and energetic work environment',
  'Opportunity to work with children and families',
  'Flexible scheduling options',
  'Be part of a growing local business'
]

export function JobsHero() {
  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-honey-100 to-yellow-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Join Our Team
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-charcoal-800 mb-6">
            Work at <span className="text-honey-600">Busy Bees</span>
          </h1>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Join our amazing team and help create magical experiences for children and families! 
            We're looking for energetic, caring individuals who love working with kids.
          </p>
        </motion.div>

        {/* Job Positions */}
        <motion.div
          className="mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 text-center mb-12">
            Available <span className="text-honey-600">Positions</span>
          </h2>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {jobPositions.map((job, index) => {
              const Icon = job.icon
              return (
                <motion.div key={index} variants={fadeInUp} className="h-full">
                  <Card className={`h-full card-pastel border-2 ${job.borderColor} hover:scale-105 transition-all duration-300 group flex flex-col`}>
                    <CardContent className="p-8 flex-1 flex flex-col">
                      <div className="text-center mb-6">
                        <div className={`w-16 h-16 bg-gradient-to-br ${job.color} hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-8 h-8 text-charcoal-700" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-charcoal-800 mb-2">
                          {job.title}
                        </h3>
                        
                        <div className="flex items-center justify-center space-x-2 mb-4">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-600">${job.hourlyRate}</span>
                          <span className="text-charcoal-600">/hour</span>
                        </div>

                        <div className="flex items-center justify-center space-x-2 text-sm text-charcoal-600 mb-4">
                          <Clock className="w-4 h-4" />
                          <span>{job.totalHours} hours/week</span>
                        </div>
                      </div>

                      {/* Schedule */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-charcoal-800 mb-3 flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-honey-600" />
                          Schedule
                        </h4>
                        <div className="space-y-2">
                          {job.schedules.map((schedule, idx) => (
                            <div key={idx} className="bg-white/60 rounded-lg p-3 border">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-charcoal-700 text-sm">{schedule.days}</p>
                                  <p className="text-charcoal-600 text-sm">{schedule.hours}</p>
                                </div>
                                <span className="text-xs text-honey-600 font-medium bg-honey-50 px-2 py-1 rounded-full">
                                  {schedule.weeklyHours} hrs
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Responsibilities */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-charcoal-800 mb-3">Key Responsibilities</h4>
                        <ul className="space-y-2">
                          {job.responsibilities.map((responsibility, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-sm text-charcoal-600">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{responsibility}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-honey-50 to-yellow-50 border-2 border-honey-200">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-charcoal-800 text-center mb-8">
                Why Work at <span className="text-honey-600">Busy Bees?</span>
              </h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-honey-200 to-honey-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-honey-700" />
                    </div>
                    <p className="text-charcoal-600 leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Application Section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-honey-500 to-primary-600 text-white">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-white/20 hexagon-shape flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-4">Ready to Join Our Team?</h3>
              <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
                We'd love to hear from you! Please include the following information in your application:
              </p>
              
              <div className="bg-white/10 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
                <ul className="space-y-2">
                  {applicationRequirements.map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="text-white/70 font-bold text-sm flex-shrink-0 mt-0.5">{index + 1}.</span>
                      <span className="text-white/90 leading-relaxed">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                size="lg" 
                className="bg-white text-honey-600 hover:bg-gray-100 font-bold shadow-lg hover:shadow-xl"
                onClick={() => window.location.href = 'mailto:krista@busybeesipc.com?subject=Job Application - Busy Bees Indoor Play Center'}
              >
                <Mail className="w-5 h-5 mr-2" />
                Email Your Resume
              </Button>
              
              <p className="text-sm opacity-75 mt-4">
                Send to: <span className="font-medium">krista@busybeesipc.com</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
