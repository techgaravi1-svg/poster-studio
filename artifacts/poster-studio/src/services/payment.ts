export type PaymentRequest = { amount: number; customerEmail: string };
export type PaymentResult = { status: 'pending'; provider: 'unconfigured'; message: string };

export const paymentService = {
  async createIntent(_request: PaymentRequest): Promise<PaymentResult> {
    return { status: 'pending', provider: 'unconfigured', message: 'Payment is not connected in this local demo. Your order will remain pending until a payment provider is configured.' };
  },
};