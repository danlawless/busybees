'use client'

import { motion } from 'framer-motion'
import { Mail, Phone, Star, Award, Heart, Users } from 'lucide-react'
import { HoneycombPattern } from '@/components/ui/BeeIcon'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const teamMembers = [
  {
    name: 'Sarah Johnson',
    role: 'Co-Founder & Director',
    bio: 'Former early childhood educator with 15+ years of experience. Passionate about creating magical play experiences.',
    specialties: ['Child Development', 'Safety Management', 'Program Design'],
    contact: { email: 'sarah@busybees.com', phone: '(555) 123-4567' }
  },
  {
    name: 'Mike Johnson',
    role: 'Co-Founder & Operations Manager',
    bio: 'Engineering background with expertise in facility safety and maintenance. Ensures every detail meets our high standards.',
    specialties: ['Facility Safety', 'Equipment Maintenance', 'Operations'],
    contact: { email: 'mike@busybees.com', phone: '(555) 123-4568' }
  },
  {
    name: 'Emma Rodriguez',
    role: 'Lead Play Coordinator',
    bio: 'Certified in child development and play therapy. Creates engaging activities that promote learning through play.',
    specialties: ['Activity Planning', 'Child Engagement', 'Educational Programs'],
    contact: { email: 'emma@busybees.com', phone: '(555) 123-4569' }
  },
  {
    name: 'David Chen',
    role: 'Safety & Maintenance Supervisor',
    bio: 'Former playground inspector with certifications in child safety. Maintains our spotless safety record.',
    specialties: ['Safety Inspections', 'Equipment Certification', 'Risk Management'],
    contact: { email: 'david@busybees.com', phone: '(555) 123-4570' }
  }
]

const achievements = [
  { icon: Award, title: 'Safety Excellence Award', year: '2023' },
  { icon: Star, title: 'Best Family Business', year: '2022' },
  { icon: Heart, title: 'Community Choice Award', year: '2021' },
  { icon: Users, title: 'Outstanding Service Recognition', year: '2020' }
]

export function TeamSection() {
  return (
    <section className="relative py-20 section-hexagon-light overflow-hidden">
      <HoneycombPattern variant="scattered" size="md" animated />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-honey-100 text-honey-800 rounded-full text-sm font-medium mb-4">
            Our Team
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-6">
            Meet the <span className="text-honey-gradient">Busy Bees</span> Family
          </h2>
          <p className="text-lg text-charcoal-600 max-w-3xl mx-auto">
            Our dedicated team of professionals brings together expertise in child development, 
            safety, and creating magical experiences for families.
          </p>
        </motion.div>
        
        {/* Team Members */}
        <motion.div
          className="grid md:grid-cols-2 gap-8 mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {teamMembers.map((member, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="h-full card-pastel group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Profile Image Placeholder */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gradient-to-br from-honey-100 via-honey-200 to-honey-300 rounded-2xl flex items-center justify-center hexagon-shape group-hover:scale-105 transition-transform duration-300">
                        <div className="text-center text-charcoal-600">
                          <Users className="w-8 h-8 mx-auto mb-1" />
                          <p className="text-xs font-medium">Photo</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Member Info */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-charcoal-800 mb-1">
                        {member.name}
                      </h3>
                      <p className="text-honey-600 font-medium mb-3">
                        {member.role}
                      </p>
                      <p className="text-charcoal-600 text-sm mb-4 leading-relaxed">
                        {member.bio}
                      </p>
                      
                      {/* Specialties */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-charcoal-700 mb-2">SPECIALTIES</p>
                        <div className="flex flex-wrap gap-2">
                          {member.specialties.map((specialty, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 bg-honey-100 text-honey-800 rounded-full text-xs font-medium"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Contact */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <span className="text-xs">Email</span>
                        </Button>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs">Call</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Team Photo Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <Card className="card-pastel overflow-hidden">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2">
                {/* Team Photo Placeholder */}
                <div className="aspect-[4/3] lg:aspect-auto bg-gradient-to-br from-honey-100 via-pastel-yellow to-honey-200 flex items-center justify-center">
                  <div className="text-center text-charcoal-600">
                    <div className="w-20 h-20 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4 hexagon-shape">
                      <Users className="w-10 h-10 text-honey-600" />
                    </div>
                    <p className="text-lg font-semibold">Full Team Photo</p>
                    <p className="text-sm opacity-75">All Busy Bees staff together</p>
                  </div>
                </div>
                
                {/* Team Stats & Info */}
                <div className="p-8 lg:p-12">
                  <h3 className="text-2xl font-bold text-charcoal-800 mb-6">
                    Why Choose <span className="text-honey-gradient">Our Team</span>
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-200 to-green-300 rounded-lg flex items-center justify-center hexagon-shape">
                        <Award className="w-4 h-4 text-charcoal-700" />
                      </div>
                      <span className="text-charcoal-600">All staff are background checked and certified</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg flex items-center justify-center hexagon-shape">
                        <Heart className="w-4 h-4 text-charcoal-700" />
                      </div>
                      <span className="text-charcoal-600">Ongoing training in child development and safety</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-200 to-purple-300 rounded-lg flex items-center justify-center hexagon-shape">
                        <Star className="w-4 h-4 text-charcoal-700" />
                      </div>
                      <span className="text-charcoal-600">Average 8+ years experience with children</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {achievements.map((achievement, index) => {
                      const Icon = achievement.icon
                      return (
                        <div key={index} className="text-center p-3 bg-honey-50 rounded-xl border border-honey-200">
                          <div className="w-10 h-10 bg-gradient-to-br from-honey-200 to-honey-300 hexagon-shape flex items-center justify-center mx-auto mb-2 hexagon-pulse">
                            <Icon className="w-5 h-5 text-charcoal-700" />
                          </div>
                          <p className="text-xs font-semibold text-charcoal-800">{achievement.title}</p>
                          <p className="text-xs text-charcoal-600">{achievement.year}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
