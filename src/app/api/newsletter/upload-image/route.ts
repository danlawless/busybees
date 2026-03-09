/**
 * API Route: Newsletter Image Upload
 * POST - Upload an image to Supabase Storage for use in newsletters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `uploads/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('newsletter-images')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error({ error: uploadError }, 'Failed to upload newsletter image');
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('newsletter-images')
      .getPublicUrl(filePath);

    logger.info({ fileName, size: file.size }, 'Newsletter image uploaded');

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error) {
    logger.error({ error }, 'Newsletter image upload error');
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
