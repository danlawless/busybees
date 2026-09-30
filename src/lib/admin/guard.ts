import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { roleToLevel, type Level } from './nav';

/** Server only: the signed-in user's admin level from users.role, or null. */
export const getAdminLevel = cache(async (): Promise<Level | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return roleToLevel(data?.role);
});
