import { useState, useEffect } from 'react';
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
  Lock,
  Ruler,
} from 'lucide-react';
import { formatPrice, getProductSizePrice, getProductSizeComparePrice, products, type PosterSize } from '@/lib/catalog';
import { store, useStore, type CartItem } from '@/lib/store';

export const sizeInfoMap: Record<string, { name: string; dims: string; badge?: string; recommendation: string }> = {
  A5: {
    name: 'A5 Size',
    dims: '14.8 × 21.0 cm (5.8 × 8.3 in)',
    badge: 'Compact',
    recommendation: 'Perfect for study tables, pinboards & desk setups',
  },
  A4: {
    name: 'A4 Size',
    dims: '21.0 × 29.7 cm (8.3 × 11.7 in)',
    badge: 'Most Popular ⚡',
    recommendation: 'Standard poster size, ideal for room walls & doors',
  },
  A3: {
    name: 'A3 Size',
    dims: '29.7 × 42.0 cm (11.7 × 16.5 in)',
    badge: 'Large View 🔥',
    recommendation: 'Maximum visual impact, perfect for bedroom & living space',
  },
};

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

  const availableSizes: PosterSize[] = ['A5', 'A4', 'A3'];

  const maxStock = item.customUpload
    ? 999
    : typeof matchProduct?.stock === 'number'
      ? Math.max(0, matchProduct.stock)
      : 50;
  const isAtMaxStock = item.quantity >= maxStock;

  useEffect(() => {
    if (!isOrderMode && !item.customUpload && item.quantity > maxStock && maxStock > 0) {
      store.updateQuantity(item.key, maxStock);
    }
  }, [item.key, item.quantity, maxStock, isOrderMode, item.customUpload]);

  const [isSizeSheetOpen, setIsSizeSheetOpen] = useState(false);
  const normalizedSize: PosterSize = item.size === 'A3' || item.size === 'A4' || item.size === 'A5' ? item.size : 'A5';
  const [selectedTempSize, setSelectedTempSize] = useState<PosterSize>(normalizedSize);

  useEffect(() => {
    setSelectedTempSize(item.size === 'A3' || item.size === 'A4' || item.size === 'A5' ? item.size : 'A5');
  }, [item.size]);

  return (
    <div className="myntra-item-card" data-testid={`cart-item-${item.key}`}>
      {/* Left Column: Product Thumbnail with Pink Checkmark Badge */}
      <div className="myntra-thumb-container">
        <Link href={item.slug ? `/products/${item.slug}` : '#'}>
          <img
            src={imageSrc}
            alt={item.title}
            className="myntra-thumb-img"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.includes('poster-01.jpg')) {
                target.src = '/assets/posters/poster-01.jpg';
              }
            }}
          />
        </Link>
        {/* Pink checkmark badge like in Myntra reference */}
        <div className="myntra-pink-check-badge" aria-hidden="true">
          <Check size={12} strokeWidth={3.5} className="text-white" />
        </div>
      </div>

      {/* Right Column: Item Information & Details */}
      <div className="myntra-details-col">
        {/* Top Meta Line: Brand Heading + Remove Button / Order Status */}
        <div className="myntra-card-top-row">
          <h4 className="myntra-brand-heading">POSTGENZ</h4>

          {!isOrderMode && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="myntra-btn-remove"
              aria-label={`Remove ${item.title} from bag`}
              title="Remove item"
            >
              <X size={16} />
            </button>
          )}

          {isOrderMode && orderStatus && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {orderStatus}
            </span>
          )}
        </div>

        {/* Product Title / Description */}
        <Link
          href={item.slug ? `/products/${item.slug}` : '#'}
          className="myntra-item-name"
        >
          {item.title}
        </Link>

        {/* Selectors Row: Size & Qty Pills + Stock alert */}
        <div className="myntra-selectors-row">
          {/* Size Pill with Myntra/Flipkart Modal Trigger */}
          {!isOrderMode ? (
            <button
              type="button"
              onClick={() => {
                setSelectedTempSize(item.size);
                setIsSizeSheetOpen(true);
              }}
              className="myntra-pill-btn myntra-size-trigger-btn"
              title="Click to select size"
              aria-label={`Select size for ${item.title}`}
            >
              <span>Size: <strong>{item.size}</strong></span>
              <ChevronDown size={13} className="text-neutral-500" />
            </button>
          ) : (
            <div className="myntra-pill-btn">
              <span>Size: <strong>{item.size}</strong></span>
            </div>
          )}

          {/* Qty Pill / Stepper */}
          {!isOrderMode ? (
            <div className="flex items-center gap-2">
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
                  disabled={isAtMaxStock}
                  onClick={() => {
                    if (!isAtMaxStock) {
                      store.updateQuantity(item.key, item.quantity + 1);
                    }
                  }}
                  className={`myntra-qty-btn ${isAtMaxStock ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                  title={isAtMaxStock ? `Max available stock reached (${maxStock})` : 'Increase quantity'}
                  aria-label="Increase quantity"
                >
                  <Plus size={11} strokeWidth={2.5} />
                </button>
              </div>

              {maxStock === 1 && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Only 1 available
                </span>
              )}
            </div>
          ) : (
            <div className="myntra-pill-btn">
              <span>Qty: <strong>{item.quantity}</strong></span>
            </div>
          )}
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

        {/* Delivery Date Line (only in order history if explicitly provided) */}
        {isOrderMode && orderDate && (
          <div className="myntra-delivery-line">
            <Truck size={13} className="text-emerald-600 shrink-0" />
            <span>Delivery: <strong>{orderDate}</strong></span>
          </div>
        )}

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

      {/* MYNTRA / FLIPKART ECOMMERCE SIZE SELECTION BOTTOM SHEET MODAL */}
      {isSizeSheetOpen && (
        <div
          className="ecommerce-size-modal-backdrop"
          role="presentation"
          onClick={() => setIsSizeSheetOpen(false)}
        >
          <div
            className="ecommerce-size-modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Select Size"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Pill */}
            <div className="ecommerce-size-drag-bar" aria-hidden="true" />

            {/* Modal Header */}
            <div className="ecommerce-size-modal-header">
              <div>
                <h3 className="ecommerce-size-title">Select Size</h3>
                <p className="ecommerce-size-subtitle">Premium Archival Prints</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSizeSheetOpen(false)}
                className="ecommerce-size-close-btn"
                aria-label="Close size selector"
              >
                <X size={20} />
              </button>
            </div>

            {/* Product Quick Header Strip */}
            <div className="ecommerce-size-product-summary">
              <img
                src={imageSrc}
                alt={item.title}
                className="ecommerce-size-product-thumb"
              />
              <div className="ecommerce-size-product-meta">
                <span className="ecommerce-size-brand-tag">POSTGENZ</span>
                <h4 className="ecommerce-size-product-title">{item.title}</h4>
                <div className="ecommerce-size-price-row">
                  <span className="ecommerce-size-current-price">{formatPrice(item.price)}</span>
                  {itemMrp > item.price && (
                    <>
                      <del className="ecommerce-size-mrp-price">{formatPrice(itemMrp)}</del>
                      <span className="ecommerce-size-discount-tag">{discountPct}% OFF</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Size Options Grid */}
            <div className="ecommerce-size-options-container">
              <div className="ecommerce-size-section-heading">
                <span>CHOOSE POSTER SIZE</span>
                <span className="ecommerce-size-guide-pill">
                  <Ruler size={12} /> Standard Dimensions
                </span>
              </div>

              <div className="ecommerce-size-cards-grid">
                {availableSizes.map((sz) => {
                  const isSelected = selectedTempSize === sz;
                  const cardPrice = matchProduct ? getProductSizePrice(matchProduct, sz) : item.price;
                  const info = sizeInfoMap[sz] || {
                    name: `Size ${sz}`,
                    dims: 'Standard Dimensions',
                    badge: '',
                    recommendation: 'Archival Print',
                  };

                  return (
                    <div
                      key={sz}
                      onClick={() => setSelectedTempSize(sz)}
                      className={`ecommerce-size-card ${isSelected ? 'active-card' : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTempSize(sz);
                        }
                      }}
                    >
                      <div className="ecommerce-size-card-left">
                        <div className={`ecommerce-size-letter-badge ${isSelected ? 'active-badge' : ''}`}>
                          {sz}
                        </div>
                        <div className="ecommerce-size-card-info">
                          <div className="flex items-center gap-2">
                            <span className="ecommerce-size-card-name">{info.name}</span>
                            {info.badge && (
                              <span className="ecommerce-size-badge-pill">{info.badge}</span>
                            )}
                          </div>
                          <span className="ecommerce-size-card-dims">{info.dims}</span>
                          <span className="ecommerce-size-card-desc">{info.recommendation}</span>
                        </div>
                      </div>

                      <div className="ecommerce-size-card-right">
                        <span className="text-xs font-black text-neutral-900 mr-2">
                          {formatPrice(cardPrice)}
                        </span>
                        <div className={`ecommerce-size-radio ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Footer with DONE button */}
            <div className="ecommerce-size-modal-footer">
              <button
                type="button"
                onClick={() => {
                  const newPrice = matchProduct ? getProductSizePrice(matchProduct, selectedTempSize) : item.price;
                  if (selectedTempSize !== item.size || item.price !== newPrice) {
                    store.updateItemSize(item.key, selectedTempSize, newPrice);
                  }
                  setIsSizeSheetOpen(false);
                }}
                className="ecommerce-size-done-btn"
              >
                <span>CONFIRM SIZE ({selectedTempSize} • {formatPrice(matchProduct ? getProductSizePrice(matchProduct, selectedTempSize) : item.price)})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SwiggyCouponBoxProps {
  onAppliedToast?: (msg: string) => void;
  subtotal: number;
  totalCount: number;
  showHeader?: boolean;
}

export function SwiggyCouponBox({
  onAppliedToast,
  subtotal,
  totalCount,
  showHeader = true,
}: SwiggyCouponBoxProps) {
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
      {/* Top Header Row */}
      {showHeader && (
        <div className="swiggy-coupon-header-row">
          <h3 className="swiggy-coupon-header-title">Coupons &amp; Bank Offers</h3>
        </div>
      )}

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
                <span>Apply Coupon</span>
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
  subtext?: React.ReactNode;
  disabled?: boolean;
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
  subtext,
  disabled = false,
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
        <div className="w-full flex flex-col gap-2 myntra-checkout-action-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={onProceed}
            className="btn-myntra-checkout-black"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              minHeight: '48px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
              margin: '0',
            }}
          >
            <Lock size={15} className="shrink-0" />
            <span>{proceedLabel}</span>
          </button>
          {subtext}
        </div>
      )}
    </div>
  );
}
