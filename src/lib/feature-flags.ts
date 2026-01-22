/**
 * Feature Flags
 *
 * Centralized feature toggles for the application.
 * These flags control the availability of various features.
 */

/**
 * Controls whether purchasing, booking, and authentication features are enabled.
 * Set to false to temporarily disable all frontend purchasing functionality
 * while backend issues are being resolved.
 *
 * When disabled:
 * - All purchase/buy buttons show "Coming Soon" and are disabled
 * - Party booking is disabled
 * - Gift card purchase/redemption is disabled
 * - Login/Signup/Pre-register is hidden
 *
 * To re-enable, simply change this to `true`.
 */
export const PURCHASING_ENABLED = false;

/**
 * Controls whether the My Account / Login link is shown in the header.
 * This is separate from purchasing so users can still access their account
 * even when purchasing is disabled.
 */
export const ACCOUNT_ACCESS_ENABLED = true;

