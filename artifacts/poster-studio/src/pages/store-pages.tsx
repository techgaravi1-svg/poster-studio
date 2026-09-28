import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  SlidersHorizontal,
  UploadCloud,
  X,
  Check,
  ZoomIn,
  Trash2,
  Pencil,
  Package,
  Users,
  BarChart3,
  CreditCard,
  ShoppingBag,
  Heart,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Square,
  ShieldCheck,
  Truck,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';
import { collections, formatPrice, getProduct, products, searchProducts, type PosterSize, type Product, type Orientation } from '@/lib/catalog';
import { cartTotals, makeOrder, store, useStore, type CartItem, type DemoOrder } from '@/lib/store';
import { PosterArt, ProductCard, Toast } from '@/components/storefront';
import { authService } from '@/services/auth';
import { paymentService } from '@/services/payment';

// Payment Badges Component (UPI, GPay, Paytm, VISA, RuPay)
function PaymentTrustBadges() {
  return (
    <div className="payment-trust-section">
      <div className="payment-trust-label">Secure Checkout With</div>
      <div className="payment-badges-row">
        <span className="badge-payment upi-badge">UPI</span>
        <span className="badge-payment gpay-badge">G Pay</span>
        <span className="badge-payment paytm-badge">Paytm</span>
        <span className="badge-payment visa-badge">VISA</span>
        <span className="badge-payment rupay-badge">RuPay</span>
      </div>
    </div>
  );
}

// Size Chart Modal Component
function SizeChartModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="size-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Poster Size Guide</h3>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="size-chart-content">
          <p className="size-chart-desc">
            All POSTGENZ posters are printed with sharp high-resolution pigment on 350 GSM luxury matte stock.
          </p>
          <div className="size-table-wrap">
            <table className="size-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Centimeters</th>
                  <th>Inches</th>
                  <th>Best For</th>
                </tr>
              </thead>
              <tbody>
                <tr className="highlighted-size-row">
                  <td><strong>A5</strong></td>
                  <td>14.8 × 21.0 cm</td>
                  <td>5.8 × 8.3 in</td>
                  <td>Desk decor, mini gallery walls</td>
                </tr>
                <tr>
                  <td><strong>A4</strong></td>
                  <td>21.0 × 29.7 cm</td>
                  <td>8.3 × 11.7 in</td>
                  <td>Standard frame, bedrooms & study</td>
                </tr>
                <tr>
                  <td><strong>A3</strong></td>
                  <td>29.7 × 42.0 cm</td>
                  <td>11.7 × 16.5 in</td>
                  <td>Statement wall art, living spaces</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" className="button postgenz-btn button-wide" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [toast, setToast] = useState('');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const bestSellers = products.filter((p) => p.bestseller).slice(0, 4);
  const trending = products.filter((p) => p.newArrival || p.collection === 'football').slice(0, 4);

  const notify = (title: string) => {
    setToast(`${title} added to your bag`);
    window.setTimeout(() => setToast(''), 2400);
  };

  const [bannerSlide, setBannerSlide] = useState(0);

  const heroSlides = [
    {
      kicker: 'END OF',
      title: 'SEASON SALE',
      tagline: 'Luxury Decor At Better Prices',
      discount: 'UP TO 60% OFF',
      buttonText: 'SHOP NOW →',
      link: '/collections',
    },
    {
      kicker: 'EXCLUSIVE DROP',
      title: 'POSTER EDITIONS',
      tagline: 'Curated 350 GSM Archival Prints',
      discount: 'UP TO 60% OFF',
      buttonText: 'EXPLORE NOW →',
      link: '/collections/devotional',
    },
    {
      kicker: 'PREMIUM CUSTOM',
      title: 'PHOTOBOOTH STRIPS',
      tagline: 'Turn Your Memories Into Art',
      discount: 'FLAT 60% OFF',
      buttonText: 'DESIGN NOW →',
      link: '/custom',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <main className="postgenz-home-page">
      {/* 1. HD HERO BANNER SLIDER OF 60% */}
      <section className="home-hero-banner-section">
        <div className="hd-banner-slider-container">
          <div className="hd-banner-slide">
            <img
              src="/assets/hd-hero-bg.jpg"
              alt="Luxury Decor Background"
              className="hd-banner-bg-img"
            />
            <div className="hd-banner-overlay-content">
              <span className="hd-kicker">{heroSlides[bannerSlide].kicker}</span>
              <h2 className="hd-title">{heroSlides[bannerSlide].title}</h2>
              <p className="hd-tagline">{heroSlides[bannerSlide].tagline}</p>

              <div className="hd-discount-badge-frame">
                <span className="hd-badge-label">UP TO</span>
                <span className="hd-badge-percent">60% OFF</span>
              </div>

              <Link href={heroSlides[bannerSlide].link} className="hd-shop-now-btn">
                {heroSlides[bannerSlide].buttonText}
              </Link>
            </div>

            {/* Slider Controls */}
            <button
              type="button"
              className="hd-slider-arrow hd-arrow-left"
              aria-label="Previous slide"
              onClick={() => setBannerSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="hd-slider-arrow hd-arrow-right"
              aria-label="Next slide"
              onClick={() => setBannerSlide((prev) => (prev + 1) % heroSlides.length)}
            >
              <ChevronRight size={20} />
            </button>

            {/* Dot Indicators */}
            <div className="hd-slider-dots">
              {heroSlides.map((_, idx) => (
                <button
                  type="button"
                  key={idx}
                  className={`hd-dot ${bannerSlide === idx ? 'dot-active' : ''}`}
                  onClick={() => setBannerSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY ICONS ROW (POSTERS, WALL ART, FLAGS, MIRROR) */}
      <section className="home-categories-row-section">
        <div className="categories-scroll-track">
          {/* 1. Posters (Available & Clickable) */}
          <Link href="/collections" className="cat-icon-card cat-clickable">
            <div className="cat-img-wrap available-ring">
              <img src="/assets/cat-posters.jpg" alt="Posters" className="cat-img" />
            </div>
            <span className="cat-name">Posters</span>
          </Link>

          {/* 2. Wall Art (Coming Soon & Unclickable) */}
          <div className="cat-icon-card cat-disabled" role="region" aria-label="Wall Art Coming Soon">
            <div className="cat-img-wrap disabled-ring">
              <img src="/assets/cat-wall-art.jpg" alt="Wall Art" className="cat-img" />
              <div className="coming-soon-pill-overlay">SOON</div>
            </div>
            <span className="cat-name">Wall Art</span>
            <span className="coming-soon-label">Coming Soon</span>
          </div>

          {/* 3. Flags (Coming Soon & Unclickable) */}
          <div className="cat-icon-card cat-disabled" role="region" aria-label="Flags Coming Soon">
            <div className="cat-img-wrap disabled-ring">
              <img src="/assets/cat-flags.jpg" alt="Flags" className="cat-img" />
              <div className="coming-soon-pill-overlay">SOON</div>
            </div>
            <span className="cat-name">Flags</span>
            <span className="coming-soon-label">Coming Soon</span>
          </div>

          {/* 4. Mirror (Coming Soon & Unclickable) */}
          <div className="cat-icon-card cat-disabled" role="region" aria-label="Mirror Coming Soon">
            <div className="cat-img-wrap disabled-ring">
              <img src="/assets/cat-mirror.jpg" alt="Mirror" className="cat-img" />
              <div className="coming-soon-pill-overlay">SOON</div>
            </div>
            <span className="cat-name">Mirror</span>
            <span className="coming-soon-label">Coming Soon</span>
          </div>
        </div>
      </section>

      {/* 3. SECTION 1: BEST SELLING POSTERS */}
      <section className="home-poster-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading">BEST SELLING POSTERS</h2>
          <span className="stencil-subheading">HOT RIGHT NOW</span>
        </div>

        <div className="poster-carousel-wrap">
          <button
            type="button"
            className="carousel-arrow-btn arrow-prev"
            aria-label="Previous best sellers"
            onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="poster-products-grid four-col-laptop-grid">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} onAdded={notify} />
            ))}
          </div>

          <button
            type="button"
            className="carousel-arrow-btn arrow-next mobile-only-arrow"
            aria-label="Next best sellers"
            onClick={() => setActiveSlideIndex((prev) => prev + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="explore-more-wrap">
          <Link href="/best-sellers" className="btn-explore-more">
            EXPLORE MORE
          </Link>
        </div>
      </section>

      {/* 4. SECTION 2: TRENDING POSTERS */}
      <section className="home-poster-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading">TRENDING POSTERS</h2>
          <span className="stencil-subheading">NEW ARRIVAL</span>
        </div>

        <div className="poster-carousel-wrap">
          <div className="poster-products-grid four-col-laptop-grid">
            {trending.map((product) => (
              <ProductCard key={product.id} product={product} onAdded={notify} />
            ))}
          </div>
        </div>

        <div className="explore-more-wrap">
          <Link href="/collections/football" className="btn-explore-more">
            EXPLORE MORE
          </Link>
        </div>
      </section>

      {/* 5. SECTION 3: DESIGN YOUR OWN */}
      <section className="home-custom-print-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading dark-title">DESIGN YOUR OWN</h2>
          <span className="stencil-subheading dot-subheading">• PREMIUM CUSTOM PRINTS •</span>
        </div>

        <div className="custom-photobooth-preview-card">
          <Link href="/custom" className="photobooth-img-link">
            <img
              src="/assets/custom-photobooth.jpg"
              alt="Custom Photobooth Strip"
              className="photobooth-preview-img"
            />
          </Link>
          <div className="photobooth-details">
            <h3 className="photobooth-title">Custom Photobooth Strip</h3>
            <Link href="/custom" className="btn-design-now">
              DESIGN NOW
            </Link>
          </div>
        </div>

        <div className="custom-pagination-nav">
          <button type="button" className="pagination-arrow" aria-label="Previous page">
            &lt;
          </button>
          <span className="pagination-current">1</span>
          <span className="pagination-total">3</span>
          <button type="button" className="pagination-arrow" aria-label="Next page">
            &gt;
          </button>
        </div>
      </section>

      <Toast message={toast} />
    </main>
  );
}

export function CollectionPage({ bestsellers = false }: { bestsellers?: boolean; [key: string]: any } = {}) {
  const params = useParams<{ slug?: string }>();
  const activeSlug = bestsellers ? 'bestsellers' : params.slug || 'devotional';
  const [viewMode, setViewMode] = useState<'double' | 'single'>('double');
  const [toast, setToast] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('featured');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);

  const notify = (title: string) => {
    setToast(`${title} added to your bag`);
    window.setTimeout(() => setToast(''), 2400);
  };

  const navCategories = [
    { slug: 'devotional', label: 'DEVOTIONAL' },
    { slug: 'marvel-dc', label: 'MARVEL & DC' },
    { slug: 'cricket', label: 'CRICKET' },
    { slug: 'football', label: 'FOOTBALL' },
    { slug: 'all', label: 'ALL POSTERS' },
  ];

  const currentCategoryLabel =
    activeSlug === 'bestsellers'
      ? 'BEST SELLING POSTERS'
      : activeSlug === 'all'
      ? 'ALL POSTERS'
      : collections.find((c) => c.slug === activeSlug)?.title || 'DEVOTIONAL POSTERS';

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeSlug === 'bestsellers') {
      list = products.filter((p) => p.bestseller);
    } else if (activeSlug !== 'all') {
      list = products.filter((p) => p.collection === activeSlug);
    }
    // Also filter by price
    list = list.filter((p) => p.price >= minPrice && p.price <= maxPrice);

    if (selectedSort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (selectedSort === 'high') return [...list].sort((a, b) => b.price - a.price);
    if (selectedSort === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [activeSlug, minPrice, maxPrice, selectedSort]);

  return (
    <main className="postgenz-collection-page">
      {/* 1. TOP TITLE */}
      <div className="collection-top-header">
        <h1 className="collection-main-title">{currentCategoryLabel}</h1>
      </div>

      {/* 2. CATEGORY PILL FILTER TABS */}
      <div className="category-pills-bar">
        <div className="category-pills-scroll">
          {navCategories.map((cat) => {
            const isActive =
              cat.slug === activeSlug ||
              (cat.slug === 'all' && activeSlug === '') ||
              (cat.slug === 'devotional' && !params.slug && !bestsellers);
            const href = cat.slug === 'all' ? '/collections' : `/collections/${cat.slug}`;
            return (
              <Link
                key={cat.slug}
                href={href}
                className={`category-filter-pill ${isActive ? 'pill-active' : ''}`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. FILTER & VIEW BAR */}
      <div className="filter-view-toolbar">
        <button
          type="button"
          className="toolbar-filter-btn"
          onClick={() => setFilterDrawerOpen(true)}
        >
          <SlidersHorizontal size={16} />
          <span>FILTER</span>
        </button>

        <div className="view-mode-toggles">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'single' ? 'active-view' : ''}`}
            aria-label="Single column layout"
            onClick={() => setViewMode('single')}
          >
            <Square size={18} />
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'double' ? 'active-view' : ''}`}
            aria-label="Two column grid layout"
            onClick={() => setViewMode('double')}
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {/* 4. PRODUCT GRID */}
      <section className="collection-products-section">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>No posters found matching this filter.</p>
            <Link href="/collections" className="button postgenz-btn">
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className={`collection-grid-container ${viewMode === 'single' ? 'single-col-grid' : 'four-col-laptop-grid'}`}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdded={notify} />
            ))}
          </div>
        )}
      </section>

      {/* FILTER DRAWER */}
      {filterDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setFilterDrawerOpen(false)}>
          <aside className="filter-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Filter & Sort</h3>
              <button type="button" className="icon-button" onClick={() => setFilterDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="filter-drawer-body">
              <div className="filter-drawer-group">
                <label className="filter-group-label">Sort By</label>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="filter-select-input"
                >
                  <option value="featured">Featured</option>
                  <option value="low">Price: Low to High</option>
                  <option value="high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              <div className="filter-drawer-group">
                <label className="filter-group-label">Max Price: RS. {maxPrice}</label>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <button
                type="button"
                className="button postgenz-btn button-wide"
                onClick={() => setFilterDrawerOpen(false)}
              >
                Apply Filters ({filteredProducts.length} Results)
              </button>
            </div>
          </aside>
        </div>
      )}

      <Toast message={toast} />
    </main>
  );
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProduct(slug) || products[0];
  const [, navigate] = useLocation();
  const [selectedSize, setSelectedSize] = useState<PosterSize>('A5');
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('features');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [toast, setToast] = useState('');

  const toggleAccordion = (name: string) => {
    setOpenAccordion(openAccordion === name ? null : name);
  };

  const handleAddToCart = (buyNow = false) => {
    store.addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      size: selectedSize,
      quantity,
      orientation: product.orientation,
      artTreatment: product.artTreatment,
    });
    if (buyNow) {
      navigate('/checkout');
    } else {
      setToast(`${product.title} added to bag!`);
      window.setTimeout(() => setToast(''), 2400);
    }
  };

  const heroImageSrc = product.images?.[0] || '/assets/spiderman-product-hero.jpg';

  return (
    <main className="postgenz-product-page">
      <div className="product-page-laptop-container">
        {/* 1. MAIN PRODUCT IMAGE WITH BADGE */}
      <section className="product-hero-media-wrap">
        {product.bestseller && (
          <div className="product-badge-overlay">
            <span className="badge-icon">⚡</span> BEST SELLER
          </div>
        )}
        <img
          src={heroImageSrc}
          alt={product.title}
          className="product-hero-real-img"
        />
      </section>

      {/* 2. PRODUCT INFO & DETAILS */}
      <section className="product-primary-details">
        <h1 className="product-page-title">{product.title}</h1>

        <div className="product-stars-row">
          <span className="stars-gold">★★★★★</span>
        </div>

        <div className="product-price-display-row">
          <span className="price-bold">{formatPrice(product.price)}</span>
          <del className="price-strike">{formatPrice(product.compareAtPrice)}</del>
        </div>

        <button
          type="button"
          className="view-size-chart-link"
          onClick={() => setSizeChartOpen(true)}
        >
          View Size Chart →
        </button>

        {/* 3. SIZE SELECTOR */}
        <div className="product-size-section">
          <div className="size-label-heading">SIZE</div>
          <div className="size-pills-row">
            {(['A5', 'A4', 'A3'] as PosterSize[]).map((sz) => (
              <button
                type="button"
                key={sz}
                className={`size-select-pill ${selectedSize === sz ? 'size-active' : ''}`}
                onClick={() => setSelectedSize(sz)}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* 4. QUANTITY STEPPER & ADD TO CART */}
        <div className="quantity-and-add-row">
          <div className="stepper-box">
            <button
              type="button"
              className="stepper-btn"
              aria-label="Decrease quantity"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus size={14} />
            </button>
            <span className="stepper-val">{quantity}</span>
            <button
              type="button"
              className="stepper-btn"
              aria-label="Increase quantity"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            className="btn-add-to-cart-cyan"
            onClick={() => handleAddToCart(false)}
          >
            <ShoppingBag size={18} strokeWidth={2.2} />
            <span>ADD TO CART</span>
          </button>
        </div>

        {/* 5. BUY IT NOW FULL WIDTH */}
        <button
          type="button"
          className="btn-buy-it-now-blue"
          onClick={() => handleAddToCart(true)}
        >
          BUY IT NOW
        </button>

        {/* 6. SECURE CHECKOUT WITH BADGES */}
        <PaymentTrustBadges />

        {/* 7. ACCORDIONS (PRODUCT FEATURES, IMPORTANT NOTES, SHIPPING) */}
        <div className="product-accordions-wrap">
          {/* ACCORDION 1: PRODUCT FEATURES */}
          <div className="accordion-block">
            <button
              type="button"
              className="accordion-toggle-btn"
              onClick={() => toggleAccordion('features')}
            >
              <span>PRODUCT FEATURES</span>
              <span className="accordion-indicator">{openAccordion === 'features' ? '−' : '+'}</span>
            </button>
            {openAccordion === 'features' && (
              <div className="accordion-inner-content">
                <div className="feature-item">
                  <strong>Premium Matte Finish</strong>
                  <p>Sharp, vibrant, and stunning under any light, perfect for showcasing every detail.</p>
                </div>
                <div className="feature-item">
                  <strong>350 GSM Paper</strong>
                  <p>Extra-thick, durable, and premium-grade for a high-quality, luxury feel.</p>
                </div>
                <div className="feature-item">
                  <strong>Vivid Colors</strong>
                  <p>High-quality printing ensures rich tones, crisp details, and long-lasting vibrancy.</p>
                </div>
                <div className="feature-item">
                  <strong>Made to Last</strong>
                  <p>Designed for luxury, style, and durability so your poster stays looking new for years.</p>
                </div>
                <div className="feature-item">
                  <strong>Ready for Framing</strong>
                  <p>Sized to fit standard frames perfectly, giving you a clean, professional display.</p>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: IMPORTANT NOTES */}
          <div className="accordion-block">
            <button
              type="button"
              className="accordion-toggle-btn"
              onClick={() => toggleAccordion('notes')}
            >
              <span>IMPORTANT NOTES</span>
              <span className="accordion-indicator">{openAccordion === 'notes' ? '−' : '+'}</span>
            </button>
            {openAccordion === 'notes' && (
              <div className="accordion-inner-content">
                <div className="feature-item">
                  <strong>No Adhesive Included</strong>
                  <p>Posters do not come with stickers or glue. Please use your own double-sided tape, poster glue, or wall-safe mounting solution.</p>
                </div>
                <div className="feature-item">
                  <strong>Frames Not Included</strong>
                  <p>Posters are sold unframed, but they are fully ready for framing for a polished, gallery-style finish.</p>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: SHIPPING */}
          <div className="accordion-block">
            <button
              type="button"
              className="accordion-toggle-btn"
              onClick={() => toggleAccordion('shipping')}
            >
              <span>SHIPPING</span>
              <span className="accordion-indicator">{openAccordion === 'shipping' ? '−' : '+'}</span>
            </button>
            {openAccordion === 'shipping' && (
              <div className="accordion-inner-content">
                <div className="feature-item">
                  <strong>Order Dispatchment</strong>
                  <p>Orders are processed within 1-2 business days after order confirmation.</p>
                </div>
                <div className="feature-item">
                  <strong>Delivery Timeline</strong>
                  <p>Once dispatched, orders are typically delivered within 7 working days. Delivery times may vary depending on your location and courier partner and, in some cases, may take additional days to arrive.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8. TRUST HIGHLIGHTS */}
        <div className="trust-highlights-list">
          <div className="trust-highlight-row">
            <Truck size={20} className="trust-icon" />
            <span>Free Shipping on Prepaid Orders</span>
          </div>
          <div className="trust-highlight-row">
            <ShieldCheck size={20} className="trust-icon" />
            <span>Free Damage Replacement</span>
          </div>
          <div className="trust-highlight-row">
            <Lock size={20} className="trust-icon" />
            <span>Secure Checkout</span>
          </div>
        </div>

        {/* 9. NOTICE HIGHLIGHT BOX */}
        <div className="notice-highlight-card">
          <h4 className="notice-card-title">No Adhesive Included</h4>
          <p className="notice-card-desc">
            Posters do not come with stickers or glue. Please use your own double-sided tape, poster glue, or wall-safe mounting solution.
          </p>
        </div>
      </section>
    </div>

      {/* SIZE CHART MODAL */}
      <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} />

      <Toast message={toast} />
    </main>
  );
}

export function CustomPage() {
  const [photos, setPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const [frameStyle, setFrameStyle] = useState<'white' | 'black' | 'pink'>('pink');
  const [stripType, setStripType] = useState<'3-strip' | '4-strip'>('3-strip');
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pricePerUnit = stripType === '3-strip' ? 149 : 199;
  const totalPrice = pricePerUnit * quantity;

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const maxPhotos = stripType === '3-strip' ? 3 : 4;
    Array.from(files).slice(0, maxPhotos - photos.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, { id: Math.random().toString(36), url: String(reader.result) }].slice(0, maxPhotos));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddCustomToCart = () => {
    store.addToCart({
      productId: 'custom-photobooth',
      slug: 'custom-photobooth-strip',
      title: `Custom Photobooth Strip (${stripType.toUpperCase()})`,
      price: pricePerUnit,
      size: 'A5',
      quantity,
      orientation: 'portrait',
      artTreatment: 'art-aurora',
      customUpload: {
        name: `Photobooth_${photos.length}_photos`,
        preview: photos[0]?.url || '/assets/custom-photobooth.jpg',
      },
    });
    setToast('Custom Photobooth Strip added to your bag!');
    window.setTimeout(() => setToast(''), 2400);
  };

  return (
    <main className="postgenz-custom-studio">
      <div className="collection-top-header">
        <h1 className="collection-main-title">DESIGN YOUR OWN</h1>
        <p className="collection-sub-text">• PREMIUM CUSTOM PHOTOBOOTH STRIPS •</p>
      </div>

      <div className="custom-studio-content">
        {/* PHOTO STRIP MOCKUP DISPLAY */}
        <div className="photobooth-live-wrapper">
          <div className={`photobooth-strip-frame frame-${frameStyle}`}>
            <div className="strip-header-label">Custom Photobooth Strip</div>
            <div className="strip-slots-column">
              {Array.from({ length: stripType === '3-strip' ? 3 : 4 }).map((_, idx) => (
                <div key={idx} className="strip-photo-slot">
                  {photos[idx] ? (
                    <img src={photos[idx].url} alt={`Upload ${idx + 1}`} className="uploaded-strip-img" />
                  ) : (
                    <button
                      type="button"
                      className="upload-placeholder-slot"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={24} />
                      <span>Photo {idx + 1}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="strip-footer-branding">postgenz</div>
          </div>
        </div>

        {/* CUSTOMIZATION CONTROLS */}
        <div className="custom-options-controls">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            className="button postgenz-btn button-wide"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={18} />
            <span>Upload Your Photos ({photos.length}/{stripType === '3-strip' ? 3 : 4})</span>
          </button>

          {photos.length > 0 && (
            <button
              type="button"
              className="text-button clear-photos-btn"
              onClick={() => setPhotos([])}
            >
              Clear Uploaded Photos
            </button>
          )}

          <div className="control-group">
            <label className="control-label">Strip Format</label>
            <div className="option-pills-row">
              <button
                type="button"
                className={`option-pill ${stripType === '3-strip' ? 'active-pill' : ''}`}
                onClick={() => setStripType('3-strip')}
              >
                Strip of 3 (Classic)
              </button>
              <button
                type="button"
                className={`option-pill ${stripType === '4-strip' ? 'active-pill' : ''}`}
                onClick={() => setStripType('4-strip')}
              >
                Strip of 4 (Deluxe)
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Border Shade</label>
            <div className="option-pills-row">
              <button
                type="button"
                className={`option-pill ${frameStyle === 'pink' ? 'active-pill' : ''}`}
                onClick={() => setFrameStyle('pink')}
              >
                Pastel Rose
              </button>
              <button
                type="button"
                className={`option-pill ${frameStyle === 'white' ? 'active-pill' : ''}`}
                onClick={() => setFrameStyle('white')}
              >
                Classic White
              </button>
              <button
                type="button"
                className={`option-pill ${frameStyle === 'black' ? 'active-pill' : ''}`}
                onClick={() => setFrameStyle('black')}
              >
                Noir Black
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Quantity</label>
            <div className="stepper-box">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="stepper-val">{quantity}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="custom-price-total">
            <span>Price:</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>

          <button
            type="button"
            className="btn-buy-it-now-blue"
            onClick={handleAddCustomToCart}
          >
            ADD TO BAG • {formatPrice(totalPrice)}
          </button>
        </div>
      </div>

      <Toast message={toast} />
    </main>
  );
}

export function CartPage() {
  const [, navigate] = useLocation();
  const { cart, coupon } = useStore();
  const totals = cartTotals(cart, coupon);
  const [couponInput, setCouponInput] = useState(coupon);
  const [couponMessage, setCouponMessage] = useState('');

  const applyCoupon = () => {
    store.setCoupon(couponInput.trim().toUpperCase());
    setCouponMessage(couponInput.trim().toUpperCase() === 'POSTGENZ10' ? '10% discount applied!' : 'Try coupon POSTGENZ10');
  };

  return (
    <main className="postgenz-cart-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">SHOPPING BAG</h1>
      </div>

      {cart.length === 0 ? (
        <div className="empty-state cart-empty">
          <ShoppingBag size={48} className="empty-cart-icon" />
          <h3>Your bag is empty</h3>
          <p>Explore our best-selling posters and custom photobooth strips.</p>
          <Link href="/collections" className="button postgenz-btn">
            Explore Posters <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="cart-container-inner">
          <div className="cart-items-column">
            {cart.map((item) => (
              <div className="cart-card-item" key={item.key}>
                <div className="cart-item-preview">
                  <PosterArt treatment={item.artTreatment} title={item.title} compact />
                </div>
                <div className="cart-item-info">
                  <Link href={`/products/${item.slug}`} className="cart-item-name">
                    {item.title}
                  </Link>
                  <div className="cart-item-meta">Size: {item.size}</div>
                  <div className="cart-item-price-val">{formatPrice(item.price * item.quantity)}</div>
                  <div className="stepper-box compact-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => store.updateQuantity(item.key, item.quantity - 1)}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="stepper-val">{item.quantity}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => store.updateQuantity(item.key, item.quantity + 1)}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="cart-remove-btn"
                  aria-label="Remove item"
                  onClick={() => store.removeFromCart(item.key)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <aside className="cart-summary-card">
            <h3 className="summary-title">Order Summary</h3>
            <div className="coupon-form-row">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Discount Code"
                className="coupon-input"
              />
              <button type="button" className="btn-apply-coupon" onClick={applyCoupon}>
                Apply
              </button>
            </div>
            {couponMessage && <div className="coupon-alert-text">{couponMessage}</div>}

            <div className="summary-lines-table">
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(totals.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <strong className="text-emerald-600">FREE (Prepaid)</strong>
              </div>
              {totals.discount > 0 && (
                <div className="summary-row discount-row">
                  <span>Discount</span>
                  <strong>−{formatPrice(totals.discount)}</strong>
                </div>
              )}
              <div className="summary-row total-highlight">
                <span>Total</span>
                <strong>{formatPrice(totals.total)}</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn-buy-it-now-blue"
              onClick={() => navigate('/checkout')}
            >
              PROCEED TO CHECKOUT
            </button>

            <PaymentTrustBadges />
          </aside>
        </div>
      )}
    </main>
  );
}

export function CheckoutPage() {
  const [, navigate] = useLocation();
  const { cart, coupon } = useStore();
  const totals = cartTotals(cart, coupon);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [error, setError] = useState('');

  const update = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cart.length) {
      setError('Your bag is empty.');
      return;
    }
    if (!form.name || !form.email || !form.phone || !form.address || !form.pincode) {
      setError('Please fill out all required shipping fields.');
      return;
    }

    const order = makeOrder({
      customer: { name: form.name, email: form.email, phone: form.phone },
      address: {
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
      },
      products: cart,
      customUploads: [],
      ...totals,
      paymentStatus: 'paid',
      fulfillmentStatus: 'processing',
    });

    store.addOrder(order);
    navigate(`/checkout/success?order=${order.id}`);
  };

  return (
    <main className="postgenz-checkout-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">SECURE CHECKOUT</h1>
      </div>

      <div className="checkout-content-wrap">
        <form onSubmit={submit} className="checkout-form-column">
          {error && <div className="form-error-banner">{error}</div>}

          <div className="form-card-section">
            <h3 className="section-subheading">Contact Information</h3>
            <div className="input-field-group">
              <label>Full Name *</label>
              <input required value={form.name} onChange={update('name')} placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="input-field-group">
              <label>Email Address *</label>
              <input required type="email" value={form.email} onChange={update('email')} placeholder="rahul@example.com" />
            </div>
            <div className="input-field-group">
              <label>Phone Number *</label>
              <input required type="tel" value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="form-card-section">
            <h3 className="section-subheading">Shipping Address</h3>
            <div className="input-field-group">
              <label>Address *</label>
              <input required value={form.address} onChange={update('address')} placeholder="House/Flat No., Street, Area" />
            </div>
            <div className="two-inputs-row">
              <div className="input-field-group">
                <label>City *</label>
                <input required value={form.city} onChange={update('city')} placeholder="Mumbai" />
              </div>
              <div className="input-field-group">
                <label>State *</label>
                <input required value={form.state} onChange={update('state')} placeholder="Maharashtra" />
              </div>
            </div>
            <div className="two-inputs-row">
              <div className="input-field-group">
                <label>PIN Code *</label>
                <input required value={form.pincode} onChange={update('pincode')} placeholder="400001" />
              </div>
              <div className="input-field-group">
                <label>Country</label>
                <input disabled value="India" />
              </div>
            </div>
          </div>

          <div className="form-card-section">
            <h3 className="section-subheading">Payment Method</h3>
            <div className="payment-options-box">
              <label className="payment-radio-option">
                <input type="radio" name="payment" defaultChecked />
                <span>UPI / QR / Google Pay / PhonePe / Paytm</span>
              </label>
              <label className="payment-radio-option">
                <input type="radio" name="payment" />
                <span>Credit / Debit Card (Visa, RuPay, MasterCard)</span>
              </label>
              <label className="payment-radio-option">
                <input type="radio" name="payment" />
                <span>Cash on Delivery (COD)</span>
              </label>
            </div>
          </div>

          <button type="submit" className="btn-buy-it-now-blue">
            PLACE ORDER • {formatPrice(totals.total)}
          </button>
        </form>

        <aside className="checkout-summary-column">
          <div className="cart-summary-card">
            <h3>Order Summary ({cart.length} items)</h3>
            <div className="checkout-items-list">
              {cart.map((item) => (
                <div key={item.key} className="checkout-mini-item">
                  <span>{item.title} ({item.size}) × {item.quantity}</span>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="summary-lines-table">
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(totals.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <strong className="text-emerald-600">FREE</strong>
              </div>
              <div className="summary-row total-highlight">
                <span>Total</span>
                <strong>{formatPrice(totals.total)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function OrderSuccessPage() {
  const id = new URLSearchParams(window.location.search).get('order');
  const { orders } = useStore();
  const order = orders.find((item) => item.id === id) || orders[0];

  return (
    <main className="postgenz-confirmation-page">
      <div className="confirmation-card-box">
        <div className="success-icon-wrap">
          <Check size={36} />
        </div>
        <h1 className="confirmation-title">Order Confirmed!</h1>
        <p className="confirmation-subtitle">
          Thank you for your order. We are preparing your prints with premium 350 GSM archival paper.
        </p>
        {order && (
          <div className="order-details-box">
            <div className="detail-line">
              <span>Order ID:</span>
              <strong>#{order.id}</strong>
            </div>
            <div className="detail-line">
              <span>Delivery To:</span>
              <strong>{order.customer.name}, {order.address.city}</strong>
            </div>
            <div className="detail-line">
              <span>Amount Paid:</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
            <div className="detail-line">
              <span>Status:</span>
              <span className="badge-status-pill">{order.fulfillmentStatus}</span>
            </div>
          </div>
        )}
        <div className="confirmation-actions">
          <Link href="/collections" className="button postgenz-btn button-wide">
            Continue Shopping
          </Link>
          <Link href="/account/orders" className="button outline button-wide">
            Track Orders
          </Link>
        </div>
      </div>
    </main>
  );
}

export function SearchPage() {
  const [, navigate] = useLocation();
  const initial = new URLSearchParams(window.location.search).get('q') || '';
  const [query, setQuery] = useState(initial);
  const results = searchProducts(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <main className="postgenz-search-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">SEARCH POSTERS</h1>
      </div>

      <div className="search-page-box">
        <form onSubmit={submit} className="postgenz-search-form">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime, spiderman, football, ronaldo..."
          />
          <button type="submit" className="button postgenz-btn">
            Search
          </button>
        </form>

        <div className="search-page-results">
          {initial && (
            <p className="search-count-text">
              Found {results.length} poster{results.length === 1 ? '' : 's'} for “{initial}”
            </p>
          )}
          <div className="collection-grid-container two-column-grid">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export function AccountPage() {
  const { demoUser } = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleAuth = (e: FormEvent) => {
    e.preventDefault();
    store.setDemoUser({ name: name || 'Demo User', email: email || 'user@example.com' });
  };

  return (
    <main className="postgenz-account-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">{demoUser ? 'MY ACCOUNT' : isRegister ? 'REGISTER' : 'LOG IN'}</h1>
      </div>

      <div className="account-card-box">
        {demoUser ? (
          <div className="profile-logged-in">
            <div className="user-avatar-circle">
              {demoUser.name.slice(0, 2).toUpperCase()}
            </div>
            <h3>{demoUser.name}</h3>
            <p className="user-email-text">{demoUser.email}</p>
            <div className="account-quick-links">
              <Link href="/account/orders" className="account-link-btn">
                <Package size={18} />
                <span>My Orders</span>
              </Link>
              <button
                type="button"
                className="button outline button-wide mt-4"
                onClick={() => store.setDemoUser(null)}
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="auth-form-card">
            {isRegister && (
              <div className="input-field-group">
                <label>Your Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
              </div>
            )}
            <div className="input-field-group">
              <label>Email Address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="input-field-group">
              <label>Password</label>
              <input required type="password" placeholder="••••••••" />
            </div>
            <button type="submit" className="button postgenz-btn button-wide">
              {isRegister ? 'Create Account' : 'Log In'}
            </button>
            <div className="auth-toggle-text">
              <button type="button" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? 'Already have an account? Log In' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export function OrdersPage() {
  const { orders } = useStore();
  return (
    <main className="postgenz-orders-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">MY ORDERS</h1>
      </div>
      <div className="orders-list-wrap">
        {orders.length === 0 ? (
          <div className="empty-state">
            <Package size={48} className="empty-cart-icon" />
            <h3>No orders yet</h3>
            <p>Your placed orders will show up here.</p>
            <Link href="/collections" className="button postgenz-btn">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-cards-column">
            {orders.map((order) => (
              <Link href={`/account/orders/${order.id}`} key={order.id} className="order-summary-box">
                <div className="order-header-line">
                  <strong>#{order.id}</strong>
                  <span className="badge-status-pill">{order.fulfillmentStatus}</span>
                </div>
                <div className="order-date-line">
                  {new Date(order.createdAt).toLocaleDateString()} • {order.products.length} Item(s)
                </div>
                <div className="order-total-price">
                  {formatPrice(order.total)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orders } = useStore();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <main className="postgenz-orders-page">
        <div className="empty-state">
          <h3>Order not found</h3>
          <Link href="/account/orders" className="button postgenz-btn">
            Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="postgenz-order-detail-page">
      <div className="collection-top-header">
        <Link href="/account/orders" className="back-link">
          ← Back to Orders
        </Link>
        <h1 className="collection-main-title">ORDER #{order.id}</h1>
      </div>
      <div className="order-details-card">
        <div className="order-meta-grid">
          <div>
            <span className="meta-label">Status</span>
            <span className="badge-status-pill">{order.fulfillmentStatus}</span>
          </div>
          <div>
            <span className="meta-label">Date</span>
            <strong>{new Date(order.createdAt).toLocaleDateString()}</strong>
          </div>
          <div>
            <span className="meta-label">Total Amount</span>
            <strong>{formatPrice(order.total)}</strong>
          </div>
        </div>

        <div className="order-items-table">
          <h4>Items Ordered</h4>
          {order.products.map((p) => (
            <div key={p.key} className="order-item-row">
              <div>
                <strong>{p.title}</strong>
                <span>Size: {p.size} × {p.quantity}</span>
              </div>
              <div>{formatPrice(p.price * p.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="shipping-address-summary">
          <h4>Delivery Address</h4>
          <p>
            {order.customer.name}<br />
            {order.address.address}<br />
            {order.address.city}, {order.address.state} - {order.address.pincode}<br />
            {order.address.country}<br />
            Phone: {order.customer.phone}
          </p>
        </div>
      </div>
    </main>
  );
}

export function AdminPage() {
  const { orders } = useStore();
  return (
    <main className="postgenz-admin-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">STORE ADMIN</h1>
      </div>
      <div className="admin-stats-grid">
        <div className="stat-card">
          <span>Total Orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="stat-card">
          <span>Total Products</span>
          <strong>{products.length}</strong>
        </div>
        <div className="stat-card">
          <span>Active Collections</span>
          <strong>{collections.length}</strong>
        </div>
      </div>
    </main>
  );
}