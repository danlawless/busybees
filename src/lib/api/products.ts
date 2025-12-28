/**
 * API Client for Products, Passes, and Parties
 * Centralized functions for making API calls to product management endpoints
 */

import {
  PassProduct,
  PartyProduct,
  FoodProduct,
  Allergen,
} from '@/lib/utils/productHelpers';

// ==================== TRANSFORMERS ====================

/**
 * Transform database pass (snake_case) to frontend format (camelCase)
 */
function transformPass(dbPass: Record<string, unknown>): PassProduct {
  return {
    id: dbPass.id as string,
    name: dbPass.name as string,
    category: dbPass.category as PassProduct['category'],
    price: Number(dbPass.price),
    duration: dbPass.duration as number,
    sessionsIncluded: dbPass.sessions_included as number,
    description: dbPass.description as string,
    stripePurchaseLink: (dbPass.stripe_purchase_link as string) || '',
    isActive: dbPass.is_active as boolean,
    createdAt: dbPass.created_at as string,
    updatedAt: dbPass.updated_at as string,
  };
}

/**
 * Transform database party (snake_case) to frontend format (camelCase)
 */
function transformParty(dbParty: Record<string, unknown>): PartyProduct {
  return {
    id: dbParty.id as string,
    name: dbParty.name as string,
    basePrice: Number(dbParty.base_price),
    capacity: dbParty.capacity as number,
    duration: dbParty.duration as number,
    includedItems: (dbParty.included_items as string[]) || [],
    addOns: (dbParty.add_ons as PartyProduct['addOns']) || [],
    description: dbParty.description as string,
    stripePurchaseLink: (dbParty.stripe_purchase_link as string) || '',
    isActive: dbParty.is_active as boolean,
    createdAt: dbParty.created_at as string,
    updatedAt: dbParty.updated_at as string,
  };
}

/**
 * Transform database product (snake_case) to frontend format (camelCase)
 */
function transformProduct(dbProduct: Record<string, unknown>): FoodProduct {
  // Parse allergens - could be JSON string or array
  let allergens: Allergen[] = [];
  if (dbProduct.allergens) {
    if (typeof dbProduct.allergens === 'string') {
      try {
        allergens = JSON.parse(dbProduct.allergens);
      } catch {
        allergens = [];
      }
    } else if (Array.isArray(dbProduct.allergens)) {
      allergens = dbProduct.allergens as Allergen[];
    }
  }

  return {
    id: dbProduct.id as string,
    name: dbProduct.name as string,
    category: dbProduct.category as FoodProduct['category'],
    price: Number(dbProduct.price),
    description: dbProduct.description as string,
    allergens,
    stripePurchaseLink: (dbProduct.stripe_purchase_link as string) || '',
    isActive: dbProduct.is_active as boolean,
    available: dbProduct.available as boolean,
    createdAt: dbProduct.created_at as string,
    updatedAt: dbProduct.updated_at as string,
  };
}

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
    const rawPasses = data.passes || [];
    return rawPasses.map(transformPass);
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
    return transformPass(data.pass);
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
    return transformPass(data.pass);
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
    const rawParties = data.parties || [];
    return rawParties.map(transformParty);
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
    return transformParty(data.party);
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
    return transformParty(data.party);
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
    const rawProducts = data.products || [];
    return rawProducts.map(transformProduct);
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
    return transformProduct(data.product);
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
    return transformProduct(data.product);
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




