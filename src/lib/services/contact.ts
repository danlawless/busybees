/**
 * Contact Service
 * Handles contact form submission storage and retrieval
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

// Database types
type ContactSubmission = Database['public']['Tables']['contact_submissions']['Row'];
type ContactSubmissionInsert = Database['public']['Tables']['contact_submissions']['Insert'];

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
 */
export async function saveContactSubmission(options: SaveContactOptions): Promise<SaveContactResult> {
  const { name, email, phone, userType, message } = options;
  const normalizedEmail = email.toLowerCase().trim();

  const supabase = createAdminClient();

  try {
    const insertData: ContactSubmissionInsert = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      user_type: userType,
      message: message.trim(),
      email_sent: false,
    };

    const { data, error } = await supabase
      .from('contact_submissions')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      logger.error({ error, email: normalizedEmail }, 'Failed to save contact submission');
      return {
        success: false,
        error: 'Failed to save submission',
      };
    }

    logger.info(
      { submissionId: data.id, email: normalizedEmail, userType },
      '📝 Contact form submission saved'
    );

    return {
      success: true,
      submissionId: data.id,
    };
  } catch (error) {
    logger.error({ error, email: normalizedEmail }, 'Contact submission save error');
    return {
      success: false,
      error: 'An error occurred while saving submission',
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
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toContactData);
}

/**
 * Get contact submissions that failed to send email
 */
export async function getFailedEmailSubmissions(): Promise<ContactSubmissionData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .eq('email_sent', false)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toContactData);
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
