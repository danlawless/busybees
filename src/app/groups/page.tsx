'use client'

import { Layout } from '@/components/layout/Layout'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Users, GraduationCap, Heart, Calendar, DollarSign, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const groupTypes = [
  {
    icon: GraduationCap,
    title: 'School Field Trips',
    description: 'Give your students a fun-filled day out! Our play center provides a safe, engaging environment for school field trips with age-appropriate activities for little learners.',
    color: 'from-blue-200 to-blue-300',
  },
  {
    icon: Users,
    title: 'Homeschool Groups',
    description: 'Connect with other homeschool families while the kids enjoy structured and unstructured play. A great way to build community and give kids socialization time.',
    color: 'from-green-200 to-green-300',
  },
  {
    icon: Heart,
    title: 'Organized Group Events',
    description: 'Scouts, daycares, mommy groups, church groups, and more — we welcome all organized groups looking for a safe indoor space for kids to play and explore.',
    color: 'from-purple-200 to-purple-300',
  },
]

const benefits = [
  'Only pay for kids who show up — no upfront group fees',
  'Reduced rates for toddlers and infants',
  'Flexible scheduling that works around your group\'s needs',
  'Safe, clean indoor play space designed for ages 0-6',
  'Dedicated play areas for toddlers and infants',
  'Stress-free planning — we handle the setup',
  'Fits any budget, big or small',
]

export default function GroupsPage() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-[#FFF8E7] to-white">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-full text-sm font-medium mb-6">
              Group Play at Busy Bees
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-800 mb-6">
              Bring Your Group to Play!
            </h1>
            <p className="text-lg sm:text-xl text-charcoal-600 max-w-3xl mx-auto mb-8">
              Whether it&apos;s a school field trip, homeschool meetup, or organized group outing,
              Busy Bees is the perfect indoor play destination for your little ones.
            </p>
            <Button
              size="lg"
              onClick={() => {
                window.location.href = 'mailto:info@busybeesipc.com?subject=Group Play Inquiry'
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg px-8 py-4 border-0"
            >
              <Mail className="w-5 h-5 mr-2" />
              Inquire About Group Play
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Group Types */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
              Who We Welcome
            </h2>
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
              We love hosting groups of all kinds. Here are just a few of the groups that play with us.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {groupTypes.map((group, index) => {
              const Icon = group.icon
              return (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-8 h-full text-center hover:shadow-lg transition-shadow">
                    <div className={`w-16 h-16 bg-gradient-to-br ${group.color} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                      <Icon className="w-8 h-8 text-charcoal-700" />
                    </div>
                    <h3 className="text-xl font-bold text-charcoal-800 mb-3">{group.title}</h3>
                    <p className="text-charcoal-600">{group.description}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works / Pay Per Kid */}
      <section className="py-16 sm:py-20 bg-[#FFF8E7]/70">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-700" />
                </div>
                <h2 className="text-3xl font-bold text-charcoal-800">
                  Budget-Friendly Pricing
                </h2>
              </div>
              <p className="text-lg text-charcoal-600 mb-4">
                We believe group play should be accessible to everyone. That&apos;s why we only charge
                for the kids who actually show up — no group minimums, no upfront deposits, no surprises.
              </p>
              <p className="text-lg text-charcoal-600">
                Whether you bring 5 kids or 25, you only pay for the children who walk through the door.
                It&apos;s that simple.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 bg-white border-2 border-green-200">
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-green-700 uppercase tracking-wide mb-2">How It Works</p>
                  <p className="text-4xl font-bold text-charcoal-800">Pay Per Child</p>
                  <p className="text-charcoal-600 mt-2">Only charged for kids who attend</p>
                  <p className="text-sm text-amber-700 font-medium mt-2">10 kid minimum &bull; Reduced rates for toddlers &amp; infants</p>
                </div>
                <div className="space-y-3">
                  {['Schedule your group visit', 'Bring your kids to play', 'Only pay for who shows up'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-800">
                        {i + 1}
                      </div>
                      <span className="text-charcoal-700 font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
              Why Groups Love Busy Bees
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-charcoal-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Scheduling CTA */}
      <section className="py-16 sm:py-20 bg-[#FFF8E7]/70">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 sm:p-10 text-center bg-white border-2 border-amber-200">
              <Calendar className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-800 mb-4">
                Stress-Free Scheduling
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto mb-6">
                Planning a group outing shouldn&apos;t be stressful. Just reach out and we&apos;ll work with
                you to find the perfect date and time for your group. We&apos;re flexible and happy to
                accommodate your schedule.
              </p>
              <p className="text-charcoal-600 mb-8">
                Interested in booking a group visit? Send us an email and we&apos;ll take care of the rest!
              </p>
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = 'mailto:info@busybeesipc.com?subject=Group Play Inquiry'
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg px-8 py-4 border-0"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email info@busybeesipc.com
              </Button>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-charcoal-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Plan Your Group Visit?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              We can&apos;t wait to welcome your group to Busy Bees Indoor Play Center!
            </p>
            <Button
              size="lg"
              onClick={() => {
                window.location.href = 'mailto:info@busybeesipc.com?subject=Group Play Inquiry'
              }}
              className="bg-primary-500 hover:bg-primary-600 text-charcoal-800 font-bold text-lg border-0"
            >
              <Mail className="w-5 h-5 mr-2" />
              Get in Touch
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  )
}
