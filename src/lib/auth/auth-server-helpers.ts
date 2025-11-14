/**
 * Server-Side Authentication Helper Functions
 * For use in server components and API routes only
 */

import { createClient as createServerClient } from '../supabase/server';

export type UserRole = 'customer' | 'staff' | 'admin';

/**
 * Get current user with role (server-side)
 */
export async function getCurrentUserWithRole() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return userData;
}

/**
 * Check if user has role
 */
export async function hasRole(requiredRole: UserRole | UserRole[]) {
  const user = await getCurrentUserWithRole();

  if (!user) return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }

  return user.role === requiredRole;
}

