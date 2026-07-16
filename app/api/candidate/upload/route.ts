import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData().catch(() => null);
    if (!data) {
      return NextResponse.json({ error: 'Multipart form data is required.' }, { status: 400 });
    }

    const sessionId = data.get('sessionId') as string;
    const bucket = data.get('bucket') as string;
    const filename = data.get('filename') as string;
    const file = data.get('file') as File | null;

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }

    if (!bucket || !['proctoring-snapshots', 'screen-recordings'].includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket specified.' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Verify session is active
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active. Uploads are closed.' }, { status: 400 });
    }

    // Enforce size limits and MIME types
    if (bucket === 'proctoring-snapshots') {
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Snapshot size exceeds 2MB limit.' }, { status: 400 });
      }
      if (file.type !== 'image/jpeg' && !filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
        return NextResponse.json({ error: 'Only JPEG images are allowed.' }, { status: 400 });
      }
    } else {
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'Screen recording chunk size exceeds 50MB limit.' }, { status: 400 });
      }
      if (file.type !== 'video/webm' && !filename.toLowerCase().endsWith('.webm')) {
        return NextResponse.json({ error: 'Only WebM video recordings are allowed.' }, { status: 400 });
      }
    }

    const path = `${sessionId}/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadErr) {
      console.error(`Failed to upload to ${bucket}:`, uploadErr);
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Return the storage path
    return NextResponse.json({
      success: true,
      path: `${bucket}/${path}`,
      name: filename
    });

  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
