import crypto from 'node:crypto';
import { safeEqual } from './auth';

// ==============================================================================
// RAZORPAY (server-side): order creation + payment signature verification.
// The amount charged is always decided by the server, never by the browser.
// ==============================================================================

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export function razorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

export function razorpayKeyId(): string {
  return KEY_ID;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

/** Creates a Razorpay order for `amountInRupees`. Throws on gateway errors. */
export async function createRazorpayOrder(amountInRupees: number, receipt: string, notes: Record<string, string> = {}): Promise<RazorpayOrder> {
  if (!razorpayConfigured()) throw new Error('Razorpay is not configured on the server');
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: Math.round(amountInRupees * 100), // paise
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes,
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    throw new Error(`Razorpay order creation failed (${res.status}): ${data?.error?.description || 'unknown error'}`);
  }
  return data as RazorpayOrder;
}

/** Verifies the checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
  if (!KEY_SECRET || !razorpayOrderId || !razorpayPaymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}
