/**
 * Customer Portal Login Page
 * Phone + password authentication for customer account access
 * Supports redirect parameter to return users to their intended destination
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_ACCESS_ENABLED } from '@/lib/feature-flags';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/customer/dashboard';
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  // Check for success message from set-password page
  const passwordSet = searchParams.get('passwordSet') === 'true';

  // Show Coming Soon message when account access is disabled
  if (!ACCOUNT_ACCESS_ENABLED) {
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
              Customer accounts will be available soon. Check back later!
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
    setPhone(formatted);
    setError('');
    setNeedsPasswordSetup(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNeedsPasswordSetup(false);

    try {
      const response = await fetch('/api/auth/web-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/[^\d]/g, ''),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsPasswordSetup) {
          setNeedsPasswordSetup(true);
        }
        throw new Error(data.error || 'Login failed');
      }

      // Auto-subscribe to newsletter on login (fire and forget)
      if (data.user?.email) {
        fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.user.email,
            name: data.user.name,
            source: 'login',
          }),
        }).catch(() => {
          // Silently fail - newsletter subscription is optional
        });
      }

      // Redirect to the intended destination (or dashboard)
      router.push(redirectTo);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Build signup link with redirect parameter if present
  const signupHref = redirectTo !== '/customer/dashboard'
    ? `/customer/signup?redirect=${encodeURIComponent(redirectTo)}`
    : '/customer/signup';

  return (
    <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🐝</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back!
            </h2>
            <p className="text-gray-600">
              Sign in to your Busy Bees account
            </p>
          </div>

          {passwordSet && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
              Password set successfully! You can now log in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {needsPasswordSetup && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                <p className="mb-2">Your account was created at our facility.</p>
                <Link
                  href={`/customer/set-password?phone=${phone.replace(/[^\d]/g, '')}`}
                  className="text-yellow-700 hover:text-yellow-900 font-medium underline"
                >
                  Click here to set a password for online access
                </Link>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/customer/forgot-password"
              className="text-sm text-yellow-600 hover:text-yellow-700"
            >
              Forgot your password?
            </Link>
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href={signupHref}
                className="text-yellow-600 hover:text-yellow-700 font-medium"
              >
                Sign up
              </Link>
            </div>
          </div>

        </Card>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
