'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SignupSuccess } from './SignupSuccess';

interface Child {
  id: string;
  name: string;
  birthdate: string;
  age: number; // Calculated from birthdate
  waiverSigned: boolean;
  waiverSignedDate?: string;
  createdAt: string;
}

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  children: Child[]; // Children registered to this customer
  purchases: Purchase[];
  activeSessions: Session[];
  savedCards: SavedCard[];
  createdAt: string;
  lastVisit?: string;
}

interface Purchase {
  id: string;
  type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate?: string;
  firstUseDate?: string; // When the pass was first used
  actualExpiryDate?: string; // Calculated expiry from first use
  usedSessions: number;
  totalSessions: number;
  status: 'active' | 'expired' | 'used';
  autoRenew?: boolean;
  nextRenewalDate?: string;
  childId?: string; // ID of the child this pass is for (required for passes, optional for party packages)
}

interface Session {
  id: string;
  customerId: string;
  purchaseId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  autoCheckoutTime: string;
}

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface PhoneLoginProps {
  customers: Customer[];
  onLogin: (customer: Customer) => void;
  onNewCustomer: (customer: Customer) => void;
  onAdminAccess?: () => void;
}

export function PhoneLogin({ customers, onLogin, onNewCustomer, onAdminAccess }: PhoneLoginProps) {
  // Login state - 8 individual boxes (4 phone + 4 PIN)
  const [phoneLast4, setPhoneLast4] = useState(['', '', '', '']);
  const [pin, setPin] = useState(['', '', '', '']);

  // Signup state
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Handle individual digit input with auto-advance
  const handleDigitChange = (
    value: string,
    index: number,
    type: 'phone' | 'pin',
    inputRefs: React.RefObject<(HTMLInputElement | null)[]>
  ) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    if (type === 'phone') {
      const newPhone = [...phoneLast4];
      newPhone[index] = digit;
      setPhoneLast4(newPhone);

      // Auto-advance to next input
      if (digit && index < 3) {
        inputRefs.current?.[index + 1]?.focus();
      } else if (digit && index === 3) {
        // Move to first PIN input
        inputRefs.current?.[4]?.focus();
      }
    } else {
      const newPin = [...pin];
      newPin[index] = digit;
      setPin(newPin);

      // Auto-advance to next input
      if (digit && index < 3) {
        inputRefs.current?.[index + 5]?.focus();
      }
    }

    setError('');
  };

  // Handle backspace
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    type: 'phone' | 'pin',
    inputRefs: React.RefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === 'Backspace') {
      if (type === 'phone') {
        const newPhone = [...phoneLast4];
        if (!newPhone[index] && index > 0) {
          // If current is empty, move back and clear previous
          inputRefs.current?.[index - 1]?.focus();
          newPhone[index - 1] = '';
          setPhoneLast4(newPhone);
        } else {
          newPhone[index] = '';
          setPhoneLast4(newPhone);
        }
      } else {
        const newPin = [...pin];
        const baseIndex = 4;
        if (!newPin[index] && index > 0) {
          // If current is empty, move back to previous PIN input or last phone input
          const prevIndex = index === 0 ? 3 : baseIndex + index - 1;
          inputRefs.current?.[prevIndex]?.focus();
          if (index > 0) {
            newPin[index - 1] = '';
            setPin(newPin);
          }
        } else {
          newPin[index] = '';
          setPin(newPin);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const last4Digits = phoneLast4.join('');
    const pinDigits = pin.join('');

    if (last4Digits.length !== 4) {
      setError('Please enter last 4 digits of phone number');
      setIsLoading(false);
      return;
    }

    if (pinDigits.length !== 4) {
      setError('Please enter your 4-digit PIN');
      setIsLoading(false);
      return;
    }

    try {
      // Attempt login with last 4 digits + PIN
      const response = await fetch('/api/auth/pos-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneLast4: last4Digits, pin: pinDigits }),
      });

      const data = await response.json();

      if (response.ok) {
        // Convert database user to Customer format
        const customer: Customer = {
          id: data.user.id,
          phone: data.user.phone,
          name: data.user.name,
          email: data.user.email,
          children: [],
          purchases: [],
          activeSessions: [],
          savedCards: [],
          createdAt: data.user.created_at,
          lastVisit: data.user.last_login,
        };
        onLogin(customer);
      } else if (response.status === 401) {
        // Wrong PIN - let them retry
        setError('Incorrect PIN. Please try again.');
        // Clear PIN boxes to let them re-enter
        setPin(['', '', '', '']);
        // Focus first PIN box
        setTimeout(() => {
          inputRefs.current?.[4]?.focus();
        }, 100);
      } else if (response.status === 404) {
        // User doesn't exist - show signup form
        setIsNewCustomer(true);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect. Please try again.');
    }

    setIsLoading(false);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/[^\d]/g, '');

    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleFullPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFullPhoneNumber(formatted);
    setError('');
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!customerName.trim()) {
      setError('Please enter your name');
      setIsLoading(false);
      return;
    }

    if (!customerEmail.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    const cleanPhone = fullPhoneNumber.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    const pinDigits = pin.join('');
    if (pinDigits.length !== 4) {
      setError('Please enter a 4-digit PIN');
      setIsLoading(false);
      return;
    }

    try {
      // Create account via API
      const response = await fetch('/api/auth/pos-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          pin: pinDigits,
          name: customerName.trim(),
          email: customerEmail.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message with email verification notice
        setSignupSuccess(true);

        // After 5 seconds, log them in and redirect
        setTimeout(() => {
          const newCustomer: Customer = {
            id: data.user.id,
            phone: data.user.phone,
            name: data.user.name,
            email: data.user.email,
            children: [],
            purchases: [],
            activeSessions: [],
            savedCards: [],
            createdAt: data.user.created_at,
            lastVisit: data.user.last_login,
          };
          onNewCustomer(newCustomer);
        }, 5000);
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Unable to connect. Please try again.');
    }

    setIsLoading(false);
  };

  const handleBackToLogin = () => {
    setIsNewCustomer(false);
    setSignupSuccess(false);
    setCustomerName('');
    setCustomerEmail('');
    setFullPhoneNumber('');
    setPin(['', '', '', '']);
    setPhoneLast4(['', '', '', '']);
    setError('');
  };

  // Create refs for input boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleBeeLogoClick = () => {
    setShowAdminModal(true);
    setAdminPassword('');
    setAdminError('');
  };

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '1234') {
      setShowAdminModal(false);
      setAdminPassword('');
      setAdminError('');
      if (onAdminAccess) {
        onAdminAccess();
      }
    } else {
      setAdminError('Incorrect password. Please try again.');
      setAdminPassword('');
    }
  };

  const handleCloseAdminModal = () => {
    setShowAdminModal(false);
    setAdminPassword('');
    setAdminError('');
  };

  // Show success message after signup
  if (signupSuccess) {
    return <SignupSuccess customerName={customerName} email={customerEmail} />;
  }

  if (isNewCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <Card className="p-8">
          <div className="text-center mb-6">
            <button
              type="button"
              onClick={handleBeeLogoClick}
              className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-3xl">🐝</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Busy Bees!</h2>
            <p className="text-gray-600">Let's create your account</p>
          </div>

          <form onSubmit={handleCreateCustomer} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Full Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                value={fullPhoneNumber}
                onChange={handleFullPhoneChange}
                placeholder="(555) 123-4567"
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg text-center"
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create 4-Digit PIN *
              </label>
              <div className="flex justify-center gap-2">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      if (inputRefs.current) inputRefs.current[index + 4] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(e.target.value, index, 'pin', inputRefs)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'pin', inputRefs)}
                    className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">You'll use this PIN to check in at the kiosk</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={handleBackToLogin}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <Card className="p-8">
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={handleBeeLogoClick}
            className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-3xl">🐝</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-600">Enter your phone number to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Last 4 of Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Last 4 Digits of Phone Number
            </label>
            <div className="flex justify-center gap-2">
              {phoneLast4.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    if (inputRefs.current) inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, index, 'phone', inputRefs)}
                  onKeyDown={(e) => handleKeyDown(e, index, 'phone', inputRefs)}
                  className="w-16 h-20 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {/* PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              4-Digit PIN
            </label>
            <div className="flex justify-center gap-2">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    if (inputRefs.current) inputRefs.current[index + 4] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, index, 'pin', inputRefs)}
                  onKeyDown={(e) => handleKeyDown(e, index, 'pin', inputRefs)}
                  className="w-16 h-20 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New to Busy Bees? No problem!
            <br />
            Enter your phone number and we'll get started.
          </p>
        </div>

        {/* Invisible Quick Login for Demo */}
        <button
          type="button"
          onClick={() => setPhoneNumber('(555) 123-4567')}
          className="absolute top-0 left-0 w-16 h-16 opacity-0 cursor-pointer z-10"
          title="Demo Login (invisible)"
        >
          Demo
        </button>
        </Card>
      </div>

      {/* Admin Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h2>
              <p className="text-gray-600">Enter password to access admin dashboard</p>
            </div>

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 tracking-widest"
                  maxLength={20}
                  autoFocus
                />
              </div>

              {adminError && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">
                  {adminError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseAdminModal}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adminPassword}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Access Admin
                </button>
              </div>
            </form>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Admin access only • Authorized personnel
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
