/**
 * Forgot Password Page
 * Allows users to request a password reset email
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [noEmail, setNoEmail] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);

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
    setNoEmail(false);
    setEmailFailed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);
    setNeedsPasswordSetup(false);
    setNoEmail(false);
    setEmailFailed(false);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/[^\d]/g, ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      if (data.needsPasswordSetup) {
        setNeedsPasswordSetup(true);
      } else if (data.noEmail) {
        setNoEmail(true);
      } else if (data.emailFailed) {
        setEmailFailed(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </h2>
            <p className="text-gray-600">
              Enter your phone number and we&apos;ll send you a reset link
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Check Your Email
              </h3>
              <p className="text-gray-600 mb-6">
                If an account exists with that phone number, you&apos;ll receive a password reset email shortly.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Don&apos;t see it? Check your spam folder or try again.
              </p>
              <Link href="/customer/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
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

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {needsPasswordSetup && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                    <p className="mb-2">Your account was created at our facility and doesn&apos;t have a web password yet.</p>
                    <Link
                      href={`/customer/set-password?phone=${phone.replace(/[^\d]/g, '')}`}
                      className="text-yellow-700 hover:text-yellow-900 font-medium underline"
                    >
                      Click here to set up your password
                    </Link>
                  </div>
                )}

                {noEmail && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                    <p className="mb-2">We don&apos;t have an email address on file for your account, so we&apos;re unable to send a reset link.</p>
                    <p>Please contact us at <a href="mailto:info@busybeesipc.com" className="text-yellow-700 hover:text-yellow-900 font-medium underline">info@busybeesipc.com</a> or visit our front desk to update your email and reset your password.</p>
                  </div>
                )}

                {emailFailed && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <p className="mb-2">We were unable to send the password reset email. Please try again in a few minutes.</p>
                    <p>If the problem persists, contact us at <a href="mailto:info@busybeesipc.com" className="text-red-600 hover:text-red-800 font-medium underline">info@busybeesipc.com</a> for assistance.</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/customer/login"
                  className="text-sm text-yellow-600 hover:text-yellow-700 inline-flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
