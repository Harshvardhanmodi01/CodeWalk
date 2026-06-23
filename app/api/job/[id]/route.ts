import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;   // ✅ await the Promise
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('jobs')
    .select('status, result, error')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    result: data.status === 'completed' ? data.result : null,
    error: data.error,
  });
}