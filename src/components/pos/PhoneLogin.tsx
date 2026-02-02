'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SignupSuccess } from './SignupSuccess';
import { parseDateString } from '@/lib/utils';

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
  onAdminAccess?: (user?: { id: string; name: string; role: 'staff' | 'admin' }) => void;
}

// Helper function to calculate age from birthdate
const calculateAge = (birthdate: string): number => {
  const today = new Date();
  // Use parseDateString to handle YYYY-MM-DD format correctly in all timezones
  const birth = parseDateString(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

export function PhoneLogin({ customers, onLogin, onNewCustomer, onAdminAccess }: PhoneLoginProps) {
  // Login state
  const [phoneNumber, setPhoneNumber] = useState('');

  // Signup state
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // Handle phone number input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    // Check if customer exists
    try {
      const checkResponse = await fetch('/api/auth/pos-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const checkData = await checkResponse.json();

      if (!checkData.exists) {
        // New customer - go to signup
        setFullPhoneNumber(phoneNumber);
        setIsNewCustomer(true);
        setIsLoading(false);
        return;
      }
    } catch {
      setError('Unable to connect. Please try again.');
      setIsLoading(false);
      return;
    }

    // Login with phone only
    try {
      const response = await fetch('/api/auth/pos-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        // Fetch customer's children from database
        let children = [];
        try {
          const childrenResponse = await fetch(`/api/children?customer_id=${data.user.id}`);
          if (childrenResponse.ok) {
            const childrenData = await childrenResponse.json();
            // Convert API format to component format
            children = childrenData.map((child: any) => ({
              id: child.id,
              name: child.name,
              birthdate: child.birthdate,
              age: calculateAge(child.birthdate),
              waiverSigned: child.waiver_signed,
              waiverSignedDate: child.waiver_signed_date,
              createdAt: child.created_at,
            }));
          }
        } catch (err) {
          console.error('Error fetching children:', err);
          // Continue with empty children array
        }

        // Fetch customer's purchases from database
        let purchases = [];
        try {
          const purchasesResponse = await fetch(`/api/purchases?customer_id=${data.user.id}`);
          if (purchasesResponse.ok) {
            const { purchases: purchasesData } = await purchasesResponse.json();
            // Convert API format to component format
            purchases = (purchasesData || []).map((purchase: any) => ({
              id: purchase.id,
              type: purchase.type,
              name: purchase.name,
              price: purchase.price,
              purchaseDate: purchase.purchase_date,
              expiryDate: purchase.expiry_date,
              usedSessions: purchase.used_sessions,
              totalSessions: purchase.total_sessions,
              status: purchase.status,
              firstUseDate: purchase.first_use_date,
              actualExpiryDate: purchase.actual_expiry_date,
              childId: purchase.child_id,
              autoRenew: purchase.auto_renew,
              nextRenewalDate: purchase.next_renewal_date,
              stripePaymentIntentId: purchase.stripe_payment_intent_id,
              stripeSubscriptionId: purchase.stripe_subscription_id,
              partyDate: purchase.party_date,
              partyStartTime: purchase.party_start_time,
              partyGuests: purchase.party_guests,
              partyNotes: purchase.party_notes,
            }));
          }
        } catch (err) {
          console.error('Error fetching purchases:', err);
          // Continue with empty purchases array
        }

        // Fetch customer's active sessions from database
        let activeSessions = [];
        try {
          const sessionsResponse = await fetch(`/api/sessions?customer_id=${data.user.id}&status=active`);
          if (sessionsResponse.ok) {
            const { sessions: sessionsData } = await sessionsResponse.json();
            // Convert API format to component format
            activeSessions = (sessionsData || []).map((session: any) => ({
              id: session.id,
              customerId: session.customer_id,
              purchaseId: session.purchase_id,
              startTime: session.start_time,
              endTime: session.end_time,
              autoCheckoutTime: session.auto_checkout_time,
              status: session.status,
            }));
          }
        } catch (err) {
          console.error('Error fetching sessions:', err);
          // Continue with empty sessions array
        }

        // Fetch customer's saved cards from database
        let savedCards = [];
        try {
          const cardsResponse = await fetch(`/api/customers/${data.user.id}/cards`);
          if (cardsResponse.ok) {
            const cardsData = await cardsResponse.json();
            // Convert API format to component format
            savedCards = cardsData.map((card: any) => ({
              id: card.id,
              last4: card.last4,
              brand: card.brand,
              expiryMonth: card.expiry_month,
              expiryYear: card.expiry_year,
              isDefault: card.is_default,
            }));
          }
        } catch (err) {
          console.error('Error fetching saved cards:', err);
          // Continue with empty cards array
        }

        // Convert database user to Customer format
        const customer: Customer = {
          id: data.user.id,
          phone: data.user.phone,
          name: data.user.name,
          email: data.user.email,
          children: children,
          purchases: purchases,
          activeSessions: activeSessions,
          savedCards: savedCards,
          createdAt: data.user.created_at,
          lastVisit: data.user.last_login,
        };
        onLogin(customer);
      } else if (response.status === 404) {
        // User doesn't exist - show signup form with phone pre-filled
        setFullPhoneNumber(phoneNumber);
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

    try {
      // Create account via API
      const response = await fetch('/api/auth/pos-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
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
    setPhoneNumber('');
    setError('');
  };

  const formatStaffPhoneInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = staffPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length !== 10 || !staffPassword) return;

    setStaffLoading(true);
    setStaffError('');

    try {
      const response = await fetch('/api/auth/staff-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password: staffPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowStaffLogin(false);
        if (onAdminAccess) {
          onAdminAccess({ id: data.user.id, name: data.user.name, role: data.user.role });
        }
      } else {
        setStaffError(data.error || 'Invalid credentials');
        setStaffPassword('');
      }
    } catch {
      setStaffError('Authentication failed. Please try again.');
      setStaffPassword('');
    } finally {
      setStaffLoading(false);
    }
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
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🐝</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Busy Bees!</h2>
            <p className="text-gray-600">Let's create your account</p>
          </div>

          <form onSubmit={handleCreateCustomer} className="space-y-6" autoComplete="off">
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
                autoComplete="off"
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
                autoComplete="off"
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
                autoComplete="off"
              />
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
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-600">Enter your phone number to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          {/* Phone Number - always shown */}
          <div>
            <label htmlFor="login-phone" className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Phone Number
            </label>
            <input
              type="tel"
              id="login-phone"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              maxLength={14}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-2xl text-center font-medium"
              required
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : 'Continue'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New to Busy Bees? No problem!
            <br />
            Enter your phone number and we'll get started.
          </p>
        </div>

        </Card>

        {/* Staff Login Toggle */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setShowStaffLogin(!showStaffLogin);
              setStaffPhone('');
              setStaffPassword('');
              setStaffError('');
            }}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            {showStaffLogin ? 'Back to Customer Login' : 'Staff Login'}
          </button>
        </div>

        {/* Staff Login Form */}
        {showStaffLogin && (
          <Card className="p-6 mt-4 border-2 border-red-200">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Staff Login</h3>
              <p className="text-sm text-gray-600">Enter your staff credentials</p>
            </div>

            <form onSubmit={handleStaffLoginSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(formatStaffPhoneInput(e.target.value))}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  autoFocus
                  disabled={staffLoading}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  disabled={staffLoading}
                  autoComplete="off"
                />
              </div>

              {staffError && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">
                  {staffError}
                </div>
              )}

              <button
                type="submit"
                disabled={staffPhone.replace(/[^\d]/g, '').length !== 10 || !staffPassword || staffLoading}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {staffLoading ? 'Logging in...' : 'Staff Login'}
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
