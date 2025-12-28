'use client';

import React, { useState } from 'react';
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

// Helper function to calculate age from birthdate
const calculateAge = (birthdate: string): number => {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

export function PhoneLogin({ customers, onLogin, onNewCustomer, onAdminAccess }: PhoneLoginProps) {
  // Login state - 10 digit phone number
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
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

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

    try {
      // Attempt login with full phone number
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
            const sessionsData = await sessionsResponse.json();
            // Convert API format to component format
            activeSessions = sessionsData.map((session: any) => ({
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone Number */}
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
            />
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
