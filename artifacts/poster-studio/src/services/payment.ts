export type RazorpayPaymentSuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

/**
 * Everything here comes from the server's POST /api/orders response.
 * The browser never decides the amount or the Razorpay key.
 */
export type PaymentRequest = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDescription?: string;
};

export type PaymentResult =
  | { status: 'success'; response: RazorpayPaymentSuccessResponse }
  | { status: 'cancelled'; message: string }
  | { status: 'failed'; message: string };

export function loadRazorpaySDK(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const paymentService = {
  async openRazorpayCheckout(request: PaymentRequest): Promise<PaymentResult> {
    const isLoaded = await loadRazorpaySDK();
    if (!isLoaded || !request.keyId || !request.razorpayOrderId) {
      // Never simulate a successful payment: the server would reject it anyway.
      return { status: 'failed', message: 'Could not load the secure payment window. Check your connection and try again.' };
    }

    return new Promise((resolve) => {
      let settled = false;
      const settle = (r: PaymentResult) => {
        if (!settled) {
          settled = true;
          resolve(r);
        }
      };

      const rzp = new (window as any).Razorpay({
        key: request.keyId,
        order_id: request.razorpayOrderId,
        amount: request.amountPaise,
        currency: request.currency || 'INR',
        name: 'DUNGEONS',
        description: request.orderDescription || `Order ${request.orderNumber}`,
        image: '/images/header-logo.png',
        prefill: {
          name: request.customerName,
          email: request.customerEmail,
          contact: request.customerPhone,
        },
        notes: { orderNumber: request.orderNumber },
        theme: { color: '#0f172a' },
        handler: (response: RazorpayPaymentSuccessResponse) => settle({ status: 'success', response }),
        modal: {
          ondismiss: () => settle({ status: 'cancelled', message: 'Payment was dismissed by user.' }),
        },
      });
      rzp.on('payment.failed', (err: any) => {
        settle({ status: 'failed', message: err?.error?.description || 'Payment failed.' });
      });
      rzp.open();
    });
  },
};
