/**
 * API Client for BusyBees Mobile
 * Communicates with the Next.js backend
 */

import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiError {
  error: string;
  details?: string;
}

class ApiClient {
  private token: string | null = null;

  async setToken(token: string): Promise<void> {
    this.token = token;
    await SecureStore.setItemAsync('auth_token', token);
  }

  async loadToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await SecureStore.getItemAsync('auth_token');
    }
    return this.token;
  }

  async clearToken(): Promise<void> {
    this.token = null;
    await SecureStore.deleteItemAsync('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.loadToken();

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.details || error.error || 'Request failed');
    }

    return data as T;
  }

  // ============================================
  // Terminal API
  // ============================================

  async getConnectionToken(locationId?: string): Promise<{ secret: string }> {
    return this.request('/api/stripe/terminal/connection-token', {
      method: 'POST',
      body: JSON.stringify({ location_id: locationId }),
    });
  }

  async listLocations(): Promise<{ locations: TerminalLocation[] }> {
    return this.request('/api/stripe/terminal/locations');
  }

  async createTerminalPayment(params: {
    amount: number;
    customer_id: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    payment_intent_id: string;
    client_secret: string;
    amount: number;
    currency: string;
  }> {
    return this.request('/api/stripe/terminal/payment', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ============================================
  // POS Purchase API
  // ============================================

  async createPurchase(params: {
    customer_id: string;
    product_id: string;
    product_name: string;
    product_price: number;
    product_description?: string;
    purchase_type: string;
    child_id?: string;
    quantity?: number;
    payment_method: 'terminal' | 'saved_card' | 'cash';
    terminal_payment_intent_id?: string;
    payment_method_id?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    success: boolean;
    purchase: Purchase;
    payment_intent_id: string | null;
    payment_status: string;
    payment_method: string;
  }> {
    return this.request('/api/purchases/pos', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ============================================
  // Customer API
  // ============================================

  async searchCustomers(query: string): Promise<{ customers: Customer[] }> {
    return this.request(`/api/customers/search?q=${encodeURIComponent(query)}`);
  }

  async getCustomer(id: string): Promise<{ customer: Customer }> {
    return this.request(`/api/customers/${id}`);
  }

  // ============================================
  // Products API
  // ============================================

  async listProducts(): Promise<{ products: Product[] }> {
    return this.request('/api/products');
  }
}

// Types (shared with web app)
export interface TerminalLocation {
  id: string;
  display_name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  children: Array<{
    id: string;
    name: string;
    birthdate: string;
  }>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
}

export interface Purchase {
  id: string;
  customer_id: string;
  product_id: string;
  name: string;
  price: number;
  type: string;
  status: string;
  purchase_date: string;
  expiry_date?: string;
}

export const api = new ApiClient();

