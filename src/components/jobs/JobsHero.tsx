'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Users, CheckCircle, Briefcase, Heart } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const jobPositions = [
  {
    title: 'Shift Manager',
    icon: Briefcase,
    color: 'from-honey-200 to-honey-300',
    borderColor: 'border-honey-300',
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
    icon: Heart,
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-300',
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
    icon: Users,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-300',
    responsibilities: [
      'Lead engaging classes for children ages 0-6',
      'Create fun and educational activities',
      'Interact positively with children and parents',
      'Maintain safe and organized class environment',
      'Adapt activities to different age groups'
    ]
  }
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

        {/* Facility Photo Banner */}
        <motion.div
          className="mb-16 rounded-3xl overflow-hidden shadow-soft border border-primary-200/30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="grid grid-cols-3 gap-0.5">
            {['/album/MH_12612.jpg', '/album/MH_12680.jpg', '/album/MH_12767.jpg'].map((src, i) => (
              <div key={i} className="relative aspect-[16/9] overflow-hidden">
                <Image src={src} alt="" fill className="object-cover" sizes="33vw" loading="lazy" />
              </div>
            ))}
          </div>
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
                      <div className="text-center mb-8">
                        <div className={`w-16 h-16 bg-gradient-to-br ${job.color} hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-8 h-8 text-charcoal-700" />
                        </div>

                        <h3 className="text-2xl font-bold text-charcoal-800">
                          {job.title}
                        </h3>
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

                      {/* Apply Now Button */}
                      <div className="mt-6 pt-6 border-t">
                        <Button
                          className="w-full bg-gradient-to-r from-honey-500 to-primary-600 text-white hover:from-honey-600 hover:to-primary-700 font-semibold"
                          onClick={() => {
                            const applicationSection = document.querySelector('#application-form')
                            if (applicationSection) {
                              const elementPosition = applicationSection.getBoundingClientRect().top + window.pageYOffset
                              const offsetPosition = elementPosition - 400

                              window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                              })
                            }
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Apply for This Position
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Application Section */}
        <motion.div
          id="application-form"
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold text-charcoal-800 mb-4">
            Ready to Join <span className="text-honey-600">Our Team?</span>
          </h3>
          <p className="text-lg text-charcoal-600 mb-8 max-w-2xl mx-auto">
            Complete our application form below to start your journey with Busy Bees! 🚀
          </p>

          <Card className="bg-white border-2 border-honey-200 shadow-lg">
            <CardContent className="p-4 sm:p-8">
              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSfhfDJ6rcbePY5xKzahLnSGykuP6hRvbNK0vL-IW5Fsyv7FpA/viewform?embedded=true"
                width="100%"
                height="800"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                className="rounded-lg"
              >
                Loading job application form...
              </iframe>

              <div className="mt-6 pt-6 border-t border-honey-100">
                <p className="text-sm text-charcoal-600">
                  Questions? Email us at{' '}
                  <a
                    href="mailto:krista@busybeesipc.com"
                    className="text-honey-600 hover:text-honey-700 font-medium underline"
                  >
                    krista@busybeesipc.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
