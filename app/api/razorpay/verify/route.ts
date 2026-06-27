import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      tier 
    } = await req.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials not configured.' },
        { status: 500 }
      );
    }

    // 1. Verify Razorpay Signature
    const shasum = crypto.createHmac('sha256', keySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = shasum.digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // 2. Determine Plan Details
    let plan = 'free';
    let tokensTotal = 5;

    if (tier === 'Pro Plan') {
      plan = 'pro';
      tokensTotal = 50;
    } else if (tier === 'Business Tier') {
      plan = 'enterprise';
      tokensTotal = 999999;
    }

    // 3. Update User Profile in Supabase
    if (userId) {
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: plan,
          tokens_total: tokensTotal
        })
        .eq('id', userId);

      if (updateErr) {
        throw new Error(`Failed to update user profile: ${updateErr.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment verified and subscription upgraded successfully.',
      plan,
      tokensTotal
    });
  } catch (err: any) {
    console.error('Razorpay verification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
