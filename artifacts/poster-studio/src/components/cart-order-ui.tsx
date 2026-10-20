import { useState } from 'react';
import { Link } from 'wouter';
import {
  Check,
  ChevronDown,
  RotateCcw,
  Truck,
  X,
  Plus,
  Minus,
  Tag,
  Percent,
  Bookmark,
  ShoppingBag,
} from 'lucide-react';
import { formatPrice, products } from '@/lib/catalog';
import { store, useStore, type CartItem } from '@/lib/store';

export const availableVouchers = [
  {
    code: 'STUDIO10',
    title: 'Extra 10% OFF on All Posters',
    desc: 'Instant 10% discount across every item in your bag',
    badge: '10% OFF',
    discountFormula: (subtotal: number) => Math.round(subtotal * 0.1),
    minQty: 1,
  },
  {
    code: 'DUNGEONS3',
    title: 'Buy 2 Get 1 FREE (Special Offer)',
    desc: 'Buy any 2 posters and get the 3rd cheapest poster completely free',
    badge: 'B2G1 FREE',
    discountFormula: (subtotal: number, cart: CartItem[]) => {
      const prices = cart.flatMap((item) => Array(item.quantity).fill(item.price)).sort((a, b) => a - b);
      return prices[0] || 0;
    },
    minQty: 3,
  },
  {
    code: 'FIRST10',
    title: 'Welcome 10% Discount',
    desc: 'Special welcome offer for new art lovers on their order',
    badge: 'WELCOME',
    discountFormula: (subtotal: number) => Math.round(subtotal * 0.1),
    minQty: 1,
  },
  {
    code: 'POSTER5',
    title: 'Buy 3 Get 2 FREE (Mega Bundle)',
    desc: 'Add 5 posters to your bag and pay only for 3 posters',
    badge: 'B3G2 FREE',
    discountFormula: (subtotal: number, cart: CartItem[]) => {
      const prices = cart.flatMap((item) => Array(item.quantity).fill(item.price)).sort((a, b) => a - b);
      return (prices[0] || 0) + (prices[1] || 0);
    },
    minQty: 5,
  },
];

interface MyntraItemCardProps {
  item: CartItem;
  isOrderMode?: boolean;
  onRemove?: () => void;
  onSaveForLater?: () => void;
  orderStatus?: string;
  orderDate?: string;
}

export function MyntraItemCard({
  item,
  isOrderMode = false,
  onRemove,
  onSaveForLater,
  orderStatus,
  orderDate,
}: MyntraItemCardProps) {
  const matchProduct = products.find((p) =>
    p.id === item.productId ||
    p.slug === item.slug ||
    p.title.toLowerCase() === item.title.toLowerCase() ||
    (item.slug && p.slug.includes(item.slug)) ||
    (item.title && p.title.toLowerCase().includes(item.title.toLowerCase().split('|')[0].trim()))
  );
  const itemMrp = matchProduct?.compareAtPrice && matchProduct.compareAtPrice > item.price
    ? matchProduct.compareAtPrice
    : Math.round(item.price * 1.5);
  const discountPct = Math.max(10, Math.round(((itemMrp - item.price) / itemMrp) * 100));

  const imageSrc = item.customUpload?.preview || matchProduct?.images?.[0] || '/assets/posters/poster-03.jpg';

  // Calculate estimated delivery date: 4 days from today
  const estDate = new Date();
  estDate.setDate(estDate.getDate() + 4);
  const deliveryDateStr = estDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="myntra-item-card" data-testid={`cart-item-${item.key}`}>
      {/* Left Column: Product Thumbnail with Pink Checkmark Badge */}
      <div className="myntra-thumb-container">
        <Link href={item.slug ? `/products/${item.slug}` : '#'}>
          <img
            src={imageSrc}
            alt={item.title}
            className="myntra-thumb-img"
          />
        </Link>
        {/* Pink checkmark badge like in Myntra reference */}
        <div className="myntra-pink-check-badge" aria-hidden="true">
          <Check size={12} strokeWidth={3.5} className="text-white" />
        </div>
      </div>

      {/* Right Column: Item Information & Details */}
      <div className="myntra-details-col">
        {/* Top Meta Line: NEW Badge & Remove Button */}
        <div className="myntra-card-top-row">
          <span className="myntra-badge-new">NEW</span>

          {!isOrderMode && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="myntra-btn-remove"
              aria-label={`Remove ${item.title} from bag`}
              title="Remove item"
            >
              <X size={17} />
            </button>
          )}

          {isOrderMode && orderStatus && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {orderStatus}
            </span>
          )}
        </div>

        {/* Brand / Kicker */}
        <h4 className="myntra-brand-heading">POSTGENZ</h4>

        {/* Product Title / Description */}
        <Link
          href={item.slug ? `/products/${item.slug}` : '#'}
          className="myntra-item-name"
        >
          {item.title}
        </Link>

        {/* Selectors Row: Size & Qty Pills + Stock alert */}
        <div className="myntra-selectors-row">
          {/* Size Pill */}
          <div className="myntra-pill-btn">
            <span>Size: <strong>{item.size}</strong></span>
            <ChevronDown size={13} className="text-neutral-500" />
          </div>

          {/* Qty Pill / Stepper */}
          {!isOrderMode ? (
            <div className="myntra-qty-stepper-pill">
              <button
                type="button"
                onClick={() => store.updateQuantity(item.key, item.quantity - 1)}
                className="myntra-qty-btn"
                aria-label="Decrease quantity"
              >
                <Minus size={11} strokeWidth={2.5} />
              </button>
              <span className="myntra-qty-num">Qty: {item.quantity}</span>
              <button
                type="button"
                onClick={() => store.updateQuantity(item.key, item.quantity + 1)}
                className="myntra-qty-btn"
                aria-label="Increase quantity"
              >
                <Plus size={11} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="myntra-pill-btn">
              <span>Qty: <strong>{item.quantity}</strong></span>
            </div>
          )}

          {/* Low stock tag like reference */}
          <span className="myntra-stock-left-tag">8 left</span>
        </div>

        {/* Price Row */}
        <div className="myntra-price-row">
          <span className="myntra-current-price">
            {formatPrice(item.price * item.quantity)}
          </span>
          <del className="myntra-strike-price">
            {formatPrice(itemMrp * item.quantity)}
          </del>
          <span className="myntra-discount-tag">
            {discountPct}% Off
          </span>
        </div>

        {/* Return Policy Line */}
        <div className="myntra-trust-line">
          <RotateCcw size={13} className="text-neutral-700 shrink-0" />
          <span><strong>7 days</strong> return</span>
        </div>

        {/* Delivery Date Line */}
        <div className="myntra-delivery-line">
          <Truck size={13} className="text-emerald-600 shrink-0" />
          <span>Delivery by <strong>{orderDate || deliveryDateStr}</strong></span>
        </div>

        {/* Bottom Actions (Save for later) */}
        {!isOrderMode && onSaveForLater && (
          <div className="myntra-card-actions-footer">
            <button
              type="button"
              onClick={onSaveForLater}
              className="myntra-btn-save-later"
            >
              <Bookmark size={13} />
              <span>Move to Wishlist</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface SwiggyCouponBoxProps {
  onAppliedToast?: (msg: string) => void;
  subtotal: number;
  totalCount: number;
}

export function SwiggyCouponBox({ onAppliedToast, subtotal, totalCount }: SwiggyCouponBoxProps) {
  const { coupon, cart } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApply = (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase();
    if (!code) {
      setFeedback({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }

    const match = availableVouchers.find((v) => v.code === code);
    if (!match) {
      setFeedback({ type: 'error', text: 'Invalid coupon code. Try STUDIO10 for 10% OFF.' });
      return;
    }

    if (totalCount < match.minQty) {
      const needed = match.minQty - totalCount;
      setFeedback({
        type: 'error',
        text: `Add ${needed} more poster${needed > 1 ? 's' : ''} to unlock this offer!`,
      });
      return;
    }

    store.setCoupon(code);
    setFeedback({ type: 'success', text: `Coupon ${code} applied successfully!` });
    if (onAppliedToast) onAppliedToast(`Coupon ${code} applied!`);
  };

  const handleRemove = () => {
    store.setCoupon('');
    setFeedback(null);
    if (onAppliedToast) onAppliedToast('Coupon removed');
  };

  // Estimate maximum saving amount
  const maxSaving = Math.max(850, Math.round(subtotal * 0.1) || 850);

  return (
    <div className="swiggy-coupon-wrapper">
      {/* Top Header Row with "View All Offers" */}
      <div className="swiggy-coupon-header-row">
        <h3 className="swiggy-coupon-header-title">Coupons &amp; Bank Offers</h3>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="swiggy-view-all-link"
        >
          {isOpen ? 'Hide Offers' : 'View All Offers'}
        </button>
      </div>

      {/* Main Expandable Accordion Box */}
      <div
        className={`swiggy-coupon-card-box ${coupon ? 'swiggy-card-applied' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="swiggy-card-inner-left">
          {/* Gold Coin Icon Badge (Swiggy / Myntra Style) */}
          <div className="swiggy-gold-coin-badge" aria-hidden="true">
            <span className="swiggy-coin-symbol">₹</span>
          </div>

          <div className="swiggy-coupon-text-col">
            <div className="swiggy-coupon-headline">
              {coupon ? (
                <span className="text-emerald-700">🎉 {coupon} APPLIED</span>
              ) : (
                <span>Save upto {formatPrice(maxSaving)}</span>
              )}
            </div>
            <div className="swiggy-coupon-subtext">
              {coupon ? (
                'Coupon applied successfully on this order'
              ) : (
                `${availableVouchers.length} Coupons & Offers Available`
              )}
            </div>
          </div>
        </div>

        {/* Right Arrow Chevron */}
        <div className="swiggy-card-inner-right">
          <ChevronDown
            size={22}
            className={`swiggy-chevron-icon ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Accordion Expandable Content */}
      {isOpen && (
        <div
          className="swiggy-coupon-drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* If coupon is applied: show celebration banner + Remove */}
          {coupon ? (
            <div className="swiggy-applied-celebration-card">
              <div className="flex items-center gap-2.5">
                <div className="swiggy-check-circle">
                  <Check size={16} strokeWidth={3} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm uppercase text-emerald-950">
                      {coupon}
                    </span>
                    <span className="swiggy-applied-chip">APPLIED</span>
                  </div>
                  <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                    Offer unlocked on your shopping bag!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="swiggy-remove-btn"
              >
                REMOVE
              </button>
            </div>
          ) : (
            <>
              {/* Promo Code Input Box */}
              <div className="swiggy-input-apply-row">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon code"
                  className="swiggy-code-input"
                />
                <button
                  type="button"
                  onClick={() => handleApply(couponInput)}
                  className="swiggy-apply-submit-btn"
                >
                  APPLY
                </button>
              </div>

              {feedback && (
                <div
                  className={`swiggy-feedback-msg ${
                    feedback.type === 'success' ? 'feedback-success' : 'feedback-error'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {/* List of Available Offers */}
              <div className="swiggy-offers-list">
                {availableVouchers.map((voucher) => {
                  const isEligible = totalCount >= voucher.minQty;
                  const needed = voucher.minQty - totalCount;

                  return (
                    <div key={voucher.code} className="swiggy-voucher-item">
                      <div className="swiggy-voucher-info">
                        <div className="flex items-center gap-2">
                          <span className="swiggy-voucher-code">
                            <Tag size={12} className="shrink-0" />
                            <span>{voucher.code}</span>
                          </span>
                          <span className="swiggy-voucher-badge">
                            {voucher.badge}
                          </span>
                        </div>
                        <h4 className="swiggy-voucher-title">{voucher.title}</h4>
                        <p className="swiggy-voucher-desc">{voucher.desc}</p>
                        {!isEligible && (
                          <span className="swiggy-voucher-locked">
                            🔒 Add {needed} more poster{needed > 1 ? 's' : ''} to unlock
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!isEligible}
                        onClick={() => handleApply(voucher.code)}
                        className={`swiggy-voucher-apply-btn ${
                          isEligible ? 'btn-active' : 'btn-disabled'
                        }`}
                      >
                        APPLY
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface MyntraPriceDetailsProps {
  totalMRP: number;
  subtotal: number;
  discount: number;
  total: number;
  totalItemCount: number;
  totalSavings: number;
  onProceed?: () => void;
  proceedLabel?: string;
}

export function MyntraPriceDetails({
  totalMRP,
  subtotal,
  discount,
  total,
  totalItemCount,
  totalSavings,
  onProceed,
  proceedLabel = 'PROCEED TO CHECKOUT',
}: MyntraPriceDetailsProps) {
  const discountOnMRP = Math.max(0, totalMRP - subtotal);

  return (
    <div className="myntra-price-card">
      <h3 className="myntra-price-header-title">Price Details</h3>

      <div className="myntra-price-breakdown">
        {/* Total MRP */}
        <div className="myntra-price-line">
          <span className="myntra-line-label">Total MRP</span>
          <span className="myntra-line-value">{formatPrice(totalMRP)}</span>
        </div>

        {/* Discount on MRP */}
        {discountOnMRP > 0 && (
          <div className="myntra-price-line line-green">
            <span className="myntra-line-label">Discount on MRP</span>
            <span className="myntra-line-value">− {formatPrice(discountOnMRP)}</span>
          </div>
        )}

        {/* Coupon Discount */}
        {discount > 0 && (
          <div className="myntra-price-line line-green">
            <span className="myntra-line-label">Coupon Discount</span>
            <span className="myntra-line-value">− {formatPrice(discount)}</span>
          </div>
        )}

        {/* Platform Fee */}
        <div className="myntra-price-line">
          <span className="myntra-line-label">
            Platform Fee <span className="myntra-know-more">Know More</span>
          </span>
          <span className="myntra-line-value text-emerald-600 font-bold uppercase">
            FREE
          </span>
        </div>

        <div className="myntra-price-divider" />

        {/* Total Amount */}
        <div className="myntra-price-total-line">
          <span className="myntra-total-label">Total Amount</span>
          <span className="myntra-total-value">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Green Savings Banner like in Screenshot 1 */}
      {totalSavings > 0 && (
        <div className="myntra-savings-green-banner">
          <div className="myntra-savings-percent-badge" aria-hidden="true">
            <Percent size={13} strokeWidth={3} className="text-white" />
          </div>
          <span className="myntra-savings-banner-text">
            You&apos;re saving{' '}
            <strong className="myntra-savings-highlight-text">
              {formatPrice(totalSavings)}
            </strong>{' '}
            on this order
          </span>
        </div>
      )}

      {onProceed && (
        <button
          type="button"
          onClick={onProceed}
          className="btn-myntra-checkout-black"
        >
          {proceedLabel}
        </button>
      )}
    </div>
  );
}
