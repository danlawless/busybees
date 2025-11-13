/**
 * PhoneLogin Component - Supabase Version
 * Handles customer phone authentication and registration
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PhoneLoginProps {
  onAdminAccess?: () => void;
}

export function PhoneLoginV2({ onAdminAccess }: PhoneLoginProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Admin access
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

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
    setPhoneNumber(formatted);
    setError('');
  };

  const getCleanPhone = () => {
    return phoneNumber.replace(/[^\d]/g, '');
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanPhone = getCleanPhone();

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    try {
      // Check if customer exists
      const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingUser) {
        // Customer exists - for POS, we'll do a simplified login
        // In production, you'd want phone OTP verification
        // For now, we'll use a backdoor login approach
        setError('');
        router.push('/pos/checkin');
      } else {
        // New customer - show registration form
        setIsNewCustomer(true);
      }
    } catch (err) {
      console.error('Error checking customer:', err);
      setError('Failed to check customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanPhone = getCleanPhone();

    if (!customerName.trim()) {
      setError('Please enter your name');
      setIsLoading(false);
      return;
    }

    try {
      // For POS kiosk mode, we create users directly without email auth
      // This is a simplified approach - you may want to handle this differently
      const tempPassword = `temp${cleanPhone}${Date.now()}`; // Temporary password
      const tempEmail = customerEmail.trim() || `${cleanPhone}@temp.busybees.local`;

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            name: customerName.trim(),
            phone: cleanPhone,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          name: customerName.trim(),
          phone: cleanPhone,
          email: customerEmail.trim() || null,
          role: 'customer',
        });

        if (profileError) throw profileError;

        // Success - redirect to check-in
        router.push('/pos/checkin');
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (error) throw error;

      // Check if user is staff/admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userData && ['staff', 'admin'].includes(userData.role)) {
        router.push('/pos/admin');
        if (onAdminAccess) onAdminAccess();
      } else {
        setAdminError('Access denied. Admin privileges required.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setAdminError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-block bg-yellow-400 rounded-full p-4 mb-4">
            <span className="text-6xl">🐝</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Busy Bees</h1>
          <p className="text-lg text-gray-600">Indoor Play Center</p>
        </div>

        {/* Main Card */}
        <Card className="p-8 shadow-xl">
          {!isNewCustomer ? (
            // Phone Number Entry
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                <p className="text-gray-600">Enter your phone number to get started</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center font-mono"
                  maxLength={14}
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-4 text-lg"
                disabled={isLoading || getCleanPhone().length !== 10}
              >
                {isLoading ? '...' : 'Continue'}
              </Button>
            </form>
          ) : (
            // New Customer Registration
            <form onSubmit={handleNewCustomerSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome New Customer!</h2>
                <p className="text-gray-600">Please provide your information</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    setIsNewCustomer(false);
                    setCustomerName('');
                    setCustomerEmail('');
                    setError('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !customerName.trim()}
                >
                  {isLoading ? '...' : 'Create Account'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Admin Access Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => setShowAdminModal(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Staff / Admin Access
          </button>
        </div>

        {/* Admin Login Modal */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="p-8 max-w-md w-full">
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👨‍💼</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Staff / Admin Login
                  </h2>
                  <p className="text-gray-600">Enter your credentials</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@busybees.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {adminError && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                    {adminError}
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowAdminModal(false);
                      setAdminEmail('');
                      setAdminPassword('');
                      setAdminError('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading || !adminEmail || !adminPassword}
                  >
                    {isLoading ? '...' : 'Login'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

