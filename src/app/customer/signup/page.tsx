/**
 * Customer Portal Signup Page
 * Create new customer account with phone number and password
 * Supports redirect parameter to return users to their intended destination
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PURCHASING_ENABLED } from '@/lib/feature-flags';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/customer/dashboard';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Show Coming Soon message when purchasing is disabled
  if (!PURCHASING_ENABLED) {
    return (
      <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              Account registration will be available soon. Check back later!
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    // Clean phone number
    const cleanPhone = formData.phone.replace(/[^\d]/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/web-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: cleanPhone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Auto-subscribe to newsletter (fire and forget)
      fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          source: 'signup',
        }),
      }).catch(() => {
        // Silently fail - newsletter subscription is optional
      });

      setSuccess(true);
      // Redirect to the intended destination (or dashboard)
      setTimeout(() => {
        router.push(redirectTo);
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Created!
          </h2>
          <p className="text-gray-600 mb-4">
            Redirecting...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
        </Card>
      </div>
    );
  }

  // Build login link with redirect parameter if present
  const loginHref = redirectTo !== '/customer/dashboard'
    ? `/customer/login?redirect=${encodeURIComponent(redirectTo)}`
    : '/customer/login';

  return (
    <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🐝</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Join Busy Bees!
            </h2>
            <p className="text-gray-600">
              Create your account to start playing
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to log in to your account
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href={loginHref}
                className="text-yellow-600 hover:text-yellow-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Previously signed up at our facility?{' '}
              <Link
                href="/customer/set-password"
                className="text-yellow-600 hover:text-yellow-700 font-medium"
              >
                Set up online access
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function CustomerSignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
