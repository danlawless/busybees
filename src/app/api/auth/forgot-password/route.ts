/**
 * Forgot Password API Route
 * Sends a password reset email with a secure token
 * Looks up user by phone number (primary identifier)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email/resend';
import crypto from 'crypto';

// Token expires after 1 hour
const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validate required fields
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user by phone number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, has_web_password')
      .eq('phone', cleanPhone)
      .single();

    // Always return success message to prevent phone enumeration attacks
    // Even if user doesn't exist, we don't reveal that
    if (userError || !user) {
      // Log for debugging but don't expose to user
      console.log('Password reset requested for non-existent phone:', cleanPhone);
      return NextResponse.json({
        message: 'If an account exists with that phone number, you will receive a password reset email.',
        success: true
      }, { status: 200 });
    }

    // Check if user has a web password set
    if (!user.has_web_password) {
      // User was created at POS and never set a web password
      // Direct them to set-password page instead
      return NextResponse.json({
        message: 'If an account exists with that phone number, you will receive a password reset email.',
        success: true,
        needsPasswordSetup: true
      }, { status: 200 });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate any existing unused tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null);

    // Store the new token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Error creating password reset token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to initiate password reset. Please try again.' },
        { status: 500 }
      );
    }

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to prevent enumeration
    }

    return NextResponse.json({
      message: 'If an account exists with that phone number, you will receive a password reset email.',
      success: true
    }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
