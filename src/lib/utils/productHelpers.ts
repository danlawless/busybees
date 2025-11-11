/**
 * Product Management Helper Functions
 * Utilities for managing passes, party packages, and products (food/beverages/retail)
 */

// ==================== TYPE DEFINITIONS ====================

export type PassCategory = 'day' | 'weekly' | 'monthly';
export type ProductCategory = 'food' | 'beverage' | 'retail';
export type Allergen = 'peanuts' | 'tree_nuts' | 'dairy' | 'gluten' | 'eggs' | 'soy' | 'fish' | 'shellfish';

export interface PassProduct {
  id: string;
  name: string;
  category: PassCategory;
  price: number;
  duration: number; // hours for day pass, days for weekly/monthly
  sessionsIncluded: number; // 1 for day pass, 999 for unlimited (weekly/monthly)
  description: string;
  stripePurchaseLink: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartyAddOn {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface PartyProduct {
  id: string;
  name: string;
  basePrice: number;
  capacity: number; // max number of kids
  duration: number; // hours
  includedItems: string[]; // ["Decorations", "Plates", "Napkins", "Party Host"]
  addOns: PartyAddOn[];
  description: string;
  stripePurchaseLink: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodProduct {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  allergens: Allergen[];
  stripePurchaseLink: string;
  isActive: boolean;
  available: boolean; // separate from active - can be temporarily unavailable
  createdAt: string;
  updatedAt: string;
}

export interface VolumeDiscount {
  id: string;
  productId: string; // links to pass, party, or product
  productType: 'pass' | 'party' | 'product'; // which category
  minQuantity: number;
  discountPercent: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== STORAGE FUNCTIONS ====================

const STORAGE_KEYS = {
  PASSES: 'busybees_passes',
  PARTIES: 'busybees_parties',
  PRODUCTS: 'busybees_products',
  VOLUME_DISCOUNTS: 'busybees_volume_discounts',
};

/**
 * Get all passes from localStorage
 */
export function getPassesFromStorage(): PassProduct[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEYS.PASSES);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save passes to localStorage
 */
export function savePassesToStorage(passes: PassProduct[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PASSES, JSON.stringify(passes));
}

/**
 * Get all parties from localStorage
 */
export function getPartiesFromStorage(): PartyProduct[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEYS.PARTIES);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save parties to localStorage
 */
export function savePartiesToStorage(parties: PartyProduct[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(parties));
}

/**
 * Get all products from localStorage
 */
export function getProductsFromStorage(): FoodProduct[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save products to localStorage
 */
export function saveProductsToStorage(products: FoodProduct[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

/**
 * Get all volume discounts from localStorage
 */
export function getVolumeDiscountsFromStorage(): VolumeDiscount[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEYS.VOLUME_DISCOUNTS);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save volume discounts to localStorage
 */
export function saveVolumeDiscountsToStorage(discounts: VolumeDiscount[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.VOLUME_DISCOUNTS, JSON.stringify(discounts));
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate price is positive number
 */
export function validatePrice(price: number | string): { valid: boolean; error?: string } {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { valid: false, error: 'Price must be a valid number' };
  }

  if (numPrice <= 0) {
    return { valid: false, error: 'Price must be greater than $0' };
  }

  if (numPrice > 10000) {
    return { valid: false, error: 'Price seems unreasonably high (max $10,000)' };
  }

  return { valid: true };
}

/**
 * Validate capacity/quantity is positive integer
 */
export function validateQuantity(quantity: number | string, fieldName: string = 'Quantity'): { valid: boolean; error?: string } {
  const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;

  if (isNaN(numQuantity)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (numQuantity <= 0) {
    return { valid: false, error: `${fieldName} must be greater than 0` };
  }

  if (!Number.isInteger(numQuantity)) {
    return { valid: false, error: `${fieldName} must be a whole number` };
  }

  return { valid: true };
}

/**
 * Validate Stripe purchase link (optional - basic URL check)
 */
export function validateStripeLinkOptional(link: string): { valid: boolean; error?: string } {
  if (!link || link.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  try {
    const url = new URL(link);
    if (!url.protocol.startsWith('http')) {
      return { valid: false, error: 'Link must be a valid URL (http or https)' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Link must be a valid URL' };
  }
}

/**
 * Validate product name
 */
export function validateProductName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }

  return { valid: true };
}

/**
 * Validate discount percentage
 */
export function validateDiscountPercent(percent: number | string): { valid: boolean; error?: string } {
  const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;

  if (isNaN(numPercent)) {
    return { valid: false, error: 'Discount must be a valid number' };
  }

  if (numPercent <= 0 || numPercent > 100) {
    return { valid: false, error: 'Discount must be between 1% and 100%' };
  }

  return { valid: true };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get active passes only
 */
export function getActivePasses(passes: PassProduct[]): PassProduct[] {
  return passes.filter(pass => pass.isActive);
}

/**
 * Get active parties only
 */
export function getActiveParties(parties: PartyProduct[]): PartyProduct[] {
  return parties.filter(party => party.isActive);
}

/**
 * Get active and available products only
 */
export function getAvailableProducts(products: FoodProduct[]): FoodProduct[] {
  return products.filter(product => product.isActive && product.available);
}

/**
 * Get volume discounts for a specific product
 */
export function getVolumeDiscountsForProduct(
  discounts: VolumeDiscount[],
  productId: string,
  productType: 'pass' | 'party' | 'product'
): VolumeDiscount[] {
  return discounts
    .filter(d => d.productId === productId && d.productType === productType)
    .sort((a, b) => a.minQuantity - b.minQuantity); // Sort by quantity ascending
}

/**
 * Calculate discounted price based on quantity
 */
export function calculateDiscountedPrice(
  basePrice: number,
  quantity: number,
  discounts: VolumeDiscount[]
): { price: number; discount: VolumeDiscount | null } {
  if (discounts.length === 0) {
    return { price: basePrice * quantity, discount: null };
  }

  // Find the highest applicable discount (highest minQuantity that quantity meets)
  const applicableDiscounts = discounts.filter(d => quantity >= d.minQuantity);

  if (applicableDiscounts.length === 0) {
    return { price: basePrice * quantity, discount: null };
  }

  const bestDiscount = applicableDiscounts.reduce((best, current) =>
    current.discountPercent > best.discountPercent ? current : best
  );

  const discountedPrice = basePrice * (1 - bestDiscount.discountPercent / 100);
  const totalPrice = discountedPrice * quantity;

  return { price: totalPrice, discount: bestDiscount };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format pass category for display
 */
export function formatPassCategory(category: PassCategory): string {
  const labels: Record<PassCategory, string> = {
    day: 'Day Pass',
    weekly: 'Weekly Pass',
    monthly: 'Monthly Pass',
  };
  return labels[category];
}

/**
 * Format product category for display
 */
export function formatProductCategory(category: ProductCategory): string {
  const labels: Record<ProductCategory, string> = {
    food: 'Food',
    beverage: 'Beverage',
    retail: 'Retail',
  };
  return labels[category];
}

/**
 * Format allergen for display
 */
export function formatAllergen(allergen: Allergen): string {
  const labels: Record<Allergen, string> = {
    peanuts: 'Peanuts',
    tree_nuts: 'Tree Nuts',
    dairy: 'Dairy',
    gluten: 'Gluten',
    eggs: 'Eggs',
    soy: 'Soy',
    fish: 'Fish',
    shellfish: 'Shellfish',
  };
  return labels[allergen];
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}




