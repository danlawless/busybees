/**
 * Supabase Browser Client
 * Used in client components for browser-side operations
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See https://supabase.com/dashboard/project/_/settings/api'
  );
}

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl ?? '',
    supabaseAnonKey ?? ''
  );
}

