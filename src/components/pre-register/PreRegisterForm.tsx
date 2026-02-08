'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Baby,
  Plus,
  Trash2,
  CheckCircle,
  Home,
  ArrowRight,
  Calendar,
  Sparkles,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BeeIcon, HoneycombPattern } from '@/components/ui/BeeIcon';
import { fadeInUp, staggerContainer, parseDateString } from '@/lib/utils';
import { logger } from '@/lib/client-logger';
import { PURCHASING_ENABLED } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/client';

interface Child {
  id: string;
  name: string;
  birthdate: string;
}

interface FormData {
  parentName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  children: Child[];
  marketingOptIn: boolean;
}

interface FormErrors {
  parentName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  children?: string;
  childErrors?: Record<string, { name?: string; birthdate?: string }>;
}

export function PreRegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    parentName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    children: [{ id: crypto.randomUUID(), name: '', birthdate: '' }],
    marketingOptIn: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Show Coming Soon message when purchasing is disabled
  if (!PURCHASING_ENABLED) {
    return (
      <section className="relative overflow-hidden py-12 sm:py-20 bg-gradient-to-b from-charcoal-50 to-white min-h-screen">
        <HoneycombPattern variant="light" size="lg" />
        <div className="relative mx-auto max-w-md px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-3xl font-bold text-charcoal-800 mb-2">
                Coming Soon
              </h2>
              <p className="text-charcoal-600 mb-6">
                Pre-registration will be available soon. Check back later!
              </p>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </section>
    );
  }

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const childErrors: Record<string, { name?: string; birthdate?: string }> = {};

    if (!formData.parentName.trim()) {
      newErrors.parentName = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const cleanPhone = formData.phone.replace(/[^\d]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate children
    let hasChildError = false;
    formData.children.forEach((child) => {
      const childError: { name?: string; birthdate?: string } = {};

      if (!child.name.trim()) {
        childError.name = 'Name is required';
        hasChildError = true;
      }

      if (!child.birthdate) {
        childError.birthdate = 'Birth date is required';
        hasChildError = true;
      } else {
        // Validate birthdate is not in the future
        // Use parseDateString to handle YYYY-MM-DD format correctly in all timezones
        const birthDate = parseDateString(child.birthdate);
        const today = new Date();
        if (birthDate > today) {
          childError.birthdate = 'Birth date cannot be in the future';
          hasChildError = true;
        }
      }

      if (Object.keys(childError).length > 0) {
        childErrors[child.id] = childError;
      }
    });

    if (formData.children.length === 0) {
      newErrors.children = 'At least one child is required';
    } else if (hasChildError) {
      newErrors.childErrors = childErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const handleChildChange = (childId: string, field: 'name' | 'birthdate', value: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map(child =>
        child.id === childId ? { ...child, [field]: value } : child
      ),
    }));

    // Clear child-specific error
    if (errors.childErrors?.[childId]?.[field]) {
      setErrors(prev => ({
        ...prev,
        childErrors: {
          ...prev.childErrors,
          [childId]: { ...prev.childErrors?.[childId], [field]: undefined },
        },
      }));
    }
  };

  const addChild = () => {
    if (formData.children.length < 5) {
      setFormData(prev => ({
        ...prev,
        children: [...prev.children, { id: crypto.randomUUID(), name: '', birthdate: '' }],
      }));
    }
  };

  const removeChild = (childId: string) => {
    if (formData.children.length > 1) {
      setFormData(prev => ({
        ...prev,
        children: prev.children.filter(child => child.id !== childId),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pre-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentName: formData.parentName.trim(),
          email: formData.email.trim(),
          phone: formData.phone,
          password: formData.password,
          children: formData.children.map(child => ({
            name: child.name.trim(),
            birthdate: child.birthdate,
          })),
          marketingOptIn: formData.marketingOptIn,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit pre-registration');
      }

      // Account created - now sign them in automatically using web-login API
      // (which properly sets cookies and handles the session)
      const loginResponse = await fetch('/api/auth/web-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone.replace(/[^\d]/g, ''),
          password: formData.password,
        }),
      });

      const signInError = !loginResponse.ok;

      if (signInError) {
        // Account was created but sign-in failed - redirect to login page
        logger.error({ error: signInError }, 'Auto sign-in after pre-registration failed');
        router.push('/customer/login?message=Account created! Please log in with your email.');
        return;
      }

      // Successfully signed in - redirect to customer dashboard
      router.push('/customer/dashboard');
    } catch (error) {
      logger.error({ error }, 'Pre-registration submission error');
      alert('There was an error submitting your registration. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // Success state
  if (isSubmitted) {
    return (
      <section className="relative overflow-hidden py-20 bg-gradient-to-b from-primary-50 to-white min-h-[80vh]">
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
              You're All Set! 🎉
            </h1>

            <p className="text-xl text-charcoal-600 mb-8">
              Thanks for registering, {formData.parentName.split(' ')[0]}!
              Your family is now in our system and ready for a speedy check-in.
            </p>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-soft mb-8">
              <h3 className="text-lg font-semibold text-charcoal-800 mb-4">
                What to expect on your visit:
              </h3>
              <div className="space-y-3 text-charcoal-600 text-left">
                <div className="flex items-start space-x-3">
                  <span className="text-primary-600 text-xl">1️⃣</span>
                  <span>Give your phone number at the kiosk</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-primary-600 text-xl">2️⃣</span>
                  <span>Sign the waiver for your children (one-time)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-primary-600 text-xl">3️⃣</span>
                  <span>Purchase a day pass or membership</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-primary-600 text-xl">4️⃣</span>
                  <span>Start playing! 🐝</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-8">
              <p className="text-sm text-yellow-800">
                <strong>Remember:</strong> Socks are required for play! We sell them at the front desk if you forget.
              </p>
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
    );
  }

  // Form state
  return (
    <section className="relative overflow-hidden py-12 sm:py-20 bg-gradient-to-b from-charcoal-50 to-white min-h-screen">
      <HoneycombPattern variant="light" size="lg" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Skip the line at check-in!
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal-800 sm:text-5xl mb-4">
            Register Your Family
          </h1>
          <p className="text-lg sm:text-xl text-charcoal-600 max-w-2xl mx-auto">
            Get in our system now so when you arrive, you can skip the registration line and get straight to playing!
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
                <CardTitle className="text-xl sm:text-2xl text-center flex items-center justify-center">
                  <Baby className="w-6 h-6 mr-3 text-primary-600" />
                  Family Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Parent/Guardian Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-charcoal-800 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary-600" />
                      Parent/Guardian
                    </h3>

                    <div>
                      <label htmlFor="parentName" className="block text-sm font-medium text-charcoal-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="parentName"
                        name="parentName"
                        value={formData.parentName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                          errors.parentName
                            ? 'border-red-300 bg-red-50 focus:border-red-500'
                            : 'border-neutral-300 bg-white focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                        placeholder="Your full name"
                      />
                      {errors.parentName && (
                        <p className="mt-1 text-sm text-red-600">{errors.parentName}</p>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-1" />
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

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-charcoal-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          maxLength={14}
                          className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                            errors.phone
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : 'border-neutral-300 bg-white focus:border-primary-500'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                          placeholder="(555) 123-4567"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                            errors.password
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : 'border-neutral-300 bg-white focus:border-primary-500'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                          placeholder="Create a password"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal-700 mb-2">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                            errors.confirmPassword
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : 'border-neutral-300 bg-white focus:border-primary-500'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                          placeholder="Confirm your password"
                        />
                        {errors.confirmPassword && (
                          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Children Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-charcoal-800 flex items-center gap-2">
                        <Baby className="w-5 h-5 text-primary-600" />
                        Children
                      </h3>
                      {formData.children.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addChild}
                          className="text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Child
                        </Button>
                      )}
                    </div>

                    {errors.children && (
                      <p className="text-sm text-red-600">{errors.children}</p>
                    )}

                    <AnimatePresence>
                      {formData.children.map((child, index) => (
                        <motion.div
                          key={child.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-charcoal-50 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-charcoal-600">
                              Child {index + 1}
                            </span>
                            {formData.children.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeChild(child.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                aria-label="Remove child"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                Child's Name *
                              </label>
                              <input
                                type="text"
                                value={child.name}
                                onChange={(e) => handleChildChange(child.id, 'name', e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border transition-colors duration-200 ${
                                  errors.childErrors?.[child.id]?.name
                                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                                    : 'border-neutral-300 bg-white focus:border-primary-500'
                                } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                                placeholder="Child's name"
                              />
                              {errors.childErrors?.[child.id]?.name && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors.childErrors[child.id].name}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Birth Date *
                              </label>
                              <input
                                type="date"
                                value={child.birthdate}
                                onChange={(e) => handleChildChange(child.id, 'birthdate', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className={`w-full px-3 py-2 rounded-lg border transition-colors duration-200 ${
                                  errors.childErrors?.[child.id]?.birthdate
                                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                                    : 'border-neutral-300 bg-white focus:border-primary-500'
                                } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                              />
                              {errors.childErrors?.[child.id]?.birthdate && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors.childErrors[child.id].birthdate}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {formData.children.length >= 5 && (
                      <p className="text-sm text-charcoal-500 text-center">
                        Maximum of 5 children per registration
                      </p>
                    )}
                  </div>

                  {/* Marketing Opt-in */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="marketingOptIn"
                      name="marketingOptIn"
                      checked={formData.marketingOptIn}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="marketingOptIn" className="text-sm text-charcoal-600">
                      Yes, send me updates about special events, promotions, and news from Busy Bees!
                    </label>
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
                          Registering...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Complete Pre-Registration
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-charcoal-500 text-center">
                    By pre-registering, you agree to our Terms of Service and Privacy Policy.
                    You'll still need to sign a waiver and purchase a pass on your first visit.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 opacity-10 hidden lg:block">
          <BeeIcon size="lg" animate={false} />
        </div>
      </div>
    </section>
  );
}
