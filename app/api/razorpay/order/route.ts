import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { sanitizeString, validatePositiveInt } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const { amount, currency = 'INR', receipt = 'receipt_1' } = body;

    if (!amount || !validatePositiveInt(amount)) {
      return NextResponse.json({ error: 'Valid positive integer amount is required.' }, { status: 400 });
    }

    const sanitizedReceipt = sanitizeString(receipt);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials not configured.' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency,
        receipt: sanitizedReceipt
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.description || 'Failed to create Razorpay order');
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Razorpay order creation error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
