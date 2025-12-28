/**
 * Stripe Terminal Configuration
 * Server-side utilities for Stripe Terminal integration
 *
 * Terminal supports both:
 * - Internet-connected readers (S700) via web
 * - Bluetooth readers (M2) via React Native/mobile apps
 *
 * This module provides the server-side infrastructure that works with both.
 */

import Stripe from 'stripe';
import { getStripeClient } from './client';
import { logger } from '../logger';

/**
 * Create a connection token for Terminal SDK
 * The Terminal SDK uses connection tokens to authenticate with Stripe
 * Tokens are short-lived and must be fetched for each connection
 */
export async function createConnectionToken(locationId?: string): Promise<string> {
  const stripe = await getStripeClient();

  const params: Stripe.Terminal.ConnectionTokenCreateParams = {};

  // If a location is specified, scope the connection token to that location
  if (locationId) {
    params.location = locationId;
  }

  const connectionToken = await stripe.terminal.connectionTokens.create(params);

  logger.info({ locationId }, '🔌 Terminal connection token created');

  return connectionToken.secret;
}

/**
 * Create a Terminal location
 * Locations represent physical business locations where readers are deployed
 * Required for registering readers
 */
export async function createLocation(
  displayName: string,
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }
): Promise<Stripe.Terminal.Location> {
  const stripe = await getStripeClient();

  const location = await stripe.terminal.locations.create({
    display_name: displayName,
    address: {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country,
    },
  });

  logger.info(
    { locationId: location.id, displayName },
    '📍 Terminal location created'
  );

  return location;
}

/**
 * List all Terminal locations
 */
export async function listLocations(): Promise<Stripe.Terminal.Location[]> {
  const stripe = await getStripeClient();

  const locations = await stripe.terminal.locations.list({ limit: 100 });

  return locations.data;
}

/**
 * Get a specific Terminal location
 */
export async function getLocation(
  locationId: string
): Promise<Stripe.Terminal.Location> {
  const stripe = await getStripeClient();

  return stripe.terminal.locations.retrieve(locationId);
}

/**
 * Update a Terminal location
 */
export async function updateLocation(
  locationId: string,
  updates: {
    displayName?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }
): Promise<Stripe.Terminal.Location> {
  const stripe = await getStripeClient();

  const params: Stripe.Terminal.LocationUpdateParams = {};

  if (updates.displayName) {
    params.display_name = updates.displayName;
  }

  if (updates.address) {
    params.address = {
      line1: updates.address.line1,
      line2: updates.address.line2,
      city: updates.address.city,
      state: updates.address.state,
      postal_code: updates.address.postalCode,
      country: updates.address.country,
    };
  }

  const location = await stripe.terminal.locations.update(locationId, params);

  logger.info({ locationId }, '📍 Terminal location updated');

  return location;
}

/**
 * Delete a Terminal location
 */
export async function deleteLocation(locationId: string): Promise<void> {
  const stripe = await getStripeClient();

  await stripe.terminal.locations.del(locationId);

  logger.info({ locationId }, '📍 Terminal location deleted');
}

/**
 * Register a new reader to a location
 * Used for internet-connected readers (S700, WisePOS E)
 * Bluetooth readers (M2) are registered via the mobile SDK
 */
export async function registerReader(
  registrationCode: string,
  locationId: string,
  label?: string
): Promise<Stripe.Terminal.Reader> {
  const stripe = await getStripeClient();

  const reader = await stripe.terminal.readers.create({
    registration_code: registrationCode,
    location: locationId,
    label: label,
  });

  logger.info(
    { readerId: reader.id, label, locationId },
    '📱 Terminal reader registered'
  );

  return reader;
}

/**
 * List all readers, optionally filtered by location
 */
export async function listReaders(
  locationId?: string
): Promise<Stripe.Terminal.Reader[]> {
  const stripe = await getStripeClient();

  const params: Stripe.Terminal.ReaderListParams = {
    limit: 100,
  };

  if (locationId) {
    params.location = locationId;
  }

  const readers = await stripe.terminal.readers.list(params);

  return readers.data;
}

/**
 * Get a specific reader
 */
export async function getReader(
  readerId: string
): Promise<Stripe.Terminal.Reader> {
  const stripe = await getStripeClient();

  return stripe.terminal.readers.retrieve(readerId);
}

/**
 * Update a reader's label
 */
export async function updateReader(
  readerId: string,
  label: string
): Promise<Stripe.Terminal.Reader> {
  const stripe = await getStripeClient();

  const reader = await stripe.terminal.readers.update(readerId, { label });

  logger.info({ readerId, label }, '📱 Terminal reader updated');

  return reader;
}

/**
 * Delete a reader
 */
export async function deleteReader(readerId: string): Promise<void> {
  const stripe = await getStripeClient();

  await stripe.terminal.readers.del(readerId);

  logger.info({ readerId }, '📱 Terminal reader deleted');
}

/**
 * Create a PaymentIntent for Terminal
 * This is used for collecting payments via Terminal readers
 */
export async function createTerminalPaymentIntent(params: {
  amount: number;
  currency?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const stripe = await getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'usd',
    customer: params.customerId,
    description: params.description,
    metadata: params.metadata,
    payment_method_types: ['card_present'],
    capture_method: 'automatic',
  });

  logger.info(
    { paymentIntentId: paymentIntent.id, amount: params.amount },
    '💳 Terminal PaymentIntent created'
  );

  return paymentIntent;
}

/**
 * Process a payment using an internet-connected reader (server-driven)
 * Used with readers like S700 that support server-driven integration
 *
 * For Bluetooth readers (M2), payments are processed client-side via mobile SDK
 */
export async function processPaymentOnReader(
  readerId: string,
  paymentIntentId: string
): Promise<Stripe.Terminal.Reader> {
  const stripe = await getStripeClient();

  const reader = await stripe.terminal.readers.processPaymentIntent(readerId, {
    payment_intent: paymentIntentId,
  });

  logger.info(
    { readerId, paymentIntentId },
    '💳 Processing payment on Terminal reader'
  );

  return reader;
}

/**
 * Cancel an in-progress action on a reader
 */
export async function cancelReaderAction(
  readerId: string
): Promise<Stripe.Terminal.Reader> {
  const stripe = await getStripeClient();

  const reader = await stripe.terminal.readers.cancelAction(readerId);

  logger.info({ readerId }, '❌ Terminal reader action cancelled');

  return reader;
}

/**
 * Simulate a card present payment for testing
 * Only works in test mode
 */
export async function simulateCardPresent(
  readerId: string,
  cardNumber?: string
): Promise<Stripe.Terminal.Reader> {
  const stripe = await getStripeClient();

  // Default to Visa test card if no card specified
  const testCard = cardNumber || '4242424242424242';

  const reader = await stripe.testHelpers.terminal.readers.presentPaymentMethod(
    readerId,
    {
      card_present: {
        number: testCard,
      },
    }
  );

  logger.info({ readerId }, '🧪 Simulated card present on reader');

  return reader;
}

/**
 * Capture a PaymentIntent that was previously authorized
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amountToCapture?: number
): Promise<Stripe.PaymentIntent> {
  const stripe = await getStripeClient();

  const params: Stripe.PaymentIntentCaptureParams = {};
  if (amountToCapture) {
    params.amount_to_capture = amountToCapture;
  }

  const paymentIntent = await stripe.paymentIntents.capture(
    paymentIntentId,
    params
  );

  logger.info({ paymentIntentId }, '✅ PaymentIntent captured');

  return paymentIntent;
}

/**
 * Cancel a PaymentIntent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = await getStripeClient();

  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

  logger.info({ paymentIntentId }, '❌ PaymentIntent cancelled');

  return paymentIntent;
}

