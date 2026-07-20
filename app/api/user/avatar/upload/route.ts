import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import { requireAuth } from '@/app/lib/auth-middleware';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { logSecurityEvent } from '@/app/lib/security';

function sanitizeFilename(filename: string): string {
  // Remove path traversal sequences
  let cleaned = filename.replace(/\.\.+\//g, '').replace(/\.\.+\\/g, '');
  // Extract base name
  cleaned = path.basename(cleaned);
  // Remove special characters except alphanumeric, dot, hyphen, underscore
  cleaned = cleaned.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
  return cleaned;
}

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    // 1. Authenticate user
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    // 2. Parse form data
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 3. Enforce 2MB size limit server-side
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      await logSecurityEvent('UPLOAD_REJECTED_SIZE', ip, authResult.id, {
        fileName: file.name,
        fileSize: file.size,
        maxSize: maxSizeBytes,
      }, 'warning');
      return NextResponse.json({ error: 'File size exceeds maximum limit of 2MB' }, { status: 400 });
    }

    // 4. Read file content to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Detect and validate Magic Bytes & Extensions
    const hex = buffer.toString('hex', 0, 12).toLowerCase();
    
    let isValid = false;

    // Check PNG: starts with 89 50 4E 47
    if (hex.startsWith('89504e47')) {
      isValid = true;
    }
    // Check JPEG: starts with FF D8 FF
    else if (hex.startsWith('ffd8ff')) {
      isValid = true;
    }
    // Check WebP: starts with RIFF (52494646) and WEBP (57454250) at position 8
    else if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') {
      isValid = true;
    }

    // Check if filename extension matches claimed type
    const claimedExtension = path.extname(file.name).toLowerCase().replace('.', '');
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedExtensions.includes(claimedExtension)) {
      await logSecurityEvent('UPLOAD_REJECTED_INVALID_EXTENSION', ip, authResult.id, {
        fileName: file.name,
        claimedExtension,
      }, 'warning');
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed' }, { status: 400 });
    }

    if (!isValid) {
      await logSecurityEvent('UPLOAD_REJECTED_MAGIC_BYTES_MISMATCH', ip, authResult.id, {
        fileName: file.name,
        hexSignature: hex,
      }, 'warning');
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // 6. Scan content for embedded scripts or executable code signatures
    const contentStr = buffer.toString('utf-8');
    const hasScriptSignatures = 
      /<script/i.test(contentStr) || 
      /<\?php/i.test(contentStr) || 
      /javascript:/i.test(contentStr) ||
      /onload=/i.test(contentStr) ||
      /onerror=/i.test(contentStr);

    if (hasScriptSignatures) {
      await logSecurityEvent('UPLOAD_REJECTED_MALICIOUS_CONTENT', ip, authResult.id, {
        fileName: file.name,
        reason: 'Detected potential embedded scripts'
      }, 'critical');
      return NextResponse.json({ error: 'File rejected: malicious content detected' }, { status: 400 });
    }

    // 7. Process image using sharp: resize to max 200x200 and convert to WebP (quality 80)
    const processedBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const sanitizedName = sanitizeFilename(file.name);
    const safeFilename = `${authResult.id}-avatar.webp`;

    // 8. Upload compressed WebP to Supabase Storage 'avatars' bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(safeFilename, processedBuffer, {
        contentType: 'image/webp',
        cacheControl: '86400',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to save avatar image' }, { status: 500 });
    }

    // 9. Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(safeFilename);

    // 10. Update profiles table directly
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', authResult.id);

    await logSecurityEvent('AVATAR_UPLOADED', ip, authResult.id, {
      fileName: sanitizedName,
      safeFilename,
      publicUrl,
      processedSize: processedBuffer.length,
    }, 'info');

    return NextResponse.json({
      success: true,
      publicUrl,
    });

  } catch (err: any) {
    console.error('Avatar upload catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
