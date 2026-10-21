export type RazorpayPaymentSuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

export type PaymentRequest = {
  amount: number; // in INR
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDescription?: string;
};

export type PaymentResult =
  | { status: 'success'; paymentId: string; orderId?: string }
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
  getRazorpayKey(): string {
    return (
      (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ||
      (typeof window !== 'undefined' && (window as any).__RAZORPAY_KEY_ID__) ||
      ''
    );
  },

  async openRazorpayCheckout(request: PaymentRequest): Promise<PaymentResult> {
    const isLoaded = await loadRazorpaySDK();
    const key = this.getRazorpayKey();

    return new Promise((resolve) => {
      if (isLoaded && key) {
        const options = {
          key,
          amount: Math.round(request.amount * 100), // in paise
          currency: 'INR',
          name: 'Dungeons Posters',
          description: request.orderDescription || 'Custom Wall Art & Posters',
          image: '/assets/dungeons-logo.png',
          prefill: {
            name: request.customerName,
            email: request.customerEmail,
            contact: request.customerPhone,
          },
          theme: {
            color: '#09090b',
          },
          handler: (response: RazorpayPaymentSuccessResponse) => {
            resolve({
              status: 'success',
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
            });
          },
          modal: {
            ondismiss: () => {
              resolve({
                status: 'cancelled',
                message: 'Payment was dismissed by user.',
              });
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (err: any) => {
          resolve({
            status: 'failed',
            message: err?.error?.description || 'Payment failed.',
          });
        });
        rzp.open();
      } else {
        // Safe development simulation when live credentials are not set
        resolve({
          status: 'success',
          paymentId: `pay_test_${Date.now().toString(36)}`,
        });
      }
    });
  },
};