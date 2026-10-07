/**
 * Age Utility Functions
 * Handles age calculation and age-based product validation for passes and punch cards
 */

import { parseDateString } from '@/lib/utils';

// Age group types
export type AgeGroup = 'infant' | 'toddler';

// Age threshold: children under 2 are infants, 2 and over are toddlers
export const TODDLER_AGE_THRESHOLD = 1;

/**
 * Calculate age from birthdate
 * @param birthdate - ISO date string (YYYY-MM-DD)
 * @returns Age in years
 */
export function calculateAge(birthdate: string): number {
  const today = new Date();
  // Use parseDateString to handle YYYY-MM-DD format correctly in all timezones
  const birth = parseDateString(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get the age group for a given age
 * @param age - Age in years
 * @returns 'infant' if under 2, 'toddler' if 2 or over
 */
export function getAgeGroup(age: number): AgeGroup {
  return age < TODDLER_AGE_THRESHOLD ? 'infant' : 'toddler';
}

/**
 * Get the age group for a child based on birthdate
 * @param birthdate - ISO date string (YYYY-MM-DD)
 * @returns 'infant' if under 2, 'toddler' if 2 or over
 */
export function getAgeGroupFromBirthdate(birthdate: string): AgeGroup {
  return getAgeGroup(calculateAge(birthdate));
}

/**
 * Extract the required age group from a product name.
 * Looks for "Infant" (under 2) or "Toddler" / "Child" (2+) in the name.
 * "Child" is treated as a synonym for "Toddler" — same convention the
 * combo-pass logic in hasAgeRestriction already uses.
 * @param productName - The product name to check
 * @returns 'infant', 'toddler', or null if no age restriction
 */
export function getProductAgeGroup(productName: string): AgeGroup | null {
  const lowerName = productName.toLowerCase();

  if (lowerName.includes('infant')) {
    return 'infant';
  }

  if (lowerName.includes('toddler') || lowerName.includes('child')) {
    return 'toddler';
  }

  return null;
}

/**
 * Check if a product has age restrictions
 * @param productName - The product name to check
 * @returns true if the product has an age restriction
 */
export function hasAgeRestriction(productName: string): boolean {
  // Combo passes (e.g. "Child + Infant Discount") handle age validation
  // via their own selection flow — skip the standard age gate
  const lowerName = productName.toLowerCase();
  if ((lowerName.includes('child') || lowerName.includes('toddler')) && lowerName.includes('infant')) {
    return false;
  }
  return getProductAgeGroup(productName) !== null;
}

/**
 * An age-restricted pass may not be sold without naming the child it is for.
 *
 * The age check runs against a child's birthdate, so with no child attached it
 * simply does not run — which is how a "Day Pass - Child (2+)" came to be sold
 * on an account whose only child was one year old, twice, at $10 over the
 * infant rate. Requiring the child is what makes the age gate reachable.
 *
 * Products with no age in their name are unaffected: a flat "Day Pass" or the
 * account-wide "Punch Card" carries no age requirement, so it needs no child.
 */
export function requiresChildSelection(productName: string): boolean {
  return hasAgeRestriction(productName);
}

/** Shown to whoever is at the till, so it says what to do rather than what failed. */
export const CHILD_REQUIRED_ERROR =
  'Choose which child this pass is for. This pass has an age requirement, so it cannot be sold without one.';

/**
 * Validate if a child's age is appropriate for a product
 * @param childAge - Age of the child in years
 * @param productName - Name of the product being purchased
 * @returns Object with valid status and error message if invalid
 */
export function validateAgeForProduct(
  childAge: number,
  productName: string
): { valid: boolean; error?: string } {
  const productAgeGroup = getProductAgeGroup(productName);

  // No age restriction on this product
  if (productAgeGroup === null) {
    return { valid: true };
  }

  const childAgeGroup = getAgeGroup(childAge);

  if (productAgeGroup === childAgeGroup) {
    return { valid: true };
  }

  // Age mismatch - provide helpful error message
  if (productAgeGroup === 'infant' && childAgeGroup === 'toddler') {
    return {
      valid: false,
      error: `This infant pass is only for children under ${TODDLER_AGE_THRESHOLD}. This child is ${childAge} years old. Please select a toddler pass instead.`,
    };
  }

  if (productAgeGroup === 'toddler' && childAgeGroup === 'infant') {
    return {
      valid: false,
      error: `This toddler pass is for children ${TODDLER_AGE_THRESHOLD} and over. This child is ${childAge} year${childAge === 1 ? '' : 's'} old. Please select an infant pass instead.`,
    };
  }

  return { valid: true };
}

/**
 * Validate if a child's birthdate allows them to purchase a product
 * @param childBirthdate - ISO date string (YYYY-MM-DD)
 * @param productName - Name of the product being purchased
 * @returns Object with valid status and error message if invalid
 */
export function validateBirthdateForProduct(
  childBirthdate: string,
  productName: string
): { valid: boolean; error?: string; childAge?: number } {
  const childAge = calculateAge(childBirthdate);
  const validation = validateAgeForProduct(childAge, productName);

  return {
    ...validation,
    childAge,
  };
}

/**
 * Get a human-readable label for an age group
 * @param ageGroup - The age group
 * @returns Human-readable label
 */
export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  return ageGroup === 'infant' ? 'Under 2 years' : '2 years and over';
}

/**
 * Get the age range description for a product
 * @param productName - Name of the product
 * @returns Human-readable age range or null if no restriction
 */
export function getProductAgeRange(productName: string): string | null {
  const ageGroup = getProductAgeGroup(productName);

  if (ageGroup === null) {
    return null;
  }

  return getAgeGroupLabel(ageGroup);
}
