'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
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

interface AdminPanelProps {
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
}

type AdminView = 'dashboard' | 'customers' | 'sales' | 'sessions';

export function AdminPanel({ customers, onUpdateCustomers }: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('today');

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Analytics calculations
  const activeSessions = customers.filter(c => (c.activeSessions || []).length > 0);
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => 
    sum + customer.purchases.reduce((purchaseSum, purchase) => purchaseSum + purchase.price, 0), 0
  );
  
  const todaysPurchases = customers.flatMap(c => c.purchases).filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    const today = new Date();
    return purchaseDate.toDateString() === today.toDateString();
  });
  
  const todaysRevenue = todaysPurchases.reduce((sum, purchase) => sum + purchase.price, 0);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleForceCheckout = (customerId: string) => {
    const updatedCustomers = customers.map(customer => {
      if (customer.id === customerId) {
        return {
          ...customer,
          activeSessions: []
        };
      }
      return customer;
    });
    onUpdateCustomers(updatedCustomers);
  };

  const handleRefundPurchase = (customerId: string, purchaseId: string) => {
    const updatedCustomers = customers.map(customer => {
      if (customer.id === customerId) {
        return {
          ...customer,
          purchases: customer.purchases.filter(p => p.id !== purchaseId)
        };
      }
      return customer;
    });
    onUpdateCustomers(updatedCustomers);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions ({activeSessions.length})</h3>
        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((customer) => (
              <div key={customer.id} className="space-y-2">
                <div className="font-medium">{customer.name} ({formatPhoneNumber(customer.phone)})</div>
                {(customer.activeSessions || []).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg ml-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        Session started: {formatDate(session.startTime)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Auto-checkout: {formatDate(session.autoCheckoutTime)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleForceCheckout(customer.id)}
                      size="sm"
                      variant="outline"
                    >
                      Force Checkout All
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No active sessions</p>
        )}
      </Card>

      {/* Recent Purchases */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Purchases ({todaysPurchases.length})</h3>
        {todaysPurchases.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todaysPurchases.map((purchase) => {
              const customer = customers.find(c => c.purchases.some(p => p.id === purchase.id));
              return (
                <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{purchase.name}</p>
                    <p className="text-sm text-gray-600">
                      {customer?.name} • {formatDate(purchase.purchaseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(purchase.price)}</p>
                    <Button
                      onClick={() => customer && handleRefundPurchase(customer.id, purchase.id)}
                      size="sm"
                      variant="outline"
                      className="mt-1"
                    >
                      Refund
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No purchases today</p>
        )}
      </Card>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <Button onClick={() => setSearchTerm('')} variant="outline">
            Clear
          </Button>
        </div>
      </Card>

      {/* Customer List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Customers ({filteredCustomers.length})
        </h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold">{customer.name}</h4>
                    {(customer.activeSessions || []).length > 0 && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        {(customer.activeSessions || []).length} Active Session{(customer.activeSessions || []).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPhoneNumber(customer.phone)}
                    {customer.email && ` • ${customer.email}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Member since {formatDate(customer.createdAt)} • 
                    {customer.purchases.length} purchases • 
                    Total spent: {formatCurrency(customer.purchases.reduce((sum, p) => sum + p.price, 0))}
                  </p>
                  
                  {/* Active Passes */}
                  {customer.purchases.filter(p => p.status === 'active').length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Active passes:</p>
                      <div className="flex flex-wrap gap-1">
                        {customer.purchases
                          .filter(p => p.status === 'active')
                          .map(purchase => (
                            <span key={purchase.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {purchase.name}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {(customer.activeSessions || []).length > 0 && (
                    <Button
                      onClick={() => handleForceCheckout(customer.id)}
                      size="sm"
                      variant="outline"
                    >
                      Force Checkout All
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </Card>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Total Sales</h4>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(todaysRevenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{todaysPurchases.length} transactions</p>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Average Transaction</h4>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrency(todaysPurchases.length > 0 ? todaysRevenue / todaysPurchases.length : 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Per purchase</p>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Active Customers</h4>
          <p className="text-2xl font-bold text-purple-600 mt-2">{activeSessions.length}</p>
          <p className="text-sm text-gray-500 mt-1">Currently playing</p>
        </Card>
      </div>

      {/* Sales by Product Type */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sales by Product Type</h3>
        <div className="space-y-3">
          {['day_pass', 'monthly_pass', 'party_package'].map(type => {
            const purchases = todaysPurchases.filter(p => p.type === type);
            const revenue = purchases.reduce((sum, p) => sum + p.price, 0);
            return (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">{purchases.length} sold</p>
                </div>
                <p className="font-semibold">{formatCurrency(revenue)}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <Card className="p-4">
        <nav className="flex space-x-4">
          <Button
            onClick={() => setCurrentView('dashboard')}
            variant={currentView === 'dashboard' ? 'default' : 'outline'}
            size="sm"
          >
            📊 Dashboard
          </Button>
          <Button
            onClick={() => setCurrentView('customers')}
            variant={currentView === 'customers' ? 'default' : 'outline'}
            size="sm"
          >
            👥 Customers
          </Button>
          <Button
            onClick={() => setCurrentView('sales')}
            variant={currentView === 'sales' ? 'default' : 'outline'}
            size="sm"
          >
            💰 Sales
          </Button>
          <Button
            onClick={() => setCurrentView('sessions')}
            variant={currentView === 'sessions' ? 'default' : 'outline'}
            size="sm"
          >
            🕐 Sessions
          </Button>
        </nav>
      </Card>

      {/* Content */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'customers' && renderCustomers()}
      {currentView === 'sales' && renderSales()}
      {currentView === 'sessions' && renderDashboard()} {/* Reuse dashboard for now */}
    </div>
  );
}
