/**
 * Contact Service
 * Handles contact form submission storage and retrieval
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

// Database types
type ContactSubmission = Database['public']['Tables']['contact_submissions']['Row'];
type ContactSubmissionInsert = Database['public']['Tables']['contact_submissions']['Insert'];

/**
 * Create a basic Supabase client for anonymous operations
 * Uses the anon key which works with RLS policies for public inserts
 */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface ContactSubmissionData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  userType: string;
  message: string;
  emailSent: boolean;
  emailError: string | null;
  submittedAt: string;
  createdAt: string;
}

interface SaveContactOptions {
  name: string;
  email: string;
  phone?: string;
  userType: string;
  message: string;
}

interface SaveContactResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

/**
 * Convert database row to frontend format
 */
function toContactData(row: ContactSubmission): ContactSubmissionData {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    userType: row.user_type,
    message: row.message,
    emailSent: row.email_sent,
    emailError: row.email_error,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
  };
}

/**
 * Save a contact form submission to the database
 * This is the primary storage - email sending is secondary
 *
 * Uses a two-tier approach:
 * 1. First tries the admin client (service role key) which bypasses RLS
 * 2. Falls back to anon client if service role key isn't configured
 */
export async function saveContactSubmission(options: SaveContactOptions): Promise<SaveContactResult> {
  const { name, email, phone, userType, message } = options;
  const normalizedEmail = email.toLowerCase().trim();

  const insertData: ContactSubmissionInsert = {
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    user_type: userType,
    message: message.trim(),
    email_sent: false,
  };

  try {
    // Try admin client first (bypasses RLS, preferred method)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminResult = await saveWithAdminClient(insertData, normalizedEmail);
      if (adminResult.success) {
        return adminResult;
      }
      // If admin client failed, log and try fallback
      logger.warn(
        { error: adminResult.error, email: normalizedEmail },
        'Admin client failed, attempting fallback to anon client'
      );
    } else {
      logger.info(
        { email: normalizedEmail },
        'SUPABASE_SERVICE_ROLE_KEY not configured, using anon client'
      );
    }

    // Fallback: Try anon client (uses RLS policy "Anyone can submit contact form")
    const anonResult = await saveWithAnonClient(insertData, normalizedEmail);
    return anonResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error, errorMessage, email: normalizedEmail },
      'Contact submission save exception'
    );
    return {
      success: false,
      error: `Exception: ${errorMessage}`,
    };
  }
}

/**
 * Save contact submission using the admin client (service role key)
 */
async function saveWithAdminClient(
  insertData: ContactSubmissionInsert,
  normalizedEmail: string
): Promise<SaveContactResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('contact_submissions')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      logger.error(
        {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          email: normalizedEmail,
          clientType: 'admin'
        },
        'Failed to save contact submission with admin client'
      );

      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Database table not found - migration may need to be applied',
        };
      }

      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    logger.info(
      { submissionId: data.id, email: normalizedEmail, clientType: 'admin' },
      '📝 Contact form submission saved (admin client)'
    );

    return {
      success: true,
      submissionId: data.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Admin client exception: ${errorMessage}`,
    };
  }
}

/**
 * Save contact submission using the anon client (relies on RLS policy)
 */
async function saveWithAnonClient(
  insertData: ContactSubmissionInsert,
  normalizedEmail: string
): Promise<SaveContactResult> {
  const supabase = createAnonClient();

  if (!supabase) {
    logger.error(
      { email: normalizedEmail },
      'Neither admin nor anon Supabase client could be created - check environment variables'
    );
    return {
      success: false,
      error: 'Database configuration error - missing Supabase credentials',
    };
  }

  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      logger.error(
        {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          email: normalizedEmail,
          clientType: 'anon'
        },
        'Failed to save contact submission with anon client'
      );

      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Database table not found - migration may need to be applied',
        };
      }

      if (error.code === '42501') {
        return {
          success: false,
          error: 'Permission denied - RLS policy may need to be updated. Please run migration 015.',
        };
      }

      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    logger.info(
      { submissionId: data.id, email: normalizedEmail, clientType: 'anon' },
      '📝 Contact form submission saved (anon client)'
    );

    return {
      success: true,
      submissionId: data.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Anon client exception: ${errorMessage}`,
    };
  }
}

/**
 * Update email status for a contact submission
 */
export async function updateEmailStatus(
  submissionId: string,
  emailSent: boolean,
  emailError?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('contact_submissions')
      .update({
        email_sent: emailSent,
        email_error: emailError || null,
      })
      .eq('id', submissionId);

    if (error) {
      logger.error({ error, submissionId }, 'Failed to update email status');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, submissionId }, 'Email status update error');
    return false;
  }
}

// ============================================
// Admin CRUD functions for contact management
// ============================================

/**
 * Get all contact submissions
 */
export async function getAllContactSubmissions(): Promise<ContactSubmissionData[]> {
  const supabase = await createClient();

  // Paginated to bypass Supabase 1000-row cap
  const PAGE_SIZE = 1000;
  const all: ContactSubmissionData[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const rows = data || [];
    all.push(...rows.map(toContactData));
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Get contact submissions that failed to send email
 */
export async function getFailedEmailSubmissions(): Promise<ContactSubmissionData[]> {
  const supabase = await createClient();

  // Paginated to bypass Supabase 1000-row cap
  const PAGE_SIZE = 1000;
  const all: ContactSubmissionData[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('email_sent', false)
      .order('submitted_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const rows = data || [];
    all.push(...rows.map(toContactData));
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Get a single contact submission by ID
 */
export async function getContactSubmission(id: string): Promise<ContactSubmissionData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return toContactData(data);
}

/**
 * Delete a contact submission (admin only)
 */
export async function deleteContactSubmission(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('contact_submissions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get contact submission statistics
 */
export async function getContactStats(): Promise<{
  total: number;
  emailSent: number;
  emailFailed: number;
}> {
  const supabase = await createClient();

  const { count: total, error: totalError } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true });

  if (totalError) throw totalError;

  const { count: emailSent, error: sentError } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('email_sent', true);

  if (sentError) throw sentError;

  return {
    total: total || 0,
    emailSent: emailSent || 0,
    emailFailed: (total || 0) - (emailSent || 0),
  };
}
