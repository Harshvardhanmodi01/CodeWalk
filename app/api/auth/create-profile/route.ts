import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email } = await req.json();
    
    const { error } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, name, email });
    
    if (error) {
      console.error('Profile insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Create profile catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}