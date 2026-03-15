'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Shield, FileText, AlertTriangle } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

function RuleSectionIcon({ src, alt, title }: { src: string; alt: string; title: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="text-charcoal-600 font-bold text-2xl" aria-hidden>{title.charAt(0)}</span>
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain w-full h-full"
      sizes="(max-width: 768px) 100vw, 33vw"
      onError={() => setFailed(true)}
    />
  )
}

const generalSafetyRules = [
  'Socks Required – All guests (children and adults) must wear clean, non-slip socks in the play areas. No bare feet or shoes are permitted beyond the lobby.',
  'Adult Supervision – Parents/guardians must actively supervise their children at all times.',
  'Age-Appropriate Play – Our equipment is designed for children ages 0–6. Please ensure your child is in the correct area for their age and abilities.',
  'No Rough Play – Pushing, hitting, wrestling, or other aggressive behavior is not allowed.',
  'Respect for Others – Share toys and equipment, and be kind to fellow guests.',
  'Illness Policy – Please do not visit if your child is sick or has shown symptoms (fever, vomiting, diarrhea, contagious rash) in the last 24 hours.',
  'Clean Hands – Please sanitize or wash hands upon entry and after eating.'
]

const ruleSections = [
  { iconSrc: '/icons/rules-toddler.png', title: 'Toddler Area (Under 2 Years)', rules: ['For children under 2 years old only.', 'Gentle play only—no running, jumping, or roughhousing.', 'Older siblings are welcome to visit but must be seated and gentle at all times.', 'Soft toys and equipment should remain in the infant area.'] },
  { iconSrc: '/icons/rules-food.png', title: 'Food & Beverage Area', rules: ['Food and drinks are only allowed in the designated café/food area.', 'Outside food or drinks are allowed (please inform staff of any food allergies in advance).', 'Please clean up after yourself; trash bins are provided.', 'No glass containers or breakable dishes.'] },
  { iconSrc: '/icons/rules-party.png', title: 'Party Room Use', rules: ['Party room use is by reservation only.', 'Please arrive and depart at your scheduled time to allow for cleaning and set-up for the next group.', 'Decorations must be approved by staff; no tape or nails on walls.', 'Outside entertainment (magicians, characters, etc.) must be pre-approved.', 'Guests must follow all general play center rules during parties.'] },
]

const additionalPolicies = [
  'The play center is not responsible for lost or stolen items—please keep valuables with you.',
  'Staff members reserve the right to ask guests to leave if rules are not followed.',
  'Photos are welcome, but please be respectful of other families\' privacy.'
]

const waiverPoints = [
  'Parents/guardians assume full responsibility for their children\'s safety and behavior',
  'Busy Bees is not liable for injuries that may occur during play',
  'Lost or damaged personal items are not the responsibility of Busy Bees',
  'Photography and video may be taken for promotional purposes unless otherwise requested',
  'Violation of facility rules may result in removal from the premises'
]

export function RulesAndWaiver() {
  return (
    <section className="relative py-24 sm:py-28 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="lg" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
            Rules & <span className="text-honey-500">Regulations</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            We are committed to creating a safe, clean, and fun environment for all our guests.
          </p>
        </motion.div>

        {/* General Safety Rules */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="border-2 border-primary-200/50 shadow-soft rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-charcoal-700" />
                </div>
                <h3 className="text-2xl font-bold text-charcoal-800">
                  General <span className="text-honey-gradient">Safety Rules</span>
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {generalSafetyRules.map((rule, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Image
                        src="/busy-bee.png"
                        alt="Bee bullet point"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </div>
                    <p className="text-charcoal-600 leading-relaxed text-sm">{rule}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Specific Area Rules */}
        <motion.div
          className="mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="grid md:grid-cols-3 gap-8">
            {ruleSections.map((section, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card padding="none" className="h-full border-2 border-primary-200/50 shadow-soft hover:shadow-honey transition-all duration-300 rounded-3xl overflow-hidden">
                  <CardContent className="p-0 flex flex-col">
                    <div className="w-full h-40 sm:h-48 bg-[#FFFDF7] relative overflow-hidden p-3 sm:p-4">
                      <RuleSectionIcon src={section.iconSrc} alt={section.title} title={section.title} />
                    </div>
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-charcoal-800 mb-4">{section.title}</h4>
                      <ul className="space-y-3">
                        {section.rules.map((rule, ruleIndex) => (
                          <li key={ruleIndex} className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-honey-400 rounded-full flex-shrink-0 mt-2" />
                            <p className="text-sm text-charcoal-600 leading-relaxed">{rule}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Additional Policies */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Card className="border-2 border-primary-200/50 shadow-soft rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-charcoal-700" />
                </div>
                <h3 className="text-2xl font-bold text-charcoal-800">
                  Additional <span className="text-honey-gradient">Policies</span>
                </h3>
              </div>

              <div className="space-y-4">
                {additionalPolicies.map((policy, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-honey-200 to-honey-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-charcoal-700 text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-charcoal-600 leading-relaxed">{policy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-honey-50 rounded-xl border border-honey-200">
                <p className="text-center text-charcoal-800 font-medium">
                  Thank you for helping us keep our play space safe, clean, and fun for everyone!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Waiver Information */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Waiver Content */}
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-charcoal-700" />
                </div>
                <h3 className="text-2xl font-bold text-charcoal-800">
                  Waiver & <span className="text-honey-gradient">Liability</span>
                </h3>
              </div>

              <p className="text-charcoal-600 mb-6 leading-relaxed">
                By entering Busy Bees Indoor Play Center, all visitors acknowledge and agree to the following terms and conditions:
              </p>

              <ul className="space-y-4">
                {waiverPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-honey-200 to-honey-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-charcoal-700 text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-charcoal-600 leading-relaxed">{point}</p>
                  </li>
                ))}
              </ul>

            </div>

            {/* Important Notice Card */}
            <Card className="border-2 border-primary-200/50 shadow-soft rounded-3xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                <h4 className="text-xl font-bold text-charcoal-800 text-center mb-4">
                  Important Notice
                </h4>

                <div className="space-y-4 text-sm text-charcoal-600">
                  <p className="leading-relaxed">
                    <strong>Emergency Procedures:</strong> In case of emergency, please notify staff immediately. Emergency exits are clearly marked throughout the facility.
                  </p>

                  <p className="leading-relaxed">
                    <strong>Health & Safety:</strong> Children showing signs of illness should not use the facility. Hand sanitizing stations are available throughout the play area.
                  </p>

                  <p className="leading-relaxed">
                    <strong>Contact Information:</strong> All visitors must provide current contact information at check-in for safety and communication purposes.
                  </p>

                  <div className="mt-6 p-4 bg-honey-50 rounded-xl border border-honey-200">
                    <p className="text-center text-charcoal-800 font-medium">
                      Questions about our policies? Please speak with our staff or contact us directly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
