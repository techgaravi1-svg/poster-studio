import { useState } from 'react';
import { Link } from 'wouter';
import {
  HelpCircle,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  Mail,
  Package,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';

interface FaqItem {
  id: number;
  question: string;
  answer: string | React.ReactNode;
  category: 'returns' | 'shipping' | 'payment' | 'products' | 'custom';
}

const FAQS_DATA: FaqItem[] = [
  {
    id: 1,
    question: '1. What is Dungeons return policy?',
    answer: (
      <div>
        <p className="mb-2">
          We do not offer returns or refunds on poster orders. Partial payments (
          <strong>[AMOUNT] + [SHIPPING AMOUNT] shipping</strong>) are non-refundable under any
          circumstances.
        </p>
        <p className="text-sm text-neutral-600">
          Cancellation is only allowed before the order is packed and any tracking details have
          been assigned.
        </p>
      </div>
    ),
    category: 'returns',
  },
  {
    id: 2,
    question: '2. How long does shipping take?',
    answer: (
      <div>
        <p>
          Standard shipping within India takes <strong>7–10 business days</strong>.
        </p>
      </div>
    ),
    category: 'shipping',
  },
  {
    id: 3,
    question: '3. Do you offer cash on delivery?',
    answer: (
      <div>
        <p>
          No, we currently do not offer Cash on Delivery. However, partial payment is available.
        </p>
      </div>
    ),
    category: 'payment',
  },
  {
    id: 4,
    question: '4. How do I choose the right offer for my needs?',
    answer: (
      <div>
        <p className="mb-2">
          Choose the poster offer based on your budget and wall space.
        </p>
        <p>
          Click on the <em>"How to Apply Offer"</em> button on the product page to know about all
          the live offers and how to apply them.
        </p>
      </div>
    ),
    category: 'products',
  },
  {
    id: 5,
    question: '5. How do I check if my discount is applied?',
    answer: (
      <div>
        <p className="mb-2">Open your cart and verify:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>The discounted price is visible.</li>
          <li>The correct total number of posters has been added.</li>
        </ul>
      </div>
    ),
    category: 'payment',
  },
  {
    id: 6,
    question: '6. What materials are Dungeons posters made of?',
    answer: (
      <div>
        <p>
          Dungeons posters are printed on premium <strong>250–300 GSM matte paper</strong>,
          offering superior durability, vibrant colours, and fade resistance.
        </p>
      </div>
    ),
    category: 'products',
  },
  {
    id: 7,
    question: '7. Do Dungeons posters come with a border?',
    answer: (
      <div>
        <p>
          No, Dungeons posters are <strong>edge-to-edge printed</strong>. No white borders are
          visible.
        </p>
      </div>
    ),
    category: 'products',
  },
  {
    id: 8,
    question: '8. What is the delivery time for my order?',
    answer: (
      <div>
        <ul className="space-y-1 text-sm mb-2">
          <li>
            <strong>Processing:</strong> 1–2 business days
          </li>
          <li>
            <strong>Delivery time:</strong> 7–8 business days
          </li>
        </ul>
        <p className="text-xs text-neutral-500">
          Please note that delivery times may vary depending on the delivery location and courier
          service.
        </p>
      </div>
    ),
    category: 'shipping',
  },
  {
    id: 9,
    question: '9. Can I cancel or change my order?',
    answer: (
      <div>
        <p className="mb-2">
          Cancellation is only allowed before the order is packed and any tracking details have
          been assigned.
        </p>
        <p className="text-sm">
          To cancel or make changes to your order, contact the Dungeons support team via email at{' '}
          <a
            href="mailto:dungeons.support@gmail.com"
            className="text-blue-600 font-semibold underline"
          >
            dungeons.support@gmail.com
          </a>
          .
        </p>
      </div>
    ),
    category: 'returns',
  },
  {
    id: 10,
    question: '10. Is customisation available?',
    answer: (
      <div>
        <p className="mb-2">
          Yes, customisation is available! Go to the <strong>"Custom Orders"</strong> section for
          custom orders and follow the instructions provided there.
        </p>
        <Link href="/custom" className="inline-flex items-center gap-1 text-sm text-blue-600 font-semibold underline">
          Explore Custom Orders →
        </Link>
      </div>
    ),
    category: 'custom',
  },
];

// -------------------------------------------------------------
// 1. FAQS PAGE (CLEAN POINT 1 FORMAT - PAGE 7)
// -------------------------------------------------------------
export function FaqPage() {
  const [openIds, setOpenIds] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

  const toggle = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="simple-policy-container max-w-3xl mx-auto px-4 py-8">
      <h1 className="simple-policy-title text-2xl md:text-3xl font-extrabold text-neutral-900 mb-6 tracking-tight uppercase border-b border-neutral-200 pb-3">
        FAQs
      </h1>

      <div className="faq-simple-list space-y-3">
        {FAQS_DATA.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                className="w-full text-left p-4 flex items-center justify-between font-bold text-neutral-900 hover:bg-neutral-50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-sm md:text-base pr-3">{faq.question}</span>
                <span className="text-neutral-400 shrink-0">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-sm text-neutral-600 border-t border-neutral-100 bg-neutral-50/40">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. TERMS & CONDITIONS PAGE
// -------------------------------------------------------------
export function TermsPage() {
  return (
    <div className="simple-policy-container max-w-3xl mx-auto px-4 py-8">
      <h1 className="simple-policy-title text-2xl md:text-3xl font-extrabold text-neutral-900 mb-6 tracking-tight uppercase border-b border-neutral-200 pb-3">
        TERMS &amp; CONDITIONS
      </h1>

      <div className="terms-doc-container">
        <div className="terms-clauses-list space-y-6">
            <section className="terms-clause">
              <h2 className="clause-title">1. About Our Store</h2>
              <p>
                The Website is owned and operated by Dungeons, having its place of business at
                Ahmedabad, India. For the purposes of these Terms, &quot;Dungeons&quot;, &quot;we&quot;,
                &quot;our&quot;, and &quot;us&quot; refer to the operator of this Website. We currently
                operate as an independent online store and sell products directly to customers through
                the Website.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">2. Using Our Website</h2>
              <p>
                You agree to use this Website only for legitimate purposes and in accordance with
                applicable laws. You must not:
              </p>
              <ul className="terms-bullet-list">
                <li>Use the Website for fraudulent, unlawful, or unauthorized activities.</li>
                <li>Attempt to interfere with the operation or security of the Website.</li>
                <li>Access or attempt to access areas or information that are not intended for public use.</li>
                <li>Copy, reproduce, distribute, or commercially exploit our Website content without permission.</li>
                <li>Provide information that is false, misleading, or deliberately inaccurate.</li>
                <li>
                  Use the Website in a manner that could damage, disable, overburden, or impair the
                  Website or affect other users.
                </li>
              </ul>
              <p className="mt-2 text-sm text-neutral-600">
                We reserve the right to restrict or suspend access to the Website where reasonably
                necessary to protect our business, Website, customers, or other users.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">3. Product Information</h2>
              <p>
                We make reasonable efforts to ensure that product names, descriptions, photographs,
                specifications, dimensions, colours, and other information displayed on the Website
                are accurate. However, certain differences may occur due to:
              </p>
              <ul className="terms-bullet-list">
                <li>Screen and device settings</li>
                <li>Photography and lighting conditions</li>
                <li>Manufacturing or printing variations</li>
                <li>Natural variations in materials</li>
                <li>Minor differences between individual products</li>
              </ul>
              <p className="mt-2 text-sm text-neutral-600">
                Such variations do not necessarily indicate that a product is defective. If a
                particular product has specific characteristics, limitations, or requirements, these
                will be communicated on the relevant product page wherever reasonably possible.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">4. Product Availability</h2>
              <p>
                Products displayed on the Website are subject to availability. We may discontinue,
                modify, or temporarily remove products from sale at any time. Adding a product to your
                cart does not guarantee that the product will remain available until checkout is
                completed. If a product becomes unavailable after you have placed an order, we will
                contact you and, where applicable, provide an appropriate refund or alternative
                resolution.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">5. Prices and Taxes</h2>
              <p>
                All prices displayed on the Website are in Indian Rupees (INR) unless otherwise
                specified. Prices may be changed from time to time. We may also offer discounts,
                promotional prices, or limited-time offers, which may be subject to additional terms.
                Applicable taxes and delivery charges, if any, will be shown during the purchase
                process where applicable. If an obvious pricing or listing error occurs on the
                Website, we reserve the right to correct the error and, where necessary, cancel the
                affected order. If payment has already been received for a cancelled order, the
                applicable amount will be refunded.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">6. Placing an Order</h2>
              <p>
                When you place an order, you agree that the information provided by you is accurate and
                complete. After submitting an order, you may receive an acknowledgement or
                confirmation through email, SMS, WhatsApp, or another available communication channel.
                An order acknowledgement confirms that we have received your request. It does not
                necessarily mean that the order has been finally accepted. We may decline or cancel an
                order in reasonable circumstances, including:
              </p>
              <ul className="terms-bullet-list">
                <li>The product is unavailable.</li>
                <li>There is an error in the product listing or price.</li>
                <li>The order appears fraudulent or unauthorized.</li>
                <li>Delivery to the provided address is not possible.</li>
                <li>Information supplied by the customer is incomplete or inaccurate.</li>
                <li>Circumstances outside our reasonable control prevent fulfilment.</li>
              </ul>
              <p className="mt-2 text-sm text-neutral-600">
                If we cancel an order for which payment has already been received, the applicable
                amount will be refunded.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">7. Payment</h2>
              <p>
                Payment must be completed using one of the payment methods made available during
                checkout. Payments may be processed through independent payment service providers.
                Your use of a particular payment method may also be subject to the terms and policies
                of that payment provider. We do not request or require customers to share confidential
                payment credentials such as UPI PINs, passwords, or card PINs with us.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">8. Shipping and Delivery</h2>
              <p>
                We ship orders to the delivery address provided by the customer during checkout. The
                estimated delivery period displayed on the Website is an approximate timeframe and may
                vary depending on the destination, courier availability, weather, public holidays,
                operational conditions, and other factors. Once an order has been handed over to the
                shipping partner, delivery is also subject to the shipping partner&apos;s processes. We
                will make reasonable efforts to assist customers in relation to delivery issues, but
                delays caused by events or circumstances outside our reasonable control may occur.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">9. Delivery Address and Failed Delivery</h2>
              <p>
                Customers are responsible for providing a complete and accurate delivery address, phone
                number, and other information required for delivery. We will not be responsible for a
                failed or delayed delivery caused by an incorrect, incomplete, or inaccessible address
                or by the recipient being unavailable to receive the shipment. If a shipment is returned
                to us because delivery could not be completed, any re-shipping may be subject to
                additional charges.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">10. Order Cancellation</h2>
              <p>
                Cancellation requests should be submitted as soon as possible after placing an order.
                Whether an order can be cancelled may depend on its processing or shipping status.
                Once an order has been processed, dispatched, or otherwise entered the fulfilment stage,
                cancellation may no longer be possible. Any refund arising from an approved cancellation
                will be processed in accordance with our applicable refund policy.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">11. Returns, Replacements and Refunds</h2>
              <p>
                Returns, replacements, exchanges, and refunds are governed by our Return &amp; Refund
                Policy, which forms part of these Terms. Customers should review that policy before
                placing an order. If you receive a product that is damaged, defective, incorrect,
                incomplete, or otherwise qualifies for a remedy under our Return &amp; Refund Policy,
                please contact us within the specified period. We may request photographs, videos,
                packaging information, order details, or other reasonable information to assess the
                issue.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">12. Intellectual Property</h2>
              <p>
                All material appearing on this Website, including but not limited to brand names and
                logos, product photographs, product designs, illustrations, graphics, written content,
                website layout, icons, and visual elements, is owned by, licensed to, or used with
                permission by Dungeons, unless otherwise stated. You may view and use the Website for
                personal and lawful shopping purposes. You may not reproduce, copy, modify, distribute,
                publish, sell, or commercially exploit our content without our prior written permission.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">13. Third-Party Services</h2>
              <p>
                Our Website may rely on third-party services such as payment processors, delivery
                providers, hosting services, analytics providers, communication services, or other
                technology providers. Your use of certain third-party services may also be governed by
                their respective terms and policies. We are not responsible for the independent
                policies, practices, or actions of third-party service providers, except to the extent
                required by applicable law.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">14. Website Content and Availability</h2>
              <p>
                We aim to keep the information on our Website accurate and the Website accessible.
                However, we do not guarantee that the Website will always be available, uninterrupted,
                completely error-free, or free from technical issues. We may update, modify, suspend, or
                discontinue any part of the Website when reasonably necessary.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">15. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted under applicable law, Dungeons will not be responsible
                for losses arising from circumstances beyond our reasonable control, including technical
                interruptions, third-party service failures, courier delays, or events outside our
                control. Nothing in these Terms is intended to exclude or restrict any consumer right,
                remedy, liability, or protection that cannot legally be excluded or restricted under
                applicable law. Where liability can legally be limited, our liability in relation to a
                particular product will generally not exceed the amount actually paid by the customer for
                that product, except where applicable law provides otherwise.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">16. Events Beyond Our Control</h2>
              <p>
                We will not be considered in breach of these Terms where our ability to perform an
                obligation is affected by circumstances reasonably beyond our control. Such
                circumstances may include natural disasters, extreme weather, government actions,
                strikes, transportation disruptions, technical failures, public emergencies, or
                significant disruptions to third-party services. We will make reasonable efforts to resume
                affected services as soon as practicable.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">17. Changes to These Terms</h2>
              <p>
                We may revise these Terms when necessary to reflect changes to our business, Website,
                products, or applicable legal requirements. The updated version will be published on
                this page together with the revised &quot;Last Updated&quot; date. Your continued use of
                the Website after an updated version becomes available will constitute acceptance of the
                revised Terms to the extent permitted by applicable law.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">18. Applicable Law</h2>
              <p>
                These Terms shall be governed by and interpreted in accordance with the laws applicable
                in India. Nothing in this section is intended to take away any mandatory consumer rights
                or remedies available to you under applicable law.
              </p>
            </section>

            <section className="terms-clause">
              <h2 className="clause-title">19. Contact Us</h2>
              <div className="terms-contact-card">
                <p className="mb-2">
                  For questions, complaints, or requests relating to these Terms or an order, you can
                  contact us at:
                </p>
                <div className="space-y-1 text-sm font-medium">
                  <div>
                    <strong>Entity:</strong> Dungeons
                  </div>
                  <div>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:dungeons.support@gmail.com" className="text-blue-600 underline">
                      dungeons.support@gmail.com
                    </a>
                  </div>
                  <div>
                    <strong>Business Address:</strong> Ahmedabad, Gujarat, India
                  </div>
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  We will make reasonable efforts to respond to customer queries and complaints within
                  an appropriate timeframe.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
  );
}

// -------------------------------------------------------------
// 3. RETURN, REPLACEMENT & REFUND POLICY PAGE
// -------------------------------------------------------------
export function ReturnPolicyPage() {
  return (
    <div className="simple-policy-container max-w-3xl mx-auto px-4 py-8">
      <h1 className="simple-policy-title text-2xl md:text-3xl font-extrabold text-neutral-900 mb-6 tracking-tight uppercase border-b border-neutral-200 pb-3">
        CUSTOMER POLICY
      </h1>

      <div className="terms-doc-container">
        <div className="terms-clauses-list space-y-6">
            <section className="terms-clause">
              <div className="flex items-center gap-2 mb-2">
                <span className="policy-badge-num">1</span>
                <h2 className="clause-title !mb-0">No Returns</h2>
              </div>
              <p>
                Since every poster is printed specifically after an order is placed, we do not accept
                returns or exchanges due to a change of mind, selecting the wrong size or design,
                placing an order by mistake, or minor differences in colour between your screen and the
                final printed product.
              </p>
            </section>

            <section className="terms-clause">
              <div className="flex items-center gap-2 mb-2">
                <span className="policy-badge-num">2</span>
                <h2 className="clause-title !mb-0">When We Offer a Replacement</h2>
              </div>
              <p>
                We will replace a poster if it arrives <strong>damaged, defective, missing, or incorrect</strong>.
                Custom and personalised posters are also eligible for replacement, but only in these
                situations. We cannot accept claims for quality issues resulting from a low-resolution
                or poor-quality image provided by the customer.
              </p>
            </section>

            <section className="terms-clause">
              <div className="flex items-center gap-2 mb-2">
                <span className="policy-badge-num">3</span>
                <h2 className="clause-title !mb-0">How to Make a Claim (Within 48 Hours of Delivery)</h2>
              </div>
              <ul className="terms-bullet-list">
                <li>
                  Submit a request through{' '}
                  <a href="mailto:dungeons.support@gmail.com" className="text-blue-600 underline font-semibold">
                    dungeons.support@gmail.com
                  </a>{' '}
                  with your order number, a description of the issue, and relevant photos.
                </li>
                <li>
                  Send a clear and unedited unboxing video to{' '}
                  <a href="mailto:dungeons.support@gmail.com" className="text-blue-600 underline font-semibold">
                    dungeons.support@gmail.com
                  </a>
                  , mentioning your order number or reference number.
                </li>
                <li>
                  The video must begin with the sealed package and clearly show the opening of the
                  parcel, the product, and the issue.
                </li>
              </ul>
              <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                Notice: Claims submitted without an unboxing video or after 48 hours from delivery will
                not be accepted.
              </div>
            </section>

            <section className="terms-clause">
              <div className="flex items-center gap-2 mb-2">
                <span className="policy-badge-num">4</span>
                <h2 className="clause-title !mb-0">What Happens Next</h2>
              </div>
              <ul className="terms-bullet-list">
                <li>Our team will review the unboxing video, photographs, and order details.</li>
                <li>If your claim is approved, we will arrange a replacement.</li>
                <li>
                  If a replacement cannot be provided, we will issue a refund to the original payment
                  method.
                </li>
              </ul>
              <p className="mt-2 text-sm text-neutral-600">
                Please allow up to <strong>5 business days</strong> after approval for the refund to
                reflect in your account.
              </p>
            </section>

            <section className="terms-clause">
              <div className="flex items-center gap-2 mb-2">
                <span className="policy-badge-num">5</span>
                <h2 className="clause-title !mb-0">Non-Refundable Items</h2>
              </div>
              <p>
                Glue dots, stickers, and other accessories are non-refundable unless they are received
                defective or incorrect. Free gifts, customer-side RTO charges, and COD charges are
                also non-refundable. For parcels returned to us, please refer to our Shipping &amp;
                Cancellation Policy.
              </p>
            </section>

            <section className="terms-clause">
              <div className="flex items-center gap-2 mb-2">
                <span className="policy-badge-num">6</span>
                <h2 className="clause-title !mb-0">Need Help?</h2>
              </div>
              <div className="terms-contact-card">
                <p className="mb-2">
                  For any questions or assistance with your order, replacement, or policies:
                </p>
                <div className="text-sm">
                  Email us at{' '}
                  <a
                    href="mailto:dungeons.support@gmail.com"
                    className="text-blue-600 font-bold underline"
                  >
                    dungeons.support@gmail.com
                  </a>
                  . Our support team will respond within <strong>24 hours</strong>.
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
  );
}
