'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const getCleanPhoneNumber = (phone: string) => {
    return phone.replace(/[^\d]/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const cleanPhone = getCleanPhoneNumber(phoneNumber);

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    if (!pin || pin.length !== 4) {
      setError('Please enter your 4-digit PIN');
      setIsLoading(false);
      return;
    }

    try {
      // Attempt login with phone + PIN
      const response = await fetch('/api/auth/pos-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin }),
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
        // Check if user exists but PIN is wrong, or if user doesn't exist
        const checkResponse = await fetch(`/api/customers?phone=${cleanPhone}`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.customers && checkData.customers.length === 0) {
            // User doesn't exist - show signup form
            setIsNewCustomer(true);
          } else {
            // User exists but wrong PIN
            setError('Invalid PIN. Please try again.');
          }
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect. Please try again.');
    }

    setIsLoading(false);
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

    if (!pin || pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      setIsLoading(false);
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      setIsLoading(false);
      return;
    }

    try {
      const cleanPhone = getCleanPhoneNumber(phoneNumber);

      // Create account via API
      const response = await fetch('/api/auth/pos-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          pin,
          name: customerName.trim(),
          email: customerEmail.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Convert database user to Customer format
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
    setCustomerName('');
    setCustomerEmail('');
    setPin('');
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
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
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
                Email Address (Optional)
              </label>
              <input
                type="email"
                id="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="signup-pin" className="block text-sm font-medium text-gray-700 mb-2">
                Create 4-Digit PIN *
              </label>
              <input
                type="password"
                id="signup-pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-2xl tracking-widest"
                required
              />
              <p className="text-xs text-gray-500 mt-1">You'll use this PIN to check in at the kiosk</p>
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
          <div className="text-center">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg text-center"
              maxLength={14}
              required
            />
          </div>

          <div className="text-center">
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              4-Digit PIN
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-2xl tracking-widest"
              required
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
