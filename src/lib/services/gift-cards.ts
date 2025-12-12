/**
 * Gift Card Service
 * Handles gift card creation, validation, and redemption
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { randomBytes } from 'crypto';

// Types
export interface GiftCardDenomination {
  id: string;
  amount: number;
  is_active: boolean;
  sort_order: number;
}

export interface GiftCard {
  id: string;
  code: string;
  amount: number;
  remaining_amount: number;
  purchaser_email: string;
  purchaser_name: string;
  recipient_email: string;
  recipient_name: string;
  personal_message: string | null;
  delivery_method: 'email_recipient' | 'email_self';
  email_sent_at: string | null;
  status: 'pending' | 'sent' | 'redeemed' | 'partially_redeemed';
  redeemed_by: string | null;
  redeemed_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGiftCardData {
  amount: number;
  purchaser_email: string;
  purchaser_name: string;
  recipient_email: string;
  recipient_name: string;
  personal_message?: string;
  delivery_method: 'email_recipient' | 'email_self';
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
}

export interface RedeemGiftCardResult {
  success: boolean;
  gift_card?: GiftCard;
  amount_credited?: number;
  new_balance?: number;
  error?: string;
}

/**
 * Generate a unique gift card code
 * Format: BBGC-XXXX-XXXX-XXXX (BB = Busy Bees, GC = Gift Card)
 */
export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  const segments: string[] = [];

  for (let i = 0; i < 3; i++) {
    let segment = '';
    const bytes = randomBytes(4);
    for (let j = 0; j < 4; j++) {
      segment += chars[bytes[j] % chars.length];
    }
    segments.push(segment);
  }

  return `BBGC-${segments.join('-')}`;
}

/**
 * Validate gift card code format
 */
export function isValidGiftCardCodeFormat(code: string): boolean {
  const pattern = /^BBGC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Fetch all active gift card denominations
 */
export async function getGiftCardDenominations(): Promise<GiftCardDenomination[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('gift_card_denominations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to fetch gift card denominations');
    throw new Error('Failed to fetch gift card denominations');
  }

  return data || [];
}

/**
 * Fetch all gift card denominations (including inactive - for admin)
 */
export async function getAllGiftCardDenominations(): Promise<GiftCardDenomination[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('gift_card_denominations')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to fetch all gift card denominations');
    throw new Error('Failed to fetch gift card denominations');
  }

  return data || [];
}

/**
 * Create or update a gift card denomination
 */
export async function upsertGiftCardDenomination(
  data: { id?: string; amount: number; is_active?: boolean; sort_order?: number }
): Promise<GiftCardDenomination> {
  const supabase = createAdminClient();

  if (data.id) {
    // Update existing
    const { data: updated, error } = await supabase
      .from('gift_card_denominations')
      .update({
        amount: data.amount,
        is_active: data.is_active,
        sort_order: data.sort_order,
      })
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      logger.error({ error, id: data.id }, 'Failed to update gift card denomination');
      throw new Error('Failed to update gift card denomination');
    }

    return updated;
  } else {
    // Create new
    const { data: created, error } = await supabase
      .from('gift_card_denominations')
      .insert({
        amount: data.amount,
        is_active: data.is_active ?? true,
        sort_order: data.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create gift card denomination');
      throw new Error('Failed to create gift card denomination');
    }

    return created;
  }
}

/**
 * Delete a gift card denomination
 */
export async function deleteGiftCardDenomination(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('gift_card_denominations')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to delete gift card denomination');
    throw new Error('Failed to delete gift card denomination');
  }
}

/**
 * Create a new gift card
 */
export async function createGiftCard(data: CreateGiftCardData): Promise<GiftCard> {
  const supabase = createAdminClient();

  // Generate unique code with retry logic
  let code: string;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    code = generateGiftCardCode();

    // Check if code already exists
    const { data: existing } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('code', code)
      .single();

    if (!existing) break;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    logger.error({}, 'Failed to generate unique gift card code after max attempts');
    throw new Error('Failed to generate unique gift card code');
  }

  const { data: giftCard, error } = await supabase
    .from('gift_cards')
    .insert({
      code: code!,
      amount: data.amount,
      remaining_amount: data.amount,
      purchaser_email: data.purchaser_email,
      purchaser_name: data.purchaser_name,
      recipient_email: data.recipient_email,
      recipient_name: data.recipient_name,
      personal_message: data.personal_message || null,
      delivery_method: data.delivery_method,
      status: 'pending',
      stripe_checkout_session_id: data.stripe_checkout_session_id || null,
      stripe_payment_intent_id: data.stripe_payment_intent_id || null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, 'Failed to create gift card');
    Sentry.captureException(error, {
      tags: { service: 'gift-cards', action: 'create' },
      extra: { purchaser_email: data.purchaser_email, amount: data.amount },
    });
    throw new Error('Failed to create gift card');
  }

  logger.info(
    { giftCardId: giftCard.id, code: giftCard.code, amount: data.amount },
    '🎁 Gift card created'
  );

  return giftCard;
}

/**
 * Get a gift card by its code
 */
export async function getGiftCardByCode(code: string): Promise<GiftCard | null> {
  const supabase = createAdminClient();

  const normalizedCode = code.toUpperCase().trim();

  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - code not found
      return null;
    }
    logger.error({ error, code: normalizedCode }, 'Failed to fetch gift card by code');
    throw new Error('Failed to fetch gift card');
  }

  return data;
}

/**
 * Get a gift card by ID
 */
export async function getGiftCardById(id: string): Promise<GiftCard | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error({ error, id }, 'Failed to fetch gift card by ID');
    throw new Error('Failed to fetch gift card');
  }

  return data;
}

/**
 * Mark a gift card as sent (email delivered)
 */
export async function markGiftCardAsSent(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('gift_cards')
    .update({
      status: 'sent',
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to mark gift card as sent');
    throw new Error('Failed to update gift card status');
  }

  logger.info({ giftCardId: id }, '📧 Gift card marked as sent');
}

/**
 * Validate a gift card for redemption
 */
export async function validateGiftCard(code: string): Promise<{
  valid: boolean;
  gift_card?: GiftCard;
  error?: string;
}> {
  // Check format
  if (!isValidGiftCardCodeFormat(code)) {
    return { valid: false, error: 'Invalid gift card code format' };
  }

  // Fetch gift card
  const giftCard = await getGiftCardByCode(code);

  if (!giftCard) {
    return { valid: false, error: 'Gift card not found' };
  }

  // Check status
  if (giftCard.status === 'redeemed') {
    return { valid: false, error: 'This gift card has already been fully redeemed' };
  }

  // Check remaining balance
  if (giftCard.remaining_amount <= 0) {
    return { valid: false, error: 'This gift card has no remaining balance' };
  }

  return { valid: true, gift_card: giftCard };
}

/**
 * Redeem a gift card - add its value to user's account balance
 */
export async function redeemGiftCard(
  code: string,
  userId: string
): Promise<RedeemGiftCardResult> {
  const supabase = createAdminClient();

  // Validate the gift card
  const validation = await validateGiftCard(code);
  if (!validation.valid || !validation.gift_card) {
    return { success: false, error: validation.error };
  }

  const giftCard = validation.gift_card;

  // Get user's current balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('gift_card_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    logger.error({ error: userError, userId }, 'Failed to fetch user for gift card redemption');
    return { success: false, error: 'User not found' };
  }

  const currentBalance = user.gift_card_balance || 0;
  const amountToCredit = giftCard.remaining_amount;
  const newBalance = currentBalance + amountToCredit;

  // Start a transaction-like operation
  // Update user's balance
  const { error: balanceError } = await supabase
    .from('users')
    .update({ gift_card_balance: newBalance })
    .eq('id', userId);

  if (balanceError) {
    logger.error({ error: balanceError, userId }, 'Failed to update user balance');
    Sentry.captureException(balanceError, {
      tags: { service: 'gift-cards', action: 'redeem' },
      extra: { userId, giftCardId: giftCard.id },
    });
    return { success: false, error: 'Failed to update account balance' };
  }

  // Update gift card status
  const { error: giftCardError } = await supabase
    .from('gift_cards')
    .update({
      remaining_amount: 0,
      status: 'redeemed',
      redeemed_by: userId,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', giftCard.id);

  if (giftCardError) {
    // Attempt to rollback balance update
    await supabase
      .from('users')
      .update({ gift_card_balance: currentBalance })
      .eq('id', userId);

    logger.error({ error: giftCardError, giftCardId: giftCard.id }, 'Failed to update gift card status');
    return { success: false, error: 'Failed to redeem gift card' };
  }

  // Create redemption record
  await supabase.from('gift_card_redemptions').insert({
    gift_card_id: giftCard.id,
    user_id: userId,
    amount: amountToCredit,
    balance_before: currentBalance,
    balance_after: newBalance,
    notes: 'Full redemption',
  });

  logger.info(
    {
      giftCardId: giftCard.id,
      userId,
      amount: amountToCredit,
      newBalance,
    },
    '🎉 Gift card redeemed successfully'
  );

  return {
    success: true,
    gift_card: { ...giftCard, remaining_amount: 0, status: 'redeemed' as const },
    amount_credited: amountToCredit,
    new_balance: newBalance,
  };
}

/**
 * Apply gift card balance to a purchase
 * Returns the amount to charge to card (after balance applied)
 */
export async function applyGiftCardBalance(
  userId: string,
  purchaseAmount: number,
  purchaseId?: string
): Promise<{
  balance_used: number;
  remaining_to_charge: number;
  new_balance: number;
}> {
  const supabase = createAdminClient();

  // Get user's current balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('gift_card_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    logger.error({ error: userError, userId }, 'Failed to fetch user for balance application');
    throw new Error('User not found');
  }

  const currentBalance = user.gift_card_balance || 0;

  if (currentBalance <= 0) {
    return {
      balance_used: 0,
      remaining_to_charge: purchaseAmount,
      new_balance: 0,
    };
  }

  // Calculate how much balance to use
  const balanceToUse = Math.min(currentBalance, purchaseAmount);
  const remainingToCharge = purchaseAmount - balanceToUse;
  const newBalance = currentBalance - balanceToUse;

  // Update user's balance
  const { error: updateError } = await supabase
    .from('users')
    .update({ gift_card_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    logger.error({ error: updateError, userId }, 'Failed to deduct gift card balance');
    throw new Error('Failed to apply gift card balance');
  }

  logger.info(
    {
      userId,
      balanceUsed: balanceToUse,
      remainingToCharge,
      newBalance,
      purchaseId,
    },
    '💳 Gift card balance applied to purchase'
  );

  return {
    balance_used: balanceToUse,
    remaining_to_charge: remainingToCharge,
    new_balance: newBalance,
  };
}

/**
 * Get user's gift card balance
 */
export async function getUserGiftCardBalance(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('gift_card_balance')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error({ error, userId }, 'Failed to fetch user gift card balance');
    return 0;
  }

  return data?.gift_card_balance || 0;
}

/**
 * Get all gift cards (for admin)
 */
export async function getAllGiftCards(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: GiftCard[]; count: number }> {
  const supabase = createAdminClient();

  let query = supabase
    .from('gift_cards')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, 'Failed to fetch all gift cards');
    throw new Error('Failed to fetch gift cards');
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get user's redeemed gift cards
 */
export async function getUserRedeemedGiftCards(userId: string): Promise<GiftCard[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('redeemed_by', userId)
    .order('redeemed_at', { ascending: false });

  if (error) {
    logger.error({ error, userId }, 'Failed to fetch user redeemed gift cards');
    throw new Error('Failed to fetch gift cards');
  }

  return data || [];
}

/**
 * Get user's purchased gift cards
 */
export async function getUserPurchasedGiftCards(email: string): Promise<GiftCard[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('purchaser_email', email)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error, email }, 'Failed to fetch user purchased gift cards');
    throw new Error('Failed to fetch gift cards');
  }

  return data || [];
}

