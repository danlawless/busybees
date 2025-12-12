/**
 * Email Verification Prompt Page
 * For POS users who want to access the customer portal
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { createClient } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/customer/login');
      return;
    }

    setUser(user);
    setEmail(user.email || '');
    setIsLoading(false);
  };

  const handleSendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsSending(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();

      // If user doesn't have an email yet, update it
      if (!user.email) {
        const { error: updateError } = await supabase.auth.updateUser({
          email: email,
        });

        if (updateError) throw updateError;
      }

      // Send verification email
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (resendError) throw resendError;

      setMessage('Verification email sent! Check your inbox and click the link to verify.');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verify Your Email
              </h2>
              <p className="text-gray-600">
                To access your account online, please verify your email address
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Why verify?</strong> Email verification helps us protect your account
                  and send you important updates about your passes and party bookings.
                </p>
              </div>

              {!user?.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              )}

              {user?.email && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600">
                    We'll send a verification link to:
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {user.email}
                  </p>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSendVerification}
                disabled={isSending}
                className="w-full"
                size="lg"
              >
                {isSending ? 'Sending...' : 'Send Verification Email'}
              </Button>

            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

