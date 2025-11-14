/**
 * Client-Side Authentication Helper Functions
 * For use in client components only
 */

import { createClient } from '../supabase/client';

export type UserRole = 'customer' | 'staff' | 'admin';

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, userData: {
  name: string;
  phone: string;
  role?: UserRole;
}) {
  const supabase = createClient();

  // Create auth user with email verification
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/customer/dashboard`,
      data: {
        name: userData.name,
        phone: userData.phone,
        role: userData.role || 'customer',
      },
    },
  });

  if (error) throw error;

  // Create user profile in public.users table
  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role || 'customer',
      });

    if (profileError) throw profileError;
  }

  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

/**
 * Sign in with phone (OTP)
 */
export async function signInWithPhone(phone: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (error) throw error;

  return data;
}

/**
 * Verify phone OTP
 */
export async function verifyPhoneOTP(phone: string, token: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error) throw error;

  return data;
}

/**
 * Sign in with magic link
 */
export async function signInWithMagicLink(email: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;

  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

/**
 * Get current user (client-side)
 */
export async function getCurrentUser() {
  const supabase = createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

/**
 * Reset password request
 */
export async function resetPassword(email: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;

  return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;

  return data;
}

