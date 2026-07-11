import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { requireAuth } from '@/app/lib/auth-middleware';
import { sanitizeString } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      tier 
    } = body;

    const sanitizedOrderId = sanitizeString(razorpay_order_id || '');
    const sanitizedPaymentId = sanitizeString(razorpay_payment_id || '');
    const sanitizedSignature = sanitizeString(razorpay_signature || '');
    const sanitizedTier = sanitizeString(tier || '');

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials not configured.' },
        { status: 500 }
      );
    }

    // 1. Verify Razorpay Signature
    const shasum = crypto.createHmac('sha256', keySecret);
    shasum.update(`${sanitizedOrderId}|${sanitizedPaymentId}`);
    const expectedSignature = shasum.digest('hex');

    const isAuthentic = expectedSignature === sanitizedSignature;

    if (!isAuthentic) {
      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // 2. Determine Plan Details
    let plan = 'free';
    let tokensTotal = 5;

    if (sanitizedTier === 'Pro Plan') {
      plan = 'pro';
      tokensTotal = 50;
    } else if (sanitizedTier === 'Business Tier') {
      plan = 'enterprise';
      tokensTotal = 999999;
    }

    // 3. Update User Profile in Supabase (securely uses authenticated userId)
    const userId = authResult.id;
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: plan,
        tokens_total: tokensTotal
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('Failed to update user profile:', updateErr);
      throw new Error('Profile update failed');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment verified and subscription upgraded successfully.',
      plan,
      tokensTotal
    });
  } catch (err: any) {
    console.error('Razorpay verification error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
