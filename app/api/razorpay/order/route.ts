import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', receipt = 'receipt_1' } = await req.json();

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
        receipt: receipt
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.description || 'Failed to create Razorpay order');
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Razorpay order creation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
