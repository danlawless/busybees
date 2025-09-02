'use client'

import { motion } from 'framer-motion'
import { Shield, FileText, AlertTriangle, Clock, Users, Zap } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const rules = [
  {
    icon: Users,
    title: 'Supervision Required',
    description: 'Children must be supervised by a parent or guardian at all times. Busy Bees staff are not responsible for childcare supervision.'
  },
  {
    icon: Clock,
    title: 'Age Restrictions',
    description: 'Play areas are designated for specific age groups. Please observe age limits for the safety of all children.'
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Shoes and socks are required at all times. No outside food or drinks allowed except for special dietary needs.'
  },
  {
    icon: Zap,
    title: 'Facility Care',
    description: 'Please help us keep our facility clean and safe. Report any damage or safety concerns to staff immediately.'
  }
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
    <section className="relative py-20 section-hexagon-medium overflow-hidden">
      <HoneycombPattern variant="medium" size="lg" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Important Information
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Rules & <span className="text-honey-gradient">Regulations</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Please review our facility rules and waiver information to ensure a safe and enjoyable experience for everyone.
          </p>
        </motion.div>
        
        {/* Rules Section */}
        <motion.div
          className="mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-charcoal-800 text-center mb-12">
            Facility <span className="text-honey-gradient">Rules</span>
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rules.map((rule, index) => {
              const Icon = rule.icon
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="h-full card-pastel group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 text-charcoal-700" />
                      </div>
                      
                      <h4 className="text-lg font-semibold text-charcoal-800 mb-3">
                        {rule.title}
                      </h4>
                      <p className="text-sm text-charcoal-600 leading-relaxed">
                        {rule.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
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
            <Card className="card-pastel border-2 border-honey-200">
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
