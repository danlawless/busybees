/**
 * PIN Authentication Utilities
 * Hashing and verification for 4-digit PIN codes used in POS
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a 4-digit PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  // Validate PIN format
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  return await bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against a hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  // Validate PIN format
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return false;
  }

  return await bcrypt.compare(pin, hash);
}

/**
 * Validate PIN format (client-side check before hashing)
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'PIN is required' };
  }

  if (pin.length !== 4) {
    return { valid: false, error: 'PIN must be exactly 4 digits' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }

  return { valid: true };
}

