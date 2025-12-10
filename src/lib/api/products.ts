/**
 * API Client for Products, Passes, and Parties
 * Centralized functions for making API calls to product management endpoints
 */

import {
  PassProduct,
  PartyProduct,
  FoodProduct,
} from '@/lib/utils/productHelpers';

// ==================== PASSES ====================

/**
 * Fetch all passes or just active passes
 */
export async function fetchPasses(activeOnly: boolean = false): Promise<PassProduct[]> {
  try {
    const url = activeOnly ? '/api/passes?active=true' : '/api/passes';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch passes');
    }

    const data = await response.json();
    return data.passes || [];
  } catch (error) {
    console.error('Error fetching passes:', error);
    throw error;
  }
}

/**
 * Create a new pass
 */
export async function createPass(passData: Omit<PassProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<PassProduct> {
  try {
    const response = await fetch('/api/passes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create pass');
    }

    const data = await response.json();
    return data.pass;
  } catch (error) {
    console.error('Error creating pass:', error);
    throw error;
  }
}

/**
 * Update an existing pass
 */
export async function updatePass(passId: string, passData: Partial<PassProduct>): Promise<PassProduct> {
  try {
    const response = await fetch('/api/passes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: passId, ...passData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update pass');
    }

    const data = await response.json();
    return data.pass;
  } catch (error) {
    console.error('Error updating pass:', error);
    throw error;
  }
}

/**
 * Delete a pass
 */
export async function deletePass(passId: string): Promise<void> {
  try {
    const response = await fetch(`/api/passes?id=${passId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete pass');
    }
  } catch (error) {
    console.error('Error deleting pass:', error);
    throw error;
  }
}

// ==================== PARTIES ====================

/**
 * Fetch all parties or just active parties
 */
export async function fetchParties(activeOnly: boolean = false): Promise<PartyProduct[]> {
  try {
    const url = activeOnly ? '/api/parties?active=true' : '/api/parties';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch parties');
    }

    const data = await response.json();
    return data.parties || [];
  } catch (error) {
    console.error('Error fetching parties:', error);
    throw error;
  }
}

/**
 * Create a new party
 */
export async function createParty(partyData: Omit<PartyProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<PartyProduct> {
  try {
    const response = await fetch('/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partyData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create party');
    }

    const data = await response.json();
    return data.party;
  } catch (error) {
    console.error('Error creating party:', error);
    throw error;
  }
}

/**
 * Update an existing party
 */
export async function updateParty(partyId: string, partyData: Partial<PartyProduct>): Promise<PartyProduct> {
  try {
    const response = await fetch(`/api/parties/${partyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partyData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update party');
    }

    const data = await response.json();
    return data.party;
  } catch (error) {
    console.error('Error updating party:', error);
    throw error;
  }
}

/**
 * Delete a party
 */
export async function deleteParty(partyId: string): Promise<void> {
  try {
    const response = await fetch(`/api/parties/${partyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete party');
    }
  } catch (error) {
    console.error('Error deleting party:', error);
    throw error;
  }
}

// ==================== PRODUCTS ====================

/**
 * Fetch all products or just available products
 */
export async function fetchProducts(availableOnly: boolean = false, category?: string): Promise<FoodProduct[]> {
  try {
    let url = availableOnly ? '/api/products?available=true' : '/api/products';
    if (category) {
      url += availableOnly ? `&category=${category}` : `?category=${category}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch products');
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Create a new product
 */
export async function createProduct(productData: Omit<FoodProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<FoodProduct> {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }

    const data = await response.json();
    return data.product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(productId: string, productData: Partial<FoodProduct>): Promise<FoodProduct> {
  try {
    const response = await fetch('/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: productId, ...productData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }

    const data = await response.json();
    return data.product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const response = await fetch(`/api/products?id=${productId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete product');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}




