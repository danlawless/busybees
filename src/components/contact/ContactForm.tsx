'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, CheckCircle, User, Mail, MessageSquare, ArrowRight, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon'
import { fadeInUp, staggerContainer } from '@/lib/utils'

interface FormData {
  name: string
  email: string
  phone: string
  userType: string
  message: string
}

const userTypes = [
  { value: '', label: 'Please select...' },
  { value: 'parent', label: 'Parent/Guardian' },
  { value: 'party-planner', label: 'Party Planner' },
  { value: 'business', label: 'Business Inquiry' },
  { value: 'group', label: 'Group/School Visit' },
  { value: 'media', label: 'Media/Press' },
  { value: 'other', label: 'Other' }
]

export function ContactForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    userType: '',
    message: ''
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.userType) {
      newErrors.userType = 'Please select your inquiry type'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Please provide more details (at least 10 characters)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleGoHome = () => {
    router.push('/')
  }

  if (isSubmitted) {
    return (
      <section className="relative overflow-hidden py-20 bg-gradient-to-b from-primary-50 to-white">
        <HoneycombPattern variant="light" size="lg" />
        
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-secondary-600" />
            </div>
            
            <h1 className="text-4xl font-bold text-charcoal-800 mb-6">
              Thank You! 🎉
            </h1>
            
            <p className="text-xl text-charcoal-600 mb-8">
              We've received your message and will get back to you within 24 hours. 
              We're excited to help you create amazing memories at Busy Bees!
            </p>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-soft mb-8">
              <h3 className="text-lg font-semibold text-charcoal-800 mb-2">
                What happens next?
              </h3>
              <div className="space-y-2 text-charcoal-600">
                <p>✅ We'll review your {userTypes.find(type => type.value === formData.userType)?.label.toLowerCase()} inquiry</p>
                <p>📞 Our team will contact you within 24 hours</p>
                <p>🎈 We'll help you plan your perfect visit or event</p>
              </div>
            </div>

            <Button 
              onClick={handleGoHome}
              size="lg"
              className="min-w-48"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Homepage
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="absolute -bottom-10 -right-10 opacity-10"
          >
            <BeeIcon size="xl" animate={true} />
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden py-20 bg-gradient-to-b from-charcoal-50 to-white">
      <HoneycombPattern variant="light" size="lg" />
      
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-charcoal-800 sm:text-5xl mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-charcoal-600 max-w-2xl mx-auto">
            Have questions about visits, parties, or memberships? We'd love to hear from you!
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="max-w-2xl mx-auto"
        >
          <motion.div variants={fadeInUp}>
            <Card className="shadow-large">
              <CardHeader>
                <CardTitle className="text-2xl text-center flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 mr-3 text-primary-600" />
                  Contact Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-charcoal-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                        errors.name 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-neutral-300 bg-white focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                      placeholder="Your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                        errors.email 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-neutral-300 bg-white focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                      placeholder="your.email@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone Field (Optional) */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-charcoal-700 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors duration-200"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  {/* User Type Selection */}
                  <div>
                    <label htmlFor="userType" className="block text-sm font-medium text-charcoal-700 mb-2">
                      I am a... *
                    </label>
                    <select
                      id="userType"
                      name="userType"
                      value={formData.userType}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                        errors.userType 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-neutral-300 bg-white focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                    >
                      {userTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {errors.userType && (
                      <p className="mt-1 text-sm text-red-600">{errors.userType}</p>
                    )}
                  </div>

                  {/* Message Field */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-charcoal-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 resize-none ${
                        errors.message 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-neutral-300 bg-white focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                      placeholder="Tell us how we can help you..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                    )}
                    <p className="mt-1 text-sm text-charcoal-500">
                      {formData.message.length}/500 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>


        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 opacity-10">
          <BeeIcon size="lg" animate={false} />
        </div>
      </div>
    </section>
  )
}
