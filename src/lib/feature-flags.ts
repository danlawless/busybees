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
 * Controls whether users can access My Account pages (login, signup, dashboard).
 * When false, these pages show "Coming Soon" messages.
 */
export const ACCOUNT_ACCESS_ENABLED = true;

/**
 * Controls whether the My Account / Login link is shown in the header navigation.
 * This is separate from ACCOUNT_ACCESS_ENABLED so you can enable access
 * (for testing via direct URL) without showing it in the navigation yet.
 */
export const SHOW_ACCOUNT_IN_HEADER = false;

