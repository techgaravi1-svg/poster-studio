import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Check,
  ChevronDown,
  ChevronUp,
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
  AlertCircle,
} from 'lucide-react';
import { formatPrice, getProductSizePrice, getProductSizeComparePrice, products, type PosterSize } from '@/lib/catalog';
import { store, useStore, fetchLiveCoupons, type CartItem, type ActiveCoupon } from '@/lib/store';

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

const defaultVouchers = [
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

  const imageSrc = item.customUpload?.preview || matchProduct?.images?.[0] || 'https://res.cloudinary.com/pyjyrmry/image/upload/v1793349699/dungeons_store_assets/poster-03_a9d962.jpg';

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
                target.src = 'https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/poster-01_24409e.jpg';
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
        {/* Top Meta Line: Remove Button / Order Status (Aligned to Opposite / Right Side) */}
        <div className="myntra-card-top-row" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          {!isOrderMode && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="myntra-btn-remove"
              style={{ marginLeft: 'auto' }}
              aria-label={`Remove ${item.title} from bag`}
              title="Remove item"
            >
              <X size={16} />
            </button>
          )}

          {isOrderMode && orderStatus && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ marginLeft: 'auto' }}>
              {orderStatus}
            </span>
          )}
        </div>

        {/* Product Title / Description */}
        <Link
          href={item.slug ? `/products/${item.slug}` : '#'}
          className="myntra-item-name block"
        >
          <span className="block font-semibold text-gray-900 leading-tight">{item.title}</span>
          {matchProduct?.description && (
            <span className="block text-xs text-gray-500 font-normal line-clamp-1 mt-0.5 leading-snug">{matchProduct.description}</span>
          )}
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
                          <span className="ecommerce-size-card-name">{sz} Size</span>
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
  const [isOpen, setIsOpen] = useState(true);
  const [viewAllModalOpen, setViewAllModalOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liveCoupons, setLiveCoupons] = useState<ActiveCoupon[]>([]);

  useEffect(() => {
    fetchLiveCoupons().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setLiveCoupons(list);
      }
    });

    const onUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLiveCoupons(e.detail);
      }
    };
    window.addEventListener('dungeons:coupons-updated', onUpdate);
    return () => window.removeEventListener('dungeons:coupons-updated', onUpdate);
  }, []);

  const activeVouchers = liveCoupons.length > 0
    ? liveCoupons.filter((c) => c.isActive !== false)
    : [
        {
          code: 'FIRST10',
          description: 'Welcome 10% Discount for New Art Lovers',
          discountType: 'percentage' as const,
          discountValue: 10,
          minSpend: 0,
          minQty: 1,
          isActive: true,
        },
      ];

  const handleApply = (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase();
    if (!code) {
      setFeedback({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }

    const match = activeVouchers.find((v) => v.code.toUpperCase() === code);
    if (!match) {
      setFeedback({ type: 'error', text: `Invalid coupon code "${code}". Please check for typos.` });
      return;
    }

    if (match.minQty && totalCount < match.minQty) {
      const needed = match.minQty - totalCount;
      setFeedback({
        type: 'error',
        text: `Add ${needed} more poster${needed > 1 ? 's' : ''} to unlock this offer!`,
      });
      return;
    }

    if (match.minSpend && subtotal < match.minSpend) {
      setFeedback({
        type: 'error',
        text: `Minimum order value of ₹${match.minSpend} required for this coupon.`,
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

  const maxSavings = Math.max(
    ...activeVouchers.map((v) =>
      v.discountType === 'percentage'
        ? Math.round(subtotal * (v.discountValue / 100))
        : v.discountValue
    ),
    subtotal > 0 ? Math.round(subtotal * 0.1) : 102
  );

  const featuredVoucher = activeVouchers[0];
  const featuredMinQ = featuredVoucher ? (featuredVoucher.minQty || 1) : 1;
  const isFeaturedEligible = featuredVoucher
    ? totalCount >= featuredMinQ && (!featuredVoucher.minSpend || subtotal >= featuredVoucher.minSpend)
    : false;
  const featuredDiscountAmt = featuredVoucher
    ? (featuredVoucher.discountType === 'percentage'
        ? Math.round(subtotal * (featuredVoucher.discountValue / 100))
        : featuredVoucher.discountValue)
    : 0;

  return (
    <div className="myntra-coupon-wrapper">
      {/* Top Header Row with 'Coupons & Bank Offers' and 'View All Offers' */}
      {showHeader && (
        <div className="myntra-coupon-header-row">
          <span className="myntra-coupon-header-title">Coupons &amp; Bank Offers</span>
          <button
            type="button"
            onClick={() => setViewAllModalOpen(true)}
            className="myntra-coupon-view-all-link"
          >
            View All Offers
          </button>
        </div>
      )}

      {/* Main Single Card matching reference image */}
      <div className={`myntra-coupon-card ${coupon ? 'is-applied' : ''}`}>
        {/* Card Top Row (Toggle Accordion) */}
        <div
          className="myntra-coupon-top-row"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="myntra-coupon-top-left">
            {/* Realistic 3D Indian Rupee Coin */}
            <div className="myntra-gold-coin">
              <span className="myntra-gold-coin-symbol">₹</span>
            </div>

            <div className="myntra-coupon-top-text">
              <div className="myntra-coupon-save-headline">
                {coupon ? `🎉 ${coupon} APPLIED` : `Save upto ₹ ${maxSavings > 0 ? maxSavings : 102}`}
              </div>
              <div className="myntra-coupon-count-subtext">
                {coupon ? 'Coupon discount applied to cart' : '1 Coupon & Offer Available'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="myntra-coupon-chevron-btn"
            aria-label="Toggle coupon"
          >
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {/* Card Body (When Open) */}
        {isOpen && (
          <div>
            {coupon ? (
              <div className="myntra-coupon-applied-box">
                <div className="myntra-coupon-applied-left">
                  <div className="myntra-coupon-check-circle">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="myntra-coupon-applied-code">{coupon} APPLIED</span>
                    <p className="myntra-coupon-applied-desc">Savings unlocked on your order!</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="myntra-coupon-remove-btn"
                >
                  REMOVE
                </button>
              </div>
            ) : featuredVoucher ? (
              /* ONLY 1 Single Featured Coupon Item as in reference image! */
              <div className="myntra-coupon-item-row">
                <div className="myntra-coupon-item-left">
                  {/* Purple Gradient Tag Icon */}
                  <div className="myntra-purple-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8 8a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828l-8-8zM7 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                    </svg>
                  </div>

                  <div className="myntra-coupon-item-details">
                    <span className="myntra-coupon-code-text">
                      {featuredVoucher.code}
                    </span>
                    <span className="myntra-coupon-discount-text">
                      {featuredVoucher.discountType === 'percentage'
                        ? `Extra ₹${featuredDiscountAmt > 0 ? featuredDiscountAmt : 102} OFF`
                        : `Extra ₹${featuredVoucher.discountValue} OFF`}
                    </span>
                    <span className="myntra-coupon-sub-text">
                      {featuredVoucher.discountType === 'percentage'
                        ? `${featuredVoucher.discountValue}% off`
                        : `Flat ₹${featuredVoucher.discountValue} off`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!isFeaturedEligible}
                  onClick={() => handleApply(featuredVoucher.code)}
                  className={`myntra-card-apply-btn ${!isFeaturedEligible ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Apply
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* VIEW ALL OFFERS MODAL / BOTTOM SHEET */}
      {viewAllModalOpen && (
        <div
          className="myntra-offers-modal-backdrop"
          onClick={() => setViewAllModalOpen(false)}
        >
          <div
            className="myntra-offers-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag bar for mobile */}
            <div className="myntra-offers-drag-bar" />

            {/* Modal Header */}
            <div className="myntra-offers-modal-header">
              <div className="myntra-offers-title-group">
                <div className="myntra-purple-tag">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8 8a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828l-8-8zM7 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                  </svg>
                </div>
                <h3>Coupons &amp; Bank Offers</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewAllModalOpen(false)}
                className="myntra-offers-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="myntra-offers-modal-body">
              {/* Custom Promo Code Input */}
              <div className="myntra-offers-input-pill">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon code"
                  className="myntra-offers-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && couponInput.trim()) {
                      handleApply(couponInput);
                      setViewAllModalOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (couponInput.trim()) {
                      handleApply(couponInput);
                      setViewAllModalOpen(false);
                    }
                  }}
                  className="myntra-offers-pill-apply-btn"
                >
                  Apply
                </button>
              </div>

              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {feedback.text}
                </div>
              )}

              {/* All Vouchers List */}
              <div className="myntra-offers-section-label">
                AVAILABLE COUPONS ({activeVouchers.length})
              </div>

              <div className="myntra-offers-list">
                {activeVouchers.map((voucher) => {
                  const minQ = voucher.minQty || 1;
                  const isEligible = totalCount >= minQ && (!voucher.minSpend || subtotal >= voucher.minSpend);
                  const discountAmt = voucher.discountType === 'percentage'
                    ? Math.round(subtotal * (voucher.discountValue / 100))
                    : voucher.discountValue;
                  const isAlreadyApplied = coupon === voucher.code;

                  return (
                    <div
                      key={voucher.code}
                      className="myntra-voucher-card"
                    >
                      <div className="myntra-voucher-left">
                        <span className="myntra-voucher-code-badge">
                          {voucher.code}
                        </span>
                        <div className="myntra-voucher-discount-title">
                          {voucher.discountType === 'percentage'
                            ? `Extra ₹${discountAmt > 0 ? discountAmt : voucher.discountValue} OFF`
                            : `Extra ₹${voucher.discountValue} OFF`}
                        </div>
                        <div className="myntra-voucher-desc">
                          {voucher.description || (voucher.discountType === 'percentage' ? `${voucher.discountValue}% off on all orders` : `Flat ₹${voucher.discountValue} off`)}
                        </div>
                        <div className="myntra-voucher-condition">
                          {voucher.minSpend ? `Applicable on orders above ₹${voucher.minSpend}` : 'Applicable on this order'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!isEligible || isAlreadyApplied}
                        onClick={() => {
                          handleApply(voucher.code);
                          setViewAllModalOpen(false);
                        }}
                        className={`myntra-voucher-apply-btn ${isAlreadyApplied ? 'is-active' : ''} ${!isEligible ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {isAlreadyApplied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
          <span className="myntra-line-label">Platform Fee</span>
          <span className="myntra-line-value text-gray-900 font-bold">
            {formatPrice(10)}
          </span>
        </div>

        <div className="myntra-price-divider" />

        {/* Total Amount */}
        <div className="myntra-price-total-line">
          <span className="myntra-total-label">Total Amount</span>
          <span className="myntra-total-value">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Minimum Order Value Alert (Modern E-Commerce Progress Bar Card) */}
      {total < 300 && total > 0 && (() => {
        const shortfall = Math.max(0, 300 - total);
        const progressPct = Math.min(100, Math.max(8, Math.round((total / 300) * 100)));
        return (
          <div className="min-order-highlight-card">
            {/* Top row: Label & Shortfall Badge */}
            <div className="min-order-card-header">
              <div className="min-order-title-group">
                <span className="min-order-icon-badge" aria-hidden="true">
                  ₹
                </span>
                <span className="min-order-title-text">
                  Minimum Order ₹300
                </span>
              </div>
              <span className="min-order-chip-shortfall">
                Add ₹{shortfall} More
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="min-order-track-bg">
              <div
                className="min-order-track-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Amount Progress Labels */}
            <div className="min-order-stats-row">
              <span>Current: ₹{total}</span>
              <span>Target: ₹300</span>
            </div>

            {/* Microcopy message */}
            <p className="min-order-notice-text">
              Add posters worth <strong>₹{shortfall}</strong> more to your bag to place this order.
            </p>
          </div>
        );
      })()}

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
            disabled={disabled || (total < 300 && total > 0)}
            onClick={onProceed}
            className="btn-myntra-checkout-black"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              minHeight: '48px',
              backgroundColor: (total < 300 && total > 0) ? '#94a3b8' : '#0f172a',
              color: '#ffffff',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: (disabled || (total < 300 && total > 0)) ? 'not-allowed' : 'pointer',
              opacity: (disabled || (total < 300 && total > 0)) ? 0.75 : 1,
              boxShadow: (total < 300 && total > 0) ? 'none' : '0 4px 14px rgba(15, 23, 42, 0.25)',
              margin: '0',
              padding: '12px 16px',
            }}
          >
            <Lock size={15} className="shrink-0" />
            <span>
              {total < 300 && total > 0
                ? `ADD ₹${300 - total} MORE TO ORDER`
                : proceedLabel}
            </span>
          </button>
          {subtext}
        </div>
      )}
    </div>
  );
}
