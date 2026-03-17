/**
 * Admin Movie Poster Upload API
 * POST /api/admin/after-dark-movies/upload - Upload poster to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/validations/event';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff/admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Upload to Supabase Storage using admin client
    const adminSupabase = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await adminSupabase.storage
      .from('movie-posters')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      logger.error({ error }, 'Failed to upload movie poster');
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage
      .from('movie-posters')
      .getPublicUrl(data.path);

    logger.info(
      { filename, size: file.size },
      'Uploaded movie poster'
    );

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    logger.error({ error }, 'Unexpected error uploading movie poster');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
