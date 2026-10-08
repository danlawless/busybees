/**
 * Create a POS customer account.
 *
 * Creates the Supabase auth user (with its hidden password) and the `users`
 * row, then sends the welcome email without waiting. It does NOT sign anyone
 * in: /api/auth/pos-signup signs the new customer in afterwards, while the
 * member guest-pass flow keeps the POS signed in as the member.
 */

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { hiddenPasswordFor, throwawayPassword } from '@/lib/auth/hiddenPassword';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export const posCustomerSchema = z.object({
  phone: z
    .string()
    .transform((p) => p.replace(/[^\d]/g, ''))
    .refine((p) => p.length === 10, 'Invalid phone number format'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(254),
});

export type CreatePosCustomerResult =
  | { ok: true; userId: string; phone: string; user: Record<string, unknown> }
  | { ok: false; status: 400 | 409 | 500; error: string };

export async function createPosCustomer(input: unknown): Promise<CreatePosCustomerResult> {
  const parsed = posCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { phone: cleanPhone, name, email } = parsed.data;

  const supabase = createAdminClient();

  // Check if phone already exists in users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, phone, email')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (existingUser) {
    return { ok: false, status: 409, error: 'Phone number already registered' };
  }

  // A throwaway password to create the auth user; the real one is derived
  // from its id (lib/auth/hiddenPassword) and set straight after.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: throwawayPassword(),
    email_confirm: true, // Staff verified in person at POS
    user_metadata: {
      name,
      phone: cleanPhone,
      role: 'customer',
    },
  });

  if (authError) {
    logger.error({ error: authError }, 'Error creating auth user');

    // Check if it's a duplicate email error
    if (authError.message?.includes('already been registered') || authError.status === 422) {
      return {
        ok: false,
        status: 409,
        error: 'This email is already registered. You may already have an account - try logging in with your phone number.',
      };
    }

    return { ok: false, status: 500, error: 'Failed to create account. Please try again.' };
  }

  if (!authData.user) {
    return { ok: false, status: 500, error: 'Failed to create account' };
  }

  // Replace the throwaway with the account's hidden password.
  const { error: hiddenPasswordError } = await supabase.auth.admin.updateUserById(authData.user.id, {
    password: hiddenPasswordFor(authData.user.id),
  });
  if (hiddenPasswordError) {
    logger.error({ error: hiddenPasswordError }, 'Error setting hidden password');
    // Clean up the auth user, or the email stays taken by an account no one
    // can sign in to.
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { ok: false, status: 500, error: 'Failed to create account. Please try again.' };
  }

  // Create user profile record with the auth user's ID
  // No web password — customer sets one later if they want web portal access
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id, // Use the auth user's UUID
      phone: cleanPhone,
      name,
      email,
      role: 'customer',
      has_web_password: false,
      last_login: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    logger.error({ error: insertError }, 'Error creating user profile');
    // Clean up auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { ok: false, status: 500, error: 'Failed to create account' };
  }

  // Send welcome email (non-blocking - don't fail signup if email fails)
  const formattedPhone = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
  sendWelcomeEmail({ to: email, name, phone: formattedPhone })
    .then((result) => {
      if (result.success) {
        logger.info({ email, messageId: result.messageId }, '📧 Welcome email sent to new POS customer');
      } else {
        logger.error({ email, error: result.error }, '❌ Failed to send welcome email');
      }
    })
    .catch((err) => {
      logger.error({ error: err, email }, '❌ Exception sending welcome email');
    });

  return { ok: true, userId: authData.user.id, phone: cleanPhone, user: newUser };
}
