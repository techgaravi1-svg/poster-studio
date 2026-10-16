import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  SlidersHorizontal,
  UploadCloud,
  X,
  Check,
  Ruler,
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
  Zap,
} from 'lucide-react';
import { collections, formatPrice, getProduct, products, searchProducts, storeCategories, type PosterSize, type Product, type Orientation, type StoreCategory } from '@/lib/catalog';
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

  const bestSellers = products.filter((p) => p.bestseller).slice(0, 6);
  const trending = products.filter((p) => p.newArrival || p.collection === 'football').slice(0, 6);
  const newArrivals = products.filter((p) => p.newArrival || p.collection === 'marvel-dc' || p.tags.includes('sports')).slice(0, 6);

  const customCategories = [
    {
      id: 'photo-strip',
      title: 'Custom Photobooth Strip',
      subtitle: 'Turn your camera roll into aesthetic 3-strip & 4-strip prints',
      image: '/assets/custom-photobooth.jpg',
      link: '/custom?type=strip',
    },
    {
      id: 'mini-pocket',
      title: 'Mini Pocket Photos (Mini Prints)',
      subtitle: 'Cute pocket-sized instant polaroid style keepsake memories',
      image: '/assets/custom-mini-pocket.jpg',
      link: '/custom?type=pocket',
    },
    {
      id: 'custom-posters',
      title: 'Custom Wall Posters',
      subtitle: 'Ultra-HD 350 GSM custom archival gallery prints of your own art',
      image: '/assets/custom-posters.jpg',
      link: '/custom?type=poster',
    },
  ];
  const [customSlideIndex, setCustomSlideIndex] = useState(0);
  const customTrackRef = useRef<HTMLDivElement>(null);

  const handleCustomSlide = (dir: 'prev' | 'next') => {
    const nextIdx =
      dir === 'next'
        ? (customSlideIndex + 1) % customCategories.length
        : customSlideIndex === 0
        ? customCategories.length - 1
        : customSlideIndex - 1;
    setCustomSlideIndex(nextIdx);
    if (customTrackRef.current) {
      const card = customTrackRef.current.children[nextIdx] as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const handleCustomScroll = () => {
    if (!customTrackRef.current) return;
    const scrollLeft = customTrackRef.current.scrollLeft;
    const cardWidth = (customTrackRef.current.firstElementChild as HTMLElement)?.offsetWidth || 300;
    const newIdx = Math.round(scrollLeft / (cardWidth + 16));
    if (newIdx >= 0 && newIdx < customCategories.length && newIdx !== customSlideIndex) {
      setCustomSlideIndex(newIdx);
    }
  };

  const notify = (title: string) => {
    setToast(`${title} added to your bag`);
    window.setTimeout(() => setToast(''), 2400);
  };

  const [bannerSlide, setBannerSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) {
      setBannerSlide((prev) => (prev + 1) % heroSlides.length);
    } else if (diff < -40) {
      setBannerSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
    }
    setTouchStartX(null);
  };

  const heroSlides = [
    {
      kicker: 'END OF',
      title: 'SEASON SALE',
      tagline: 'Luxury Decor At Better Prices',
      discount: 'UP TO 60% OFF',
      buttonText: 'SHOP NOW →',
      link: '/collections',
      bg: '/assets/hd-hero-bg.jpg',
    },
    {
      kicker: 'EXCLUSIVE DROP',
      title: 'POSTER EDITIONS',
      tagline: 'Curated 350 GSM Archival Prints',
      discount: 'UP TO 60% OFF',
      buttonText: 'EXPLORE NOW →',
      link: '/collections/devotional',
      bg: '/assets/hd-hero-bg.jpg',
    },
    {
      kicker: 'PREMIUM CUSTOM',
      title: 'PHOTOBOOTH STRIPS',
      tagline: 'Turn Your Memories Into Art',
      discount: 'FLAT 60% OFF',
      buttonText: 'DESIGN NOW →',
      link: '/custom',
      bg: '/assets/hd-hero-bg.jpg',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <main className="postgenz-home-page">
      {/* 1. HD HERO BANNER SLIDER OF 60% (PAGE 1) */}
      <section className="home-hero-banner-section">
        <div className="hd-banner-slider-container">
          <div
            className="hd-banner-slide"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={heroSlides[bannerSlide].bg}
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

      {/* 2. CATEGORY ICONS ROW (ALL 9 OFFICIAL CATEGORIES - INSTA STORY RINGS) */}
      <section className="home-categories-row-section">
        <div className="categories-scroll-track">
          {storeCategories.map((cat) => {
            if (cat.available) {
              return (
                <Link key={cat.id} href="/collections/posters" className="cat-icon-card cat-clickable">
                  <div className="cat-img-wrap insta-story-ring available-ring">
                    <div className="cat-img-inner">
                      <img src={cat.image} alt={cat.name} className="cat-img" />
                    </div>
                  </div>
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-status-chip active-chip">Available</span>
                </Link>
              );
            }
            return (
              <div
                key={cat.id}
                className="cat-icon-card cat-soon-card not-clickable"
                title={`${cat.name} (Coming Soon)`}
                aria-disabled="true"
              >
                <div className="cat-img-wrap insta-story-ring disabled-ring">
                  <div className="cat-img-inner">
                    <img src={cat.image} alt={cat.name} className="cat-img modern-soon-img" />
                  </div>
                </div>
                <span className="cat-name">{cat.name}</span>
                <span className="cat-status-chip soon-chip">Coming Soon</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. SECTION 1: BEST SELLING POSTERS (SINGLE LINE ON MOBILE - PAGE 3) */}
      <section className="home-poster-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading">BEST SELLING POSTERS</h2>
          <span className="stencil-subheading">HOT RIGHT NOW</span>
        </div>

        <div className="poster-single-line-carousel-wrap">
          <div className="poster-single-line-track">
            {bestSellers.map((product) => (
              <div key={product.id} className="single-line-poster-item">
                <ProductCard product={product} onAdded={notify} />
              </div>
            ))}
          </div>
        </div>

        <div className="explore-more-wrap">
          <Link href="/best-sellers" className="btn-explore-more">
            EXPLORE MORE
          </Link>
        </div>
      </section>

      {/* 4. SECTION 2: TRENDING POSTERS (SINGLE LINE ON MOBILE - PAGE 3) */}
      <section className="home-poster-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading">TRENDING POSTERS</h2>
          <span className="stencil-subheading">NEW ARRIVALS</span>
        </div>

        <div className="poster-single-line-carousel-wrap">
          <div className="poster-single-line-track">
            {trending.map((product) => (
              <div key={product.id} className="single-line-poster-item">
                <ProductCard product={product} onAdded={notify} />
              </div>
            ))}
          </div>
        </div>

        <div className="explore-more-wrap">
          <Link href="/collections/football" className="btn-explore-more">
            EXPLORE MORE
          </Link>
        </div>
      </section>

      {/* 5. SECTION 3: NEW ARRIVALS POSTERS (SINGLE LINE ON MOBILE - PAGE 3) */}
      <section className="home-poster-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading">NEW ARRIVALS POSTERS</h2>
          <span className="stencil-subheading">LATEST DROPS</span>
        </div>

        <div className="poster-single-line-carousel-wrap">
          <div className="poster-single-line-track">
            {newArrivals.map((product) => (
              <div key={product.id} className="single-line-poster-item">
                <ProductCard product={product} onAdded={notify} />
              </div>
            ))}
          </div>
        </div>

        <div className="explore-more-wrap">
          <Link href="/collections/posters" className="btn-explore-more">
            EXPLORE MORE
          </Link>
        </div>
      </section>

      {/* 6. SECTION 4: DESIGN YOUR OWN (3 CUSTOM CATEGORIES - PAGE 4) */}
      <section className="home-custom-print-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading dark-title">DESIGN YOUR OWN</h2>
          <span className="stencil-subheading dot-subheading">• PREMIUM CUSTOM PRINTS •</span>
        </div>

        <div
          className="custom-orders-grid-three"
          ref={customTrackRef}
          onScroll={handleCustomScroll}
        >
          {customCategories.map((item, idx) => (
            <div
              key={item.id}
              className={`custom-photobooth-preview-card ${customSlideIndex === idx ? 'card-active-mobile' : ''}`}
            >
              <Link href={item.link} className="photobooth-img-link">
                <img
                  src={item.image}
                  alt={item.title}
                  className="photobooth-preview-img"
                />
              </Link>
              <div className="photobooth-details">
                <h3 className="photobooth-title">{item.title}</h3>
                <Link href={item.link} className="btn-design-now">
                  DESIGN NOW
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="custom-pagination-nav">
          <button
            type="button"
            className="pagination-arrow"
            aria-label="Previous custom print"
            onClick={() => handleCustomSlide('prev')}
          >
            &lt;
          </button>
          <span className="pagination-current">{customSlideIndex + 1}</span>
          <span className="pagination-slash">/</span>
          <span className="pagination-total">{customCategories.length}</span>
          <button
            type="button"
            className="pagination-arrow"
            aria-label="Next custom print"
            onClick={() => handleCustomSlide('next')}
          >
            &gt;
          </button>
        </div>
      </section>

      <Toast message={toast} />
    </main>
  );
}

const categoryTeasers: Record<string, { title: string; subtitle: string; priceEstimate: string }[]> = {
  paintings: [
    { title: 'Monochrome Texture No. 1', subtitle: 'Heavy Body Acrylic on Gallery Canvas', priceEstimate: 'Rs. 1,499' },
    { title: 'Golden Hour Horizon', subtitle: 'Oil Paint & 24K Leaf Accent', priceEstimate: 'Rs. 1,899' },
    { title: 'Abstract Terra Cotta Wave', subtitle: 'Textured Archival Linen', priceEstimate: 'Rs. 1,299' },
    { title: 'Minimalist Botanical Study', subtitle: 'Ink & Raw Canvas Gallery Wrap', priceEstimate: 'Rs. 1,199' },
  ],
  flags: [
    { title: 'Monaco Grand Prix 1974', subtitle: 'Vintage Motorsport Wall Tapestry', priceEstimate: 'Rs. 499' },
    { title: 'The Great Wave Indigo', subtitle: 'Traditional Japanese Tapestry', priceEstimate: 'Rs. 549' },
    { title: 'Cyberpunk Neo Tokyo Flag', subtitle: 'UV Reactive Aesthetic Wall Flag', priceEstimate: 'Rs. 599' },
    { title: 'Abbey Road Studio Tribute', subtitle: 'Vintage Rock Wall Tapestry', priceEstimate: 'Rs. 499' },
  ],
  'bean-bags': [
    { title: 'Velvet Cloud Lounger XL', subtitle: 'High Density Ergonomic Bean Bag', priceEstimate: 'Rs. 2,499' },
    { title: 'Ribbed Corduroy Slouch Pod', subtitle: 'Ultra-Soft Living Room Lounger', priceEstimate: 'Rs. 2,199' },
    { title: 'Charcoal Gaming Recliner Bag', subtitle: 'With Headrest & Side Pocket', priceEstimate: 'Rs. 2,899' },
    { title: 'Pecan Vegan Leather Lounger', subtitle: 'Waterproof Luxury Aesthetic Bean Bag', priceEstimate: 'Rs. 3,299' },
  ],
  curtains: [
    { title: 'French Washed Linen Sheers', subtitle: 'Natural Daylight Filtering Drape', priceEstimate: 'Rs. 999' },
    { title: 'Sunlit Ochre Cotton Panels', subtitle: 'Textured Semi-Blackout 2-Pack', priceEstimate: 'Rs. 1,299' },
    { title: 'Boho Slub Weave Room Divider', subtitle: 'Heavy Organic Cotton Header', priceEstimate: 'Rs. 1,499' },
    { title: 'Charcoal Minimalist Blackout', subtitle: 'Thermal Insulated Studio Curtains', priceEstimate: 'Rs. 1,699' },
  ],
  mirrors: [
    { title: 'Wavy Ripple Full Body Mirror', subtitle: 'Curved Velvet Frame 160x60cm', priceEstimate: 'Rs. 3,499' },
    { title: 'Minimalist Arch Vanity Mirror', subtitle: 'Brushed Brass Metal Trim', priceEstimate: 'Rs. 1,899' },
    { title: 'Asymmetrical Pebble Wall Mirror', subtitle: 'Beveled Edge Float Mount', priceEstimate: 'Rs. 1,599' },
    { title: 'Sunburst Accent Halo Mirror', subtitle: 'Antique Gold Statement Piece', priceEstimate: 'Rs. 2,199' },
  ],
  tables: [
    { title: 'Nordic Oak Floating Side Table', subtitle: 'Solid White Oak Bedside Accent', priceEstimate: 'Rs. 1,999' },
    { title: 'Smoked Fluted Glass Coffee Table', subtitle: 'Tempered Glass with Matte Black Legs', priceEstimate: 'Rs. 3,999' },
    { title: 'Lucite Minimalist Acrylic Cube', subtitle: 'Ultra Clear Gallery Display Stand', priceEstimate: 'Rs. 2,799' },
    { title: 'Brutalist Concrete Pedestal', subtitle: 'Architectural Accent End Table', priceEstimate: 'Rs. 3,499' },
  ],
  'wall-mounts': [
    { title: 'Solid Oak Floating Print Ledge', subtitle: '100cm Gallery Display Shelf', priceEstimate: 'Rs. 799' },
    { title: 'Brushed Brass Poster Brackets', subtitle: '4-Piece Clamp Display Set', priceEstimate: 'Rs. 599' },
    { title: 'Magnetic Teak Print Hanger Rail', subtitle: 'Quick-Change Poster Frame Bar', priceEstimate: 'Rs. 399' },
    { title: 'Modular Vinyl Record Wall Mounts', subtitle: '6-Pack Clear Acrylic Display', priceEstimate: 'Rs. 699' },
  ],
  'rugs-carpets': [
    { title: 'Moroccan Diamond Berber Rug', subtitle: 'Hand-Tufted Plush Wool 4x6 ft', priceEstimate: 'Rs. 2,999' },
    { title: 'Minimalist Wavy Line Mat', subtitle: 'Non-Slip Bedside Runner 2x5 ft', priceEstimate: 'Rs. 1,199' },
    { title: 'Retro Sage Checkered Area Rug', subtitle: 'Ultra-Soft Low Pile Modern Rug', priceEstimate: 'Rs. 2,499' },
    { title: 'Terracotta Contour Abstract Rug', subtitle: 'Custom Shaped Hand-Carved Rug', priceEstimate: 'Rs. 3,299' },
  ],
};

export function CollectionPage({ bestsellers = false }: { bestsellers?: boolean; [key: string]: any } = {}) {
  const params = useParams<{ slug?: string }>();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<'double' | 'single'>('double');
  const [toast, setToast] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('featured');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [vipContact, setVipContact] = useState('');
  const [vipDone, setVipDone] = useState(false);

  const slugParam = params.slug;
  const matchedCategory = storeCategories.find((c) => c.slug === slugParam);

  useEffect(() => {
    if (matchedCategory && !matchedCategory.available) {
      navigate('/collections/posters', { replace: true });
    }
  }, [matchedCategory, navigate]);

  const activeCategory: StoreCategory = matchedCategory && matchedCategory.available
    ? matchedCategory
    : storeCategories[0]; // Posters by default

  const isPostersActive = true;

  // Active sub-slug for posters
  const activePosterSubSlug = bestsellers
    ? 'bestsellers'
    : slugParam && collections.some((c) => c.slug === slugParam)
    ? slugParam
    : slugParam === 'all'
    ? 'all'
    : 'devotional';

  const notify = (title: string) => {
    setToast(`${title} added to your bag`);
    window.setTimeout(() => setToast(''), 2400);
  };

  const posterSubCategories = [
    { slug: 'devotional', label: 'DEVOTIONAL' },
    { slug: 'marvel-dc', label: 'MARVEL & DC' },
    { slug: 'cricket', label: 'CRICKET' },
    { slug: 'football', label: 'FOOTBALL' },
    { slug: 'all', label: 'ALL POSTERS' },
  ];

  const currentCategoryLabel = !isPostersActive
    ? `${activeCategory.name} — COMING SOON`
    : activePosterSubSlug === 'bestsellers'
    ? 'BEST SELLING POSTERS'
    : activePosterSubSlug === 'all'
    ? 'ALL POSTERS'
    : collections.find((c) => c.slug === activePosterSubSlug)?.title || 'DEVOTIONAL POSTERS';

  const filteredProducts = useMemo(() => {
    if (!isPostersActive) return [];
    let list = products;
    if (activePosterSubSlug === 'bestsellers') {
      list = products.filter((p) => p.bestseller);
    } else if (activePosterSubSlug !== 'all') {
      list = products.filter((p) => p.collection === activePosterSubSlug);
    }
    list = list.filter((p) => p.price >= minPrice && p.price <= maxPrice);

    if (selectedSort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (selectedSort === 'high') return [...list].sort((a, b) => b.price - a.price);
    if (selectedSort === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [isPostersActive, activePosterSubSlug, minPrice, maxPrice, selectedSort]);

  const handleVipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vipContact.trim()) {
      setVipDone(true);
      setToast(`You are on the VIP waitlist for ${activeCategory.name}!`);
      window.setTimeout(() => setToast(''), 3000);
    }
  };

  const teasers = categoryTeasers[activeCategory.slug] || [
    { title: 'Collector Edition Piece 01', subtitle: 'Crafted with premium materials', priceEstimate: 'Coming Soon' },
    { title: 'Collector Edition Piece 02', subtitle: 'Exclusive initial launch batch', priceEstimate: 'Coming Soon' },
    { title: 'Collector Edition Piece 03', subtitle: 'Curated aesthetic studio design', priceEstimate: 'Coming Soon' },
    { title: 'Collector Edition Piece 04', subtitle: 'Limited first run release', priceEstimate: 'Coming Soon' },
  ];

  return (
    <main className="postgenz-collection-page">
      {/* Show category teaser header only for coming soon categories */}
      {!isPostersActive && (
        <div className="collection-top-header">
          <h1 className="collection-main-title">{currentCategoryLabel}</h1>
        </div>
      )}

      {/* 3. CONDITIONAL CONTENT: POSTERS (ACTIVE) VS OTHER CATEGORIES (COMING SOON) */}
      {isPostersActive ? (
        <>
          {/* POSTER SUB-CATEGORY FILTER TABS */}
          <div className="category-pills-bar">
            <div className="category-pills-scroll">
              {posterSubCategories.map((sub) => {
                const isActive =
                  sub.slug === activePosterSubSlug ||
                  (sub.slug === 'all' && activePosterSubSlug === '') ||
                  (sub.slug === 'devotional' && !params.slug && !bestsellers);
                const href = sub.slug === 'all' ? '/collections/posters' : `/collections/${sub.slug}`;
                return (
                  <Link
                    key={sub.slug}
                    href={href}
                    className={`category-filter-pill ${isActive ? 'pill-active' : ''}`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* FILTER & VIEW TOOLBAR */}
          <div className="filter-view-toolbar">
            <button
              type="button"
              className="toolbar-filter-btn"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <SlidersHorizontal size={16} />
              <span>FILTER & SORT</span>
            </button>

            <span className="text-xs font-semibold text-gray-500">
              {filteredProducts.length} POSTERS AVAILABLE
            </span>

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

          {/* POSTERS PRODUCT GRID */}
          <section className="collection-products-section">
            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                <p>No posters found matching this filter.</p>
                <Link href="/collections/posters" className="button postgenz-btn">
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
        </>
      ) : (
        /* COMING SOON CATEGORY SHOWCASE */
        <section className="category-coming-soon-showcase">
          <div className="cs-hero-card">
            <div className="cs-hero-img-wrap">
              <img
                src={activeCategory.image}
                alt={activeCategory.name}
                className="cs-hero-img"
              />
              <div className="cs-glass-badge">
                COMING SOON
              </div>
            </div>

            <div className="cs-hero-body">
              <div className="cs-kicker-badge">
                <Sparkles size={13} />
                <span>PRE-LAUNCH DROP • IN DEVELOPMENT</span>
              </div>
              <h2 className="cs-hero-title">{activeCategory.name} Collection</h2>
              <p className="cs-hero-desc">
                {activeCategory.description || `Our master-crafted ${activeCategory.name} lineup is currently in production. We are curating the finest materials and designs to bring you aesthetic perfection.`}
              </p>

              <div className="cs-features-list">
                <div className="cs-feature-item">
                  <Check size={16} className="text-emerald-600" />
                  <span>Curated luxury materials & master design craftsmanship</span>
                </div>
                <div className="cs-feature-item">
                  <Check size={16} className="text-emerald-600" />
                  <span>Flat 15% VIP Early-Bird launch discount code</span>
                </div>
                <div className="cs-feature-item">
                  <Check size={16} className="text-emerald-600" />
                  <span>First access notification before public drop</span>
                </div>
              </div>

              <div className="cs-vip-box">
                <div className="cs-vip-prompt">Get Notified When {activeCategory.name} Launches:</div>
                {vipDone ? (
                  <div className="cs-vip-success">
                    <Check size={18} />
                    <span>You're on the VIP waitlist! We will notify you first when {activeCategory.name} drops.</span>
                  </div>
                ) : (
                  <form onSubmit={handleVipSubmit} className="cs-vip-form">
                    <input
                      type="text"
                      placeholder="Enter your email or WhatsApp number"
                      value={vipContact}
                      onChange={(e) => setVipContact(e.target.value)}
                      required
                      className="cs-vip-input"
                    />
                    <button type="submit" className="cs-vip-btn">
                      Notify Me
                    </button>
                  </form>
                )}
              </div>

              <div className="cs-action-row">
                <Link href="/collections/posters" className="btn-back-to-posters">
                  Explore Posters (Available Now) →
                </Link>
              </div>
            </div>
          </div>

          {/* TEASERS PREVIEW GRID */}
          <div className="cs-teasers-section">
            <div className="cs-teasers-header">
              <h3 className="cs-teasers-title">Upcoming {activeCategory.name} Teasers</h3>
              <p className="cs-teasers-subtitle">Sneak peek preview of designs dropping in our initial launch batch</p>
            </div>

            <div className="cs-teasers-grid">
              {teasers.map((teaser, idx) => (
                <div key={idx} className="cs-teaser-card">
                  <div className="cs-teaser-thumb-wrap">
                    <img
                      src={activeCategory.image}
                      alt={teaser.title}
                      className="cs-teaser-bg-img"
                    />
                    <div className="cs-teaser-badge-overlay">
                      <span className="cs-teaser-badge">COMING SOON</span>
                    </div>
                  </div>
                  <div className="cs-teaser-body">
                    <strong className="cs-teaser-item-title">{teaser.title}</strong>
                    <span className="cs-teaser-item-sub">{teaser.subtitle}</span>
                    <span className="cs-teaser-price-est">Est: {teaser.priceEstimate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FILTER & SORT BOTTOM SHEET / DRAWER */}
      {filterDrawerOpen && (
        <div className="filter-drawer-backdrop" onClick={() => setFilterDrawerOpen(false)}>
          <aside className="filter-drawer-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="filter-sheet-drag-handle" aria-hidden="true" />

            <div className="filter-sheet-header">
              <div className="filter-sheet-title">
                <SlidersHorizontal size={18} className="text-gray-900" />
                <span>FILTER & SORT</span>
              </div>
              <div className="filter-sheet-header-actions">
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={() => {
                    setSelectedSort('featured');
                    setMaxPrice(1000);
                    setMinPrice(0);
                  }}
                >
                  Reset All
                </button>
                <button
                  type="button"
                  className="filter-close-btn"
                  onClick={() => setFilterDrawerOpen(false)}
                  aria-label="Close filters"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="filter-sheet-body">
              {/* 1. SORT BY OPTIONS */}
              <div className="filter-section">
                <label className="filter-section-title">SORT POSTERS BY</label>
                <div className="filter-pills-grid">
                  {[
                    { id: 'featured', label: 'Featured' },
                    { id: 'low', label: 'Price: Low to High' },
                    { id: 'high', label: 'Price: High to Low' },
                    { id: 'rating', label: 'Highest Rated' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`filter-choice-pill ${selectedSort === opt.id ? 'active-choice' : ''}`}
                      onClick={() => setSelectedSort(opt.id)}
                    >
                      <span>{opt.label}</span>
                      {selectedSort === opt.id && <Check size={14} className="choice-check" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. PRICE RANGE */}
              <div className="filter-section">
                <div className="filter-section-header-row">
                  <label className="filter-section-title">PRICE BUDGET</label>
                  <span className="filter-price-highlight">
                    {maxPrice >= 1000 ? 'All Prices' : `Up to ₹${maxPrice}`}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="filter-presets-row">
                  {[
                    { label: 'All', max: 1000 },
                    { label: 'Under ₹150', max: 150 },
                    { label: 'Under ₹250', max: 250 },
                    { label: 'Under ₹500', max: 500 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`preset-pill ${maxPrice === preset.max ? 'preset-active' : ''}`}
                      onClick={() => setMaxPrice(preset.max)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Interactive Slider */}
                <div className="filter-slider-wrap">
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="filter-range-input"
                  />
                  <div className="slider-range-labels">
                    <span>₹50</span>
                    <span>₹1,000+</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-sheet-footer">
              <button
                type="button"
                className="btn-apply-filters"
                onClick={() => setFilterDrawerOpen(false)}
              >
                SHOW {filteredProducts.length} {filteredProducts.length === 1 ? 'POSTER' : 'POSTERS'}
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
  const { wishlist = [] } = useStore();
  const [selectedSize, setSelectedSize] = useState<PosterSize>('A5');
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('features');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const isWishlisted = wishlist.includes(product.slug) || wishlist.includes(product.id);

  const toggleWishlist = () => {
    const added = store.toggleWishlist(product.slug);
    setToast(added ? `${product.title} saved to Wishlist!` : 'Removed from Wishlist');
    window.setTimeout(() => setToast(''), 2400);
  };

  const similarProducts = useMemo(() => {
    const list = products.filter((p) => p.id !== product.id);
    const sameCategory = list.filter((p) => p.category === product.category || p.collection === product.collection);
    const others = list.filter((p) => p.category !== product.category && p.collection !== product.collection);
    return [...sameCategory, ...others].slice(0, 4);
  }, [product.id, product.category, product.collection]);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '4px 0 12px' }}>
          <button
            type="button"
            className="view-size-chart-link"
            onClick={() => setSizeChartOpen(true)}
          >
            View Size Chart →
          </button>
        </div>

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

        {/* 4. QUANTITY STEPPER & ADD TO CART & WISHLIST */}
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

          <button
            type="button"
            className={`btn-wishlist-pdp ${isWishlisted ? 'wishlist-active' : ''}`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            onClick={toggleWishlist}
            title={isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}
          >
            <Heart size={20} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#111827'} />
          </button>
        </div>

        {/* 5. BUY IT NOW FULL WIDTH */}
        <button
          type="button"
          className="btn-buy-it-now-blue"
          onClick={() => handleAddToCart(true)}
        >
          <Zap size={18} strokeWidth={2.4} />
          <span>BUY NOW • FAST CHECKOUT</span>
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
              <span>SHIPPING &amp; DELIVERY</span>
              <span className="accordion-indicator">{openAccordion === 'shipping' ? '−' : '+'}</span>
            </button>
            {openAccordion === 'shipping' && (
              <div className="accordion-inner-content">
                <div className="feature-item">
                  <strong>Order Dispatchment</strong>
                  <p>Orders are processed within 1–2 business days after order confirmation.</p>
                </div>
                <div className="feature-item">
                  <strong>Delivery Timeline</strong>
                  <p>Standard delivery within India takes 7–8 business days (may vary depending on courier and location).</p>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 4: CUSTOMER FAQs & RETURNS */}
          <div className="accordion-block">
            <button
              type="button"
              className="accordion-toggle-btn"
              onClick={() => toggleAccordion('faqs')}
            >
              <span>CUSTOMER FAQs &amp; POLICIES</span>
              <span className="accordion-indicator">{openAccordion === 'faqs' ? '−' : '+'}</span>
            </button>
            {openAccordion === 'faqs' && (
              <div className="accordion-inner-content">
                <div className="feature-item">
                  <strong>Materials &amp; Print</strong>
                  <p>Printed on premium 250–300 GSM matte paper with durable, edge-to-edge printing (no white borders).</p>
                </div>
                <div className="feature-item">
                  <strong>Return &amp; Replacement Policy</strong>
                  <p>We do not offer returns on poster orders. Replacements are provided if damaged, defective, or incorrect. Must submit a clear unboxing video within 48 hours of delivery to dungeons.support@gmail.com.</p>
                </div>
                <div className="feature-item">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                    <Link href="/faqs" style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px', textDecoration: 'underline' }}>
                      Read All 10 Customer FAQs →
                    </Link>
                    <Link href="/returns" style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px', textDecoration: 'underline' }}>
                      Return &amp; Refund Policy →
                    </Link>
                    <Link href="/terms" style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px', textDecoration: 'underline' }}>
                      Website Terms →
                    </Link>
                  </div>
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

      {/* 10. YOU MAY ALSO LIKE / SIMILAR PRODUCTS (PAGE 7) */}
      <section className="product-similar-section">
        <div className="poster-section-header">
          <h2 className="stencil-heading">YOU MAY ALSO LIKE</h2>
          <span className="stencil-subheading">SIMILAR POSTERS YOU MIGHT LOVE</span>
        </div>

        <div className="similar-products-row-wrap">
          <div className="similar-products-grid">
            {similarProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdded={(title) => {
                  setToast(`${title} added to your bag`);
                  window.setTimeout(() => setToast(''), 2400);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO APPLY OFFER MODAL */}
      {offerModalOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setOfferModalOpen(false)}>
          <div
            className="filter-drawer-bottom-sheet"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="filter-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎁</span>
                <span className="filter-drawer-title">HOW TO APPLY LIVE OFFERS</span>
              </div>
              <button
                type="button"
                className="filter-close-btn"
                onClick={() => setOfferModalOpen(false)}
                aria-label="Close offers"
              >
                ✕
              </button>
            </div>
            <div className="filter-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                <strong style={{ color: '#15803d', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
                  🔥 Live Poster Deals:
                </strong>
                <ul style={{ fontSize: '13px', color: '#166534', listStyleType: 'disc', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>BUY 2 GET 1 FREE</strong> (Add any 3 posters to bag)</li>
                  <li><strong>BUY 3 GET 2 FREE</strong> (Add any 5 posters to bag)</li>
                </ul>
              </div>

              <div>
                <strong style={{ fontSize: '13px', color: '#18181b', display: 'block', marginBottom: '6px' }}>
                  How to check if your offer is applied:
                </strong>
                <ol style={{ fontSize: '13px', color: '#4b5563', listStyleType: 'decimal', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Choose your preferred posters based on your budget and wall space.</li>
                  <li>Add them to your cart.</li>
                  <li>Open your cart and verify that the discounted price is visible and the correct total number of posters has been added.</li>
                </ol>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontSize: '12.5px', color: '#64748b' }}>
                💡 Need assistance or custom sizes? Reach us anytime at{' '}
                <a href="mailto:dungeons.support@gmail.com" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
                  dungeons.support@gmail.com
                </a>
              </div>
            </div>
            <div className="filter-drawer-footer">
              <button
                type="button"
                className="filter-apply-btn"
                onClick={() => setOfferModalOpen(false)}
              >
                GOT IT, SHOP NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIZE CHART MODAL */}
      <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} />

      <Toast message={toast} />
    </main>
  );
}

export function CustomPage() {
  const [location] = useLocation();
  const [toast, setToast] = useState('');

  // Check initial type from query params or URL
  const getUrlType = (): 'strip' | 'pocket' | 'poster' | null => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('type');
      if (t === 'strip' || t === 'pocket' || t === 'poster') return t;
    } catch { /* ignore */ }
    return null;
  };

  const [selectedType, setSelectedType] = useState<'strip' | 'pocket' | 'poster' | null>(getUrlType);

  useEffect(() => {
    const t = getUrlType();
    if (t) setSelectedType(t);
  }, [location]);

  const selectFormat = (type: 'strip' | 'pocket' | 'poster') => {
    setSelectedType(type);
    window.history.pushState(null, '', `/custom?type=${type}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBackToHub = () => {
    setSelectedType(null);
    window.history.pushState(null, '', '/custom');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. PHOTO STRIP STATE
  const [stripPhotos, setStripPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const [stripFormat, setStripFormat] = useState<'3-strip' | '4-strip'>('3-strip');
  const [stripFrameStyle, setStripFrameStyle] = useState<'pink' | 'white' | 'black' | 'lilac' | 'mint'>('pink');
  const [stripQuantity, setStripQuantity] = useState(1);
  const stripInputRef = useRef<HTMLInputElement>(null);
  const stripSingleInputRef = useRef<HTMLInputElement>(null);
  const [activeStripSlot, setActiveStripSlot] = useState<number | null>(null);

  const stripPricePerUnit = stripFormat === '3-strip' ? 149 : 199;
  const stripTotalPrice = stripPricePerUnit * stripQuantity;

  // 2. MINI POCKET PHOTOS STATE (5 OR 7 UPLOAD IMAGES)
  const [pocketPack, setPocketPack] = useState<'5-pack' | '7-pack'>('5-pack');
  const maxPocketPhotos = pocketPack === '5-pack' ? 5 : 7;
  const [pocketPhotos, setPocketPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const [pocketFrameStyle, setPocketFrameStyle] = useState<'white' | 'cream' | 'black' | 'pink'>('white');
  const [pocketQuantity, setPocketQuantity] = useState(1);
  const pocketInputRef = useRef<HTMLInputElement>(null);
  const pocketSingleInputRef = useRef<HTMLInputElement>(null);
  const [activePocketSlot, setActivePocketSlot] = useState<number | null>(null);

  const pocketPricePerPack = pocketPack === '5-pack' ? 129 : 169;
  const pocketTotalPrice = pocketPricePerPack * pocketQuantity;

  // 3. CUSTOM WALL POSTER / WALLPAPER STATE (IMAGE, ORIENTATION, SIZE, QUANTITY)
  const [posterPhoto, setPosterPhoto] = useState<string | null>(null);
  const [posterOrientation, setPosterOrientation] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [posterSize, setPosterSize] = useState<'A5' | 'A4' | 'A3'>('A5');
  const [posterQuantity, setPosterQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const posterSizePrices: Record<'A5' | 'A4' | 'A3', number> = {
    A5: 129,
    A4: 199,
    A3: 299,
  };
  const posterUnitCost = posterSizePrices[posterSize];
  const posterTotalPrice = posterUnitCost * posterQuantity;

  // UPLOAD HANDLERS
  const handleStripBulkUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const maxPhotos = stripFormat === '3-strip' ? 3 : 4;
    Array.from(files).slice(0, maxPhotos - stripPhotos.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setStripPhotos((prev) => [...prev, { id: Math.random().toString(36), url: String(reader.result) }].slice(0, maxPhotos));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStripSingleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeStripSlot === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      setStripPhotos((prev) => {
        const next = [...prev];
        next[activeStripSlot] = { id: Math.random().toString(36), url: String(reader.result) };
        return next;
      });
      setActiveStripSlot(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePocketBulkUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    Array.from(files).slice(0, maxPocketPhotos - pocketPhotos.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPocketPhotos((prev) => [...prev, { id: Math.random().toString(36), url: String(reader.result) }].slice(0, maxPocketPhotos));
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePocketSingleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activePocketSlot === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPocketPhotos((prev) => {
        const next = [...prev];
        next[activePocketSlot] = { id: Math.random().toString(36), url: String(reader.result) };
        return next;
      });
      setActivePocketSlot(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePosterUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPosterPhoto(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  // ADD TO CART HANDLERS WITH VALIDATION, DETAILED METADATA & CLEAN RESET
  const handleAddStripToCart = () => {
    if (stripPhotos.length === 0) {
      setToast('Please upload at least 1 photo for your photobooth strip before adding to bag!');
      window.setTimeout(() => setToast(''), 3000);
      return;
    }
    const borderName = stripFrameStyle.charAt(0).toUpperCase() + stripFrameStyle.slice(1);
    store.addToCart({
      productId: 'custom-photobooth',
      slug: 'custom-photobooth-strip',
      title: `Custom Photobooth Strip (${stripPhotos.length} Photos • ${borderName} Border)`,
      price: stripPricePerUnit,
      size: 'A5',
      quantity: stripQuantity,
      orientation: 'portrait',
      artTreatment: 'art-aurora',
      customUpload: {
        name: `Photobooth_${stripPhotos.length}_${Date.now()}`,
        preview: stripPhotos[0]?.url || '/assets/custom-photobooth.jpg',
        photos: stripPhotos.map((p) => p.url),
        borderStyle: stripFrameStyle,
        customType: 'Photobooth Strip',
        format: stripFormat,
      },
    });
    setToast(`${stripQuantity} × Custom Photobooth Strip added to bag! Ready for another order.`);
    // Reset builder to blank state
    setStripPhotos([]);
    setStripQuantity(1);
    setActiveStripSlot(null);
    window.setTimeout(() => setToast(''), 3000);
  };

  const handleAddPocketToCart = () => {
    if (pocketPhotos.length === 0) {
      setToast('Please upload photos for your mini pocket prints before adding to bag!');
      window.setTimeout(() => setToast(''), 3000);
      return;
    }
    const borderName = pocketFrameStyle.charAt(0).toUpperCase() + pocketFrameStyle.slice(1);
    store.addToCart({
      productId: 'custom-mini-pocket',
      slug: 'custom-mini-pocket-photos',
      title: `Mini Pocket Photos (${pocketPhotos.length} Photos • ${borderName} Border)`,
      price: pocketPricePerPack,
      size: 'A5',
      quantity: pocketQuantity,
      orientation: 'portrait',
      artTreatment: 'art-pulse',
      customUpload: {
        name: `MiniPocket_${pocketPhotos.length}_${Date.now()}`,
        preview: pocketPhotos[0]?.url || '/assets/custom-mini-pocket.jpg',
        photos: pocketPhotos.map((p) => p.url),
        borderStyle: pocketFrameStyle,
        customType: 'Mini Pocket Photos',
        format: pocketPack,
      },
    });
    setToast(`${pocketQuantity} × Mini Pocket Photos added to bag! Ready for another order.`);
    // Reset builder to blank state
    setPocketPhotos([]);
    setPocketQuantity(1);
    setActivePocketSlot(null);
    window.setTimeout(() => setToast(''), 3000);
  };

  const handleAddPosterToCart = () => {
    if (!posterPhoto) {
      setToast('Please upload a photo for your custom wall poster before adding to bag!');
      window.setTimeout(() => setToast(''), 3000);
      return;
    }
    store.addToCart({
      productId: 'custom-wall-poster',
      slug: 'custom-wall-poster',
      title: `Custom Wall Poster (${posterSize} • ${posterOrientation.toUpperCase()})`,
      price: posterUnitCost,
      size: posterSize,
      quantity: 1,
      orientation: posterOrientation,
      artTreatment: 'art-signal',
      customUpload: {
        name: `Poster_${posterSize}_${Date.now()}`,
        preview: posterPhoto,
        customType: 'Custom Wall Poster',
        format: posterSize,
      },
    });
    setToast(`Custom Wall Poster (${posterSize}) added to bag! Ready for another order.`);
    // Reset builder to blank state
    setPosterPhoto(null);
    setPosterOrientation('portrait');
    setPosterSize('A4');
    window.setTimeout(() => setToast(''), 3000);
  };

  const handleNewPosterOrder = () => {
    setPosterPhoto(null);
    setPosterOrientation('portrait');
    setPosterSize('A5');
    setPosterQuantity(1);
    setToast('Ready for new custom poster order!');
    window.setTimeout(() => setToast(''), 2000);
  };

  // IF NO PRODUCT IS SELECTED: RENDER THE 3 BOXES
  if (!selectedType) {
    return (
      <main className="postgenz-custom-studio">
        <div className="collection-top-header">
          <h1 className="collection-main-title">DESIGN YOUR OWN</h1>
          <p className="collection-sub-text">• SELECT YOUR CUSTOM PRODUCT FORMAT •</p>
        </div>

        <div className="custom-boxes-selection-grid">
          {/* Box 1: Custom Photobooth Strip */}
          <div className="custom-selection-box-card">
            <div className="box-media-wrap">
              <img src="/assets/custom-photobooth.jpg" alt="Custom Photobooth Strip" className="box-thumb-img" />
              <span className="box-tag-pill">HOT FAVORITE</span>
            </div>
            <div className="box-body-wrap">
              <h2 className="box-title">Custom Photobooth Strip</h2>
              <p className="box-desc">
                Turn your best moments into vintage photobooth strips. Choose 3 or 4 photos with aesthetic borders.
              </p>
              <div className="box-footer-row">
                <span className="box-price-hint">Starting from Rs. 149</span>
                <button
                  type="button"
                  className="btn-design-now-highlight"
                  onClick={() => selectFormat('strip')}
                >
                  DESIGN NOW →
                </button>
              </div>
            </div>
          </div>

          {/* Box 2: Mini Pocket Photos (Mini Prints) */}
          <div className="custom-selection-box-card">
            <div className="box-media-wrap">
              <img src="/assets/custom-mini-pocket.jpg" alt="Mini Pocket Photos" className="box-thumb-img" />
              <span className="box-tag-pill">POCKET MEMORIES</span>
            </div>
            <div className="box-body-wrap">
              <h2 className="box-title">Mini Pocket Photos (Mini Prints)</h2>
              <p className="box-desc">
                Aesthetic wallet & pocket-sized instant photo prints. Select 5 or 7 photos to print as a cute pack.
              </p>
              <div className="box-footer-row">
                <span className="box-price-hint">Starting from Rs. 129</span>
                <button
                  type="button"
                  className="btn-design-now-highlight"
                  onClick={() => selectFormat('pocket')}
                >
                  DESIGN NOW →
                </button>
              </div>
            </div>
          </div>

          {/* Box 3: Custom Wall Posters / Wallpaper */}
          <div className="custom-selection-box-card">
            <div className="box-media-wrap">
              <img src="/assets/custom-posters.jpg" alt="Custom Wall Posters" className="box-thumb-img" />
              <span className="box-tag-pill">350 GSM ARCHIVAL</span>
            </div>
            <div className="box-body-wrap">
              <h2 className="box-title">Custom Wall Posters</h2>
              <p className="box-desc">
                Your own photos, personal digital art, or wallpaper mural printed with archival quality.
              </p>
              <div className="box-footer-row">
                <span className="box-price-hint">Starting from Rs. 129</span>
                <button
                  type="button"
                  className="btn-design-now-highlight"
                  onClick={() => selectFormat('poster')}
                >
                  DESIGN NOW →
                </button>
              </div>
            </div>
          </div>
        </div>

        <Toast message={toast} />
      </main>
    );
  }

  // IF PRODUCT IS SELECTED: RENDER DEDICATED CUSTOMIZER
  return (
    <main className="postgenz-custom-studio">
      <div className="customizer-top-bar">
        <button type="button" className="btn-back-hub" onClick={goBackToHub}>
          <ArrowLeft size={16} />
          <span>All Custom Products</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. CUSTOM PHOTOBOOTH STRIP CUSTOMIZER */}
      {/* ======================================================== */}
      {selectedType === 'strip' && (
        <div className="custom-studio-content">
          <div className="photobooth-live-wrapper">
            <div className={`photobooth-strip-frame frame-${stripFrameStyle}`}>
              <div className="strip-header-label">Custom Photobooth Strip</div>
              <div className="strip-slots-column">
                {Array.from({ length: stripFormat === '3-strip' ? 3 : 4 }).map((_, idx) => (
                  <div key={idx} className="strip-photo-slot">
                    {stripPhotos[idx] ? (
                      <div className="uploaded-slot-wrap">
                        <img src={stripPhotos[idx].url} alt={`Upload ${idx + 1}`} className="uploaded-strip-img" />
                        <button
                          type="button"
                          className="btn-slot-replace"
                          title="Change this photo"
                          onClick={() => {
                            setActiveStripSlot(idx);
                            stripSingleInputRef.current?.click();
                          }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="upload-placeholder-slot"
                        onClick={() => {
                          setActiveStripSlot(idx);
                          stripSingleInputRef.current?.click();
                        }}
                      >
                        <UploadCloud size={22} />
                        <span>Photo {idx + 1}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="strip-footer-branding">postgenz</div>
            </div>
          </div>

          <div className="custom-options-controls">
            <h2 className="editor-heading">Customize Photobooth Strip</h2>
            <p className="editor-subheading">Upload 3 or 4 photos and order multiple copies of your strip</p>

            <input
              ref={stripInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleStripBulkUpload}
              className="hidden"
            />
            <input
              ref={stripSingleInputRef}
              type="file"
              accept="image/*"
              onChange={handleStripSingleUpload}
              className="hidden"
            />

            <button
              type="button"
              className="button postgenz-btn button-wide"
              onClick={() => stripInputRef.current?.click()}
            >
              <UploadCloud size={18} />
              <span>Upload Photos ({stripPhotos.length}/{stripFormat === '3-strip' ? 3 : 4})</span>
            </button>

            {stripPhotos.length > 0 && (
              <button
                type="button"
                className="text-button clear-photos-btn"
                onClick={() => setStripPhotos([])}
              >
                Clear All Uploaded Photos
              </button>
            )}

            <div className="control-group">
              <label className="control-label">Strip Format</label>
              <div className="option-pills-row">
                <button
                  type="button"
                  className={`option-pill ${stripFormat === '3-strip' ? 'active-pill' : ''}`}
                  onClick={() => setStripFormat('3-strip')}
                >
                  Strip of 3 (Rs. 149)
                </button>
                <button
                  type="button"
                  className={`option-pill ${stripFormat === '4-strip' ? 'active-pill' : ''}`}
                  onClick={() => setStripFormat('4-strip')}
                >
                  Strip of 4 (Rs. 199)
                </button>
              </div>
            </div>

            <div className="control-group">
              <label className="control-label">Border Shade</label>
              <div className="option-pills-row">
                <button
                  type="button"
                  className={`option-pill ${stripFrameStyle === 'pink' ? 'active-pill' : ''}`}
                  onClick={() => setStripFrameStyle('pink')}
                >
                  Pastel Rose
                </button>
                <button
                  type="button"
                  className={`option-pill ${stripFrameStyle === 'white' ? 'active-pill' : ''}`}
                  onClick={() => setStripFrameStyle('white')}
                >
                  Classic White
                </button>
                <button
                  type="button"
                  className={`option-pill ${stripFrameStyle === 'black' ? 'active-pill' : ''}`}
                  onClick={() => setStripFrameStyle('black')}
                >
                  Noir Black
                </button>
              </div>
            </div>

            {/* QUANTITY STEPPER (ORDER MULTIPLE ITEMS WITH SAME IMAGES) */}
            <div className="control-group">
              <label className="control-label">Number of Copies (Quantity)</label>
              <div className="stepper-box">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setStripQuantity(Math.max(1, stripQuantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="stepper-val">{stripQuantity}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setStripQuantity(stripQuantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="quantity-hint-text">
                Order multiple strips with your uploaded photos for friends & family
              </span>
            </div>

            <div className="custom-price-total">
              <span>Total Price:</span>
              <strong>{formatPrice(stripTotalPrice)}</strong>
            </div>

            <button
              type="button"
              className="btn-buy-it-now-blue"
              onClick={handleAddStripToCart}
            >
              ADD TO BAG • {formatPrice(stripTotalPrice)}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MINI POCKET PHOTOS CUSTOMIZER (5 AND 7 UPLOADS) */}
      {/* ======================================================== */}
      {selectedType === 'pocket' && (
        <div className="custom-studio-content">
          <div className="pocket-preview-container">
            <div className="pocket-preview-card-grid">
              {Array.from({ length: maxPocketPhotos }).map((_, idx) => (
                <div key={idx} className={`pocket-mini-card frame-${pocketFrameStyle}`}>
                  <div className="mini-photo-inner">
                    {pocketPhotos[idx] ? (
                      <div className="uploaded-slot-wrap">
                        <img src={pocketPhotos[idx].url} alt={`Mini ${idx + 1}`} className="mini-polaroid-img" />
                        <button
                          type="button"
                          className="btn-slot-replace mini-replace"
                          onClick={() => {
                            setActivePocketSlot(idx);
                            pocketSingleInputRef.current?.click();
                          }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="upload-placeholder-slot"
                        onClick={() => {
                          setActivePocketSlot(idx);
                          pocketSingleInputRef.current?.click();
                        }}
                      >
                        <UploadCloud size={16} />
                        <span style={{ fontSize: '10px' }}>#{idx + 1}</span>
                      </button>
                    )}
                  </div>
                  <div className="mini-card-bottom-bar">postgenz</div>
                </div>
              ))}
            </div>
            <div className="preview-caption-text">
              Preview of your {pocketPack === '5-pack' ? '5' : '7'} mini pocket prints
            </div>
          </div>

          <div className="custom-options-controls">
            <h2 className="editor-heading">Customize Mini Pocket Photos</h2>
            <p className="editor-subheading">
              Aesthetic mini polaroid prints. Select either 5 or 7 photos to upload!
            </p>

            <input
              ref={pocketInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePocketBulkUpload}
              className="hidden"
            />
            <input
              ref={pocketSingleInputRef}
              type="file"
              accept="image/*"
              onChange={handlePocketSingleUpload}
              className="hidden"
            />

            <button
              type="button"
              className="button postgenz-btn button-wide"
              onClick={() => pocketInputRef.current?.click()}
            >
              <UploadCloud size={18} />
              <span>Upload Photos ({pocketPhotos.length}/{maxPocketPhotos})</span>
            </button>

            {pocketPhotos.length > 0 && (
              <button
                type="button"
                className="text-button clear-photos-btn"
                onClick={() => setPocketPhotos([])}
              >
                Clear All Uploaded Photos
              </button>
            )}

            {/* PACK SIZE (5 OR 7 UPLOAD IMAGES) */}
            <div className="control-group">
              <label className="control-label">Pack Size (Number of Upload Images)</label>
              <div className="option-pills-row">
                <button
                  type="button"
                  className={`option-pill ${pocketPack === '5-pack' ? 'active-pill' : ''}`}
                  onClick={() => {
                    setPocketPack('5-pack');
                    if (pocketPhotos.length > 5) setPocketPhotos(pocketPhotos.slice(0, 5));
                  }}
                >
                  Pack of 5 Prints (Rs. 129)
                </button>
                <button
                  type="button"
                  className={`option-pill ${pocketPack === '7-pack' ? 'active-pill' : ''}`}
                  onClick={() => setPocketPack('7-pack')}
                >
                  Pack of 7 Prints (Rs. 169)
                </button>
              </div>
            </div>

            <div className="control-group">
              <label className="control-label">Border Style</label>
              <div className="option-pills-row">
                <button
                  type="button"
                  className={`option-pill ${pocketFrameStyle === 'white' ? 'active-pill' : ''}`}
                  onClick={() => setPocketFrameStyle('white')}
                >
                  Polaroid White
                </button>
                <button
                  type="button"
                  className={`option-pill ${pocketFrameStyle === 'cream' ? 'active-pill' : ''}`}
                  onClick={() => setPocketFrameStyle('cream')}
                >
                  Vintage Cream
                </button>
                <button
                  type="button"
                  className={`option-pill ${pocketFrameStyle === 'black' ? 'active-pill' : ''}`}
                  onClick={() => setPocketFrameStyle('black')}
                >
                  Midnight Black
                </button>
              </div>
            </div>

            {/* QUANTITY STEPPER (ORDER MULTIPLE ITEMS WITH SAME IMAGES) */}
            <div className="control-group">
              <label className="control-label">Number of Packs (Quantity)</label>
              <div className="stepper-box">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPocketQuantity(Math.max(1, pocketQuantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="stepper-val">{pocketQuantity}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPocketQuantity(pocketQuantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="quantity-hint-text">
                Order multiple sets of your mini prints
              </span>
            </div>

            <div className="custom-price-total">
              <span>Total Price:</span>
              <strong>{formatPrice(pocketTotalPrice)}</strong>
            </div>

            <button
              type="button"
              className="btn-buy-it-now-blue"
              onClick={handleAddPocketToCart}
            >
              ADD TO BAG • {formatPrice(pocketTotalPrice)}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CUSTOM WALL POSTER / WALLPAPER (CUSTOM SIZES) */}
      {/* ======================================================== */}
      {selectedType === 'poster' && (
        <div className="custom-studio-content">
          <div className="wallpaper-live-preview-wrap">
            <div className={`wall-mockup-frame orientation-${posterOrientation}`}>
              {posterPhoto ? (
                <div className="wall-poster-art-box">
                  <img src={posterPhoto} alt="Your Custom Wallpaper" className="wall-poster-custom-img" />
                  <button
                    type="button"
                    className="btn-change-wallpaper-img"
                    onClick={() => posterInputRef.current?.click()}
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="wallpaper-upload-box"
                  onClick={() => posterInputRef.current?.click()}
                >
                  <UploadCloud size={32} />
                  <strong>Upload Your Artwork / Wallpaper</strong>
                  <span>High-resolution JPG or PNG (Recommended: 300 DPI)</span>
                </button>
              )}
            </div>

          </div>

          <div className="custom-options-controls">
            <h2 className="editor-heading">Customize Wall Poster & Wallpaper</h2>
            <p className="editor-subheading">
              Upload your custom artwork, select orientation, framing, and quantity.
            </p>

            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              onChange={handlePosterUpload}
              className="hidden"
            />

            {!posterPhoto ? (
              <button
                type="button"
                className="button postgenz-btn button-wide"
                onClick={() => posterInputRef.current?.click()}
              >
                <UploadCloud size={18} />
                <span>Upload Image / Wallpaper</span>
              </button>
            ) : (
              <div className="photo-uploaded-chip">
                <Check size={16} className="text-emerald-500" />
                <span>Image loaded successfully</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => posterInputRef.current?.click()}
                >
                  Replace
                </button>
              </div>
            )}

            {/* 1. ORIENTATION */}
            <div className="control-group">
              <label className="control-label">Orientation</label>
              <div className="option-pills-row">
                <button
                  type="button"
                  className={`option-pill ${posterOrientation === 'portrait' ? 'active-pill' : ''}`}
                  onClick={() => setPosterOrientation('portrait')}
                >
                  Portrait (Vertical)
                </button>
                <button
                  type="button"
                  className={`option-pill ${posterOrientation === 'landscape' ? 'active-pill' : ''}`}
                  onClick={() => setPosterOrientation('landscape')}
                >
                  Landscape (Horizontal)
                </button>
              </div>
            </div>

            {/* 2. SIZE (A5, A4, A3) */}
            <div className="control-group">
              <label className="control-label">SIZE</label>
              <div className="option-pills-row size-pills-row">
                <button
                  type="button"
                  className={`option-pill ${posterSize === 'A5' ? 'active-pill' : ''}`}
                  onClick={() => setPosterSize('A5')}
                >
                  A5
                </button>
                <button
                  type="button"
                  className={`option-pill ${posterSize === 'A4' ? 'active-pill' : ''}`}
                  onClick={() => setPosterSize('A4')}
                >
                  A4
                </button>
                <button
                  type="button"
                  className={`option-pill ${posterSize === 'A3' ? 'active-pill' : ''}`}
                  onClick={() => setPosterSize('A3')}
                >
                  A3
                </button>
              </div>
            </div>

            {/* 3. SIZE CHART BUTTON */}
            <button
              type="button"
              className="btn-size-chart-bar"
              onClick={() => setSizeChartOpen(true)}
            >
              SIZE CHART
            </button>

            {/* 4. ADD TO BAG (DIRECTLY AFTER SIZE CHART PER PAGE 11) */}
            <button
              type="button"
              className="btn-buy-it-now-blue mt-4"
              onClick={handleAddPosterToCart}
            >
              ADD TO BAG • RS. {posterUnitCost}.00
            </button>

            <button
              type="button"
              className="btn-new-order-outline"
              onClick={handleNewPosterOrder}
            >
              + Create New Order
            </button>
          </div>
        </div>
      )}

      {/* POSTERS SIZE GUIDE MODAL */}
      {sizeChartOpen && (
        <div className="size-guide-modal-backdrop" onClick={() => setSizeChartOpen(false)}>
          <div className="size-guide-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="size-guide-modal-header">
              <div className="size-guide-modal-title">
                <Ruler size={18} className="text-red-500" />
                <span>POSTERS SIZE GUIDE</span>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSizeChartOpen(false)}
                aria-label="Close size guide"
              >
                <X size={20} />
              </button>
            </div>

            <div className="size-guide-modal-body">
              <div className="size-guide-image-wrap">
                <img
                  src="/assets/poster-size-guide.svg"
                  alt="Posters Size Guide - A3, A4, A5 Dimensions"
                  className="size-guide-graphic-img"
                />
              </div>

              <div className="size-guide-quick-pills">
                <button
                  type="button"
                  className={`guide-pick-btn ${posterSize === 'A5' ? 'picked' : ''}`}
                  onClick={() => {
                    setPosterSize('A5');
                    setSizeChartOpen(false);
                  }}
                >
                  <strong>A5 Desk Print</strong>
                  <span>14.8 × 21 cm • Rs. 129</span>
                </button>
                <button
                  type="button"
                  className={`guide-pick-btn ${posterSize === 'A4' ? 'picked' : ''}`}
                  onClick={() => {
                    setPosterSize('A4');
                    setSizeChartOpen(false);
                  }}
                >
                  <strong>A4 Standard ★</strong>
                  <span>21 × 29.7 cm • Rs. 199</span>
                </button>
                <button
                  type="button"
                  className={`guide-pick-btn ${posterSize === 'A3' ? 'picked' : ''}`}
                  onClick={() => {
                    setPosterSize('A3');
                    setSizeChartOpen(false);
                  }}
                >
                  <strong>A3 Statement</strong>
                  <span>29.7 × 42 cm • Rs. 299</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </main>
  );
}

// =============================================================
// DEDICATED WISHLIST PAGE (PAGE 5)
// =============================================================
export function WishlistPage() {
  const { wishlist = [] } = useStore();
  const [toast, setToast] = useState('');

  const wishlistProducts = products.filter(
    (p) => wishlist.includes(p.slug) || wishlist.includes(p.id)
  );

  const handleMoveToBag = (product: Product) => {
    store.addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      size: 'A5',
      quantity: 1,
      orientation: product.orientation,
      artTreatment: product.artTreatment,
    });
    setToast(`${product.title} added to bag!`);
    window.setTimeout(() => setToast(''), 2500);
  };

  const handleRemove = (product: Product) => {
    store.toggleWishlist(product.slug);
    setToast(`${product.title} removed from Wishlist`);
    window.setTimeout(() => setToast(''), 2500);
  };

  return (
    <main className="postgenz-wishlist-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">
          MY WISHLIST {wishlistProducts.length > 0 ? `(${wishlistProducts.length} ITEMS)` : ''}
        </h1>
        <p className="collection-sub-text">ALL YOUR SAVED POSTERS IN ONE PLACE</p>
      </div>

      <div className="wishlist-page-content max-w-5xl mx-auto px-4 py-6">
        {wishlistProducts.length === 0 ? (
          <div className="empty-state wishlist-empty py-16 text-center">
            <Heart size={56} className="empty-cart-icon text-rose-500 mx-auto mb-4 stroke-1" />
            <h3 className="text-xl font-bold text-neutral-900 mb-2">YOUR WISHLIST IS EMPTY</h3>
            <p className="text-neutral-500 max-w-md mx-auto mb-6 text-sm">
              Explore our trending posters and custom photobooth prints, and tap the heart icon to save what you love!
            </p>
            <Link href="/collections/posters" className="btn-explore-more inline-block">
              EXPLORE POSTERS →
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {wishlistProducts.map((product) => (
              <div key={product.id} className="wishlist-card border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="wishlist-card-media relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <Link href={`/products/${product.slug}`} className="block w-full h-full">
                      <img
                        src={product.images?.[0] || '/assets/spiderman-product-hero.jpg'}
                        alt={product.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(product)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 text-neutral-600 hover:text-red-600 flex items-center justify-center shadow-md transition-colors"
                      aria-label={`Remove ${product.title} from wishlist`}
                    >
                      <Trash2 size={16} />
                    </button>
                    {product.bestseller && (
                      <span className="badge-best-seller absolute bottom-2 left-2 text-[9px] py-0.5 px-2">
                        ⚡ BEST SELLER
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-bold text-xs md:text-sm text-neutral-900 line-clamp-2 hover:underline"
                    >
                      {product.title}
                    </Link>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="font-extrabold text-sm text-neutral-900">
                        {formatPrice(product.price)}
                      </span>
                      {product.compareAtPrice > product.price && (
                        <del className="text-xs text-neutral-400">
                          {formatPrice(product.compareAtPrice)}
                        </del>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 pt-0">
                  <button
                    type="button"
                    onClick={() => handleMoveToBag(product)}
                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag size={14} />
                    <span>Move to Bag</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast message={toast} />
    </main>
  );
}

// =============================================================
// DEDICATED YOUR BAG PAGE (PAGE 5)
// =============================================================
export function CartPage() {
  const [, navigate] = useLocation();
  const { cart, coupon } = useStore();
  const totals = cartTotals(cart, coupon);
  const [toast, setToast] = useState('');

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="postgenz-cart-page">
      <div className="collection-top-header">
        <h1 className="collection-main-title">
          YOUR BAG {totalCount > 0 ? `(${totalCount})` : ''}
        </h1>
        <p className="collection-sub-text">REVIEW YOUR ITEMS BEFORE CHECKOUT</p>
      </div>

      {cart.length === 0 ? (
        <div className="empty-state cart-empty py-16 text-center">
          <ShoppingBag size={56} className="empty-cart-icon text-neutral-400 mx-auto mb-4 stroke-1" />
          <h3 className="text-xl font-bold text-neutral-900 mb-2">HEY, YOUR BAG IS EMPTY!</h3>
          <p className="text-neutral-500 max-w-md mx-auto mb-6 text-sm">
            There is nothing in your bag. Let&apos;s add some awesome posters and custom photobooth prints.
          </p>
          <Link href="/collections/posters" className="btn-explore-more inline-block">
            EXPLORE POSTERS →
          </Link>
        </div>
      ) : (
        <div className="dedicated-bag-container max-w-4xl mx-auto px-4 py-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs md:text-sm font-semibold flex items-center gap-2 mb-6 shadow-sm">
            <span>🎉</span>
            <span>Free shipping on prepaid orders across India!</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Bag Items List */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {cart.map((item) => (
                <div
                  key={item.key}
                  className="bag-item-card bg-white border border-neutral-200 rounded-xl p-3.5 md:p-4 flex gap-4 items-center shadow-sm"
                >
                  <div className="w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                    {item.customUpload?.preview ? (
                      <img
                        src={item.customUpload.preview}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-neutral-900 text-white p-1 text-center">
                        {item.title.split(' ')[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm md:text-base text-neutral-900 line-clamp-1">
                      {item.title}
                    </h4>
                    <div className="text-xs text-neutral-500 mt-1 space-x-2">
                      <span>Size: <strong className="text-neutral-700">{item.size}</strong></span>
                      {item.customUpload?.borderStyle && (
                        <span>• Border: <strong className="text-neutral-700 capitalize">{item.customUpload.borderStyle}</strong></span>
                      )}
                    </div>
                    <div className="font-extrabold text-sm md:text-base text-neutral-900 mt-2">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
                      aria-label="Remove item"
                      onClick={() => {
                        store.removeFromCart(item.key);
                        setToast('Item removed from bag');
                        window.setTimeout(() => setToast(''), 2000);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>

                    <div className="stepper-box flex items-center border border-neutral-300 rounded-lg overflow-hidden h-8">
                      <button
                        type="button"
                        className="stepper-btn px-2 text-neutral-600 hover:bg-neutral-100"
                        onClick={() => store.updateQuantity(item.key, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="stepper-val px-2 text-xs font-bold text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="stepper-btn px-2 text-neutral-600 hover:bg-neutral-100"
                        onClick={() => store.updateQuantity(item.key, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bag Order Summary */}
            <div className="bag-summary-card bg-neutral-50 border border-neutral-200 rounded-2xl p-5 shadow-sm sticky top-24">
              <h3 className="font-bold text-base text-neutral-900 uppercase tracking-wide mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 text-sm border-b border-neutral-200 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal ({totals.totalItemCount} items)</span>
                  <span className="font-bold text-neutral-900">{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Standard Delivery</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>−{formatPrice(totals.discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline mb-6">
                <span className="text-base font-bold text-neutral-900">Subtotal</span>
                <span className="text-xl font-extrabold text-neutral-900">{formatPrice(totals.total)}</span>
              </div>

              <button
                type="button"
                className="bag-checkout-btn"
                onClick={() => navigate('/checkout')}
              >
                <span>PROCEED TO BUY / CHECKOUT</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Mobile Sticky Checkout Bar */}
          <div className="cart-mobile-sticky-checkout">
            <div>
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Total ({totals.totalItemCount} Items)
              </span>
              <span className="text-lg font-black text-neutral-900">
                {formatPrice(totals.total)}
              </span>
            </div>
            <button
              type="button"
              className="cart-mobile-buy-btn"
              onClick={() => navigate('/checkout')}
            >
              <span>PROCEED TO BUY</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </main>
  );
}

export const BagPage = CartPage;

// =============================================================
// CHECKOUT PAGE (MYNTRA-STYLE REDESIGN - PAGE 6)
// =============================================================
export function CheckoutPage() {
  const [, navigate] = useLocation();
  const { cart, coupon } = useStore();
  const totals = cartTotals(cart, coupon);

  const [form, setForm] = useState({
    name: 'Kaushik Vansh',
    email: 'kaushik@dungeons.in',
    phone: '9265964547',
    address: '417, Satyamev Eminence, Near Shukan Mall, Science City, Sola',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380060',
    country: 'India',
  });

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const update = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleApplyCoupon = (e: FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponFeedback({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }
    const validCodes = ['STUDIO10', 'FIRST10', 'DUNGEONS3', 'DUNGEONS5', 'POSTER3', 'POSTER5', 'HMCLUB', 'MYNH15'];
    if (!validCodes.includes(code)) {
      setCouponFeedback({ type: 'error', text: 'Invalid coupon code. Try STUDIO10 for 10% off.' });
      return;
    }
    store.setCoupon(code);
    setCouponFeedback({ type: 'success', text: `Coupon ${code} applied successfully!` });
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    store.setCoupon('');
    setCouponFeedback(null);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\+?[0-9\s-]{10,14}$/.test(form.phone.trim())) errs.phone = 'Enter a valid 10-digit mobile number';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (!form.address.trim()) errs.address = 'Street address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.pincode.trim()) errs.pincode = 'PIN code is required';
    else if (!/^[1-9][0-9]{5}$/.test(form.pincode.trim())) errs.pincode = 'Enter a valid 6-digit PIN code';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cart.length) {
      setError('Your bag is empty. Please add items to checkout.');
      return;
    }

    if (!validate()) {
      setError('Please resolve the highlighted fields in the Address section.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);

    try {
      const paymentResult = await paymentService.openRazorpayCheckout({
        amount: totals.total,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        orderDescription: `Dungeons Order of ${totals.totalItemCount} items`,
      });

      if (paymentResult.status === 'success') {
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
      } else if (paymentResult.status === 'cancelled') {
        setError('Payment was cancelled. You can retry placing your order anytime.');
      } else {
        setError(`Payment could not be completed: ${paymentResult.message}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Payment service error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatedMRP = totals.subtotal + 120 * totals.totalItemCount;
  const calculatedSavings = calculatedMRP - totals.total;

  return (
    <main className="postgenz-checkout-page bg-neutral-50/50 min-h-screen pb-20">
      <div className="collection-top-header">
        <h1 className="collection-main-title">CHECKOUT</h1>
        <p className="collection-sub-text">• COMPLETE YOUR ORDER IN 5 SIMPLE STEPS •</p>
      </div>

      <div className="checkout-content-wrap max-w-5xl mx-auto px-4 py-4">
        {error && (
          <div className="form-error-banner mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm font-semibold flex items-center gap-2.5">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="checkout-grid-container">
          <div className="checkout-left-col flex flex-col gap-4">
          {/* ============================================================== */}
          {/* 1. ADDRESS SECTION (MYNTRA STYLE - PAGE 6) */}
          {/* ============================================================== */}
          <div className="checkout-card bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-neutral-900">{form.name || 'Delivery Address'}</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  HOME
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline uppercase tracking-wider"
              >
                {isEditingAddress ? 'Done' : 'Change'}
              </button>
            </div>

            {!isEditingAddress ? (
              <div className="pt-3 text-xs md:text-sm text-neutral-600 space-y-1">
                <p className="leading-relaxed">{form.address}, {form.city}, {form.state} {form.pincode}</p>
                <p className="font-medium text-neutral-800">Mobile: <strong className="font-bold">{form.phone}</strong></p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <div className="input-field-group">
                  <label className="text-[11px] font-bold text-neutral-700">Full Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={update('name')}
                    placeholder="e.g. Kaushik Vansh"
                    className={`checkout-input text-xs ${formErrors.name ? 'border-red-500 bg-red-50/30' : ''}`}
                  />
                </div>
                <div className="input-field-group">
                  <label className="text-[11px] font-bold text-neutral-700">Mobile Number *</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="9265964547"
                    className={`checkout-input text-xs ${formErrors.phone ? 'border-red-500 bg-red-50/30' : ''}`}
                  />
                </div>
                <div className="input-field-group md:col-span-2">
                  <label className="text-[11px] font-bold text-neutral-700">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="kaushik@dungeons.in"
                    className={`checkout-input text-xs ${formErrors.email ? 'border-red-500 bg-red-50/30' : ''}`}
                  />
                </div>
                <div className="input-field-group md:col-span-2">
                  <label className="text-[11px] font-bold text-neutral-700">Delivery Address *</label>
                  <input
                    required
                    value={form.address}
                    onChange={update('address')}
                    placeholder="417, Satyamev Eminence, Near Shukan Mall..."
                    className={`checkout-input text-xs ${formErrors.address ? 'border-red-500 bg-red-50/30' : ''}`}
                  />
                </div>
                <div className="input-field-group">
                  <label className="text-[11px] font-bold text-neutral-700">City *</label>
                  <input
                    required
                    value={form.city}
                    onChange={update('city')}
                    placeholder="Ahmedabad"
                    className={`checkout-input text-xs ${formErrors.city ? 'border-red-500 bg-red-50/30' : ''}`}
                  />
                </div>
                <div className="input-field-group">
                  <label className="text-[11px] font-bold text-neutral-700">PIN Code *</label>
                  <input
                    required
                    value={form.pincode}
                    onChange={update('pincode')}
                    placeholder="380060"
                    className={`checkout-input text-xs ${formErrors.pincode ? 'border-red-500 bg-red-50/30' : ''}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (validate()) setIsEditingAddress(false);
                  }}
                  className="md:col-span-2 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  Save &amp; Deliver Here
                </button>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* 2. YOUR BAG (MYNTRA STYLE CARDS - PAGE 6) */}
          {/* ============================================================== */}
          <div className="checkout-card bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-wide mb-3">
              Order Items ({totals.totalItemCount})
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 text-xs">
                Your order bag is empty.{' '}
                <Link href="/collections/posters" className="text-blue-600 font-bold underline">
                  Explore Posters
                </Link>
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-neutral-100">
                {cart.map((item) => (
                  <div key={item.key} className="pt-3 first:pt-0 flex gap-3.5 items-center">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                      {item.customUpload?.preview ? (
                        <img
                          src={item.customUpload.preview}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-neutral-900 text-white p-1 text-center">
                          POSTER
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs md:text-sm text-neutral-900 uppercase line-clamp-1">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-neutral-100 text-neutral-700 font-bold px-1.5 py-0.5 rounded">
                          ⚡ BUY 1 GET 1 FREE
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xs text-neutral-400 line-through">
                          {formatPrice(item.price + 80)}
                        </span>
                        <strong className="text-sm font-extrabold text-neutral-900">
                          {formatPrice(item.price)}
                        </strong>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                        Size: <span className="text-neutral-800 font-bold">{item.size}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => store.removeFromCart(item.key)}
                        className="text-neutral-400 hover:text-red-500 p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="stepper-box flex items-center border border-neutral-300 rounded-lg overflow-hidden h-7">
                        <button
                          type="button"
                          className="stepper-btn px-2 text-neutral-600 hover:bg-neutral-100"
                          onClick={() => store.updateQuantity(item.key, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="stepper-val px-2 text-xs font-bold text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="stepper-btn px-2 text-neutral-600 hover:bg-neutral-100"
                          onClick={() => store.updateQuantity(item.key, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* 3. COUPONS & BANK OFFERS (PAGE 6) */}
          {/* ============================================================== */}
          <div className="checkout-card bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-wide">
                Coupons &amp; Bank Offers
              </h3>
              <span className="text-xs text-blue-600 font-bold">View All Offers</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold mb-3">
              <div className="flex items-center gap-2">
                <span>🪙</span>
                <span>Save upto ₹740 • 2 Coupons &amp; Offers Available</span>
              </div>
              <ChevronDown size={16} />
            </div>

            {coupon ? (
              <div className="applied-coupon-card p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-xs text-emerald-900 uppercase">
                    {coupon} APPLIED
                  </span>
                  <p className="text-[11px] text-emerald-700">Discount has been calculated in your total.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Coupon option 1 */}
                <div className="flex items-center justify-between p-2.5 border border-dashed border-neutral-300 rounded-xl bg-neutral-50/50">
                  <div>
                    <span className="font-extrabold text-xs text-neutral-900">STUDIO10</span>
                    <span className="text-[11px] text-neutral-500 ml-2">Extra 10% OFF on all orders</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      store.setCoupon('STUDIO10');
                      setCouponFeedback({ type: 'success', text: 'STUDIO10 applied!' });
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase"
                  >
                    Apply
                  </button>
                </div>

                {/* Coupon option 2 */}
                <div className="flex items-center justify-between p-2.5 border border-dashed border-neutral-300 rounded-xl bg-neutral-50/50">
                  <div>
                    <span className="font-extrabold text-xs text-neutral-900">DUNGEONS3</span>
                    <span className="text-[11px] text-neutral-500 ml-2">Buy 2 Get 1 Free on 3+ posters</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      store.setCoupon('DUNGEONS3');
                      setCouponFeedback({ type: 'success', text: 'DUNGEONS3 applied!' });
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase"
                  >
                    Apply
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter Coupon Code"
                    className="checkout-input uppercase flex-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
            {couponFeedback && (
              <p className={`text-xs mt-2 font-medium ${couponFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {couponFeedback.text}
              </p>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: PRICE DETAILS & PAYMENT CONFIRMATION */}
        {/* ============================================================== */}
        <div className="checkout-right-col flex flex-col gap-4 lg:sticky lg:top-24">
          {/* 4. PRICE DETAILS (PAGE 6) */}
          <div className="checkout-card bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-wide mb-3">
              Price Details
            </h3>

            <div className="space-y-2 text-xs md:text-sm text-neutral-600">
              <div className="flex justify-between">
                <span>Total MRP</span>
                <span className="text-neutral-900 font-bold">{formatPrice(calculatedMRP)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount on MRP</span>
                <span>−{formatPrice(calculatedSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery / Shipping Charges</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>

              <div className="flex justify-between items-baseline pt-3 border-t border-neutral-200 font-extrabold text-base text-neutral-900">
                <span>Total Amount</span>
                <span className="text-lg md:text-xl font-black">{formatPrice(totals.total)}</span>
              </div>
            </div>

            <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <span>🎉</span>
              <span>You&apos;re saving {formatPrice(calculatedSavings)} on this order</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 5. PLACE ORDER BUTTON (STICKY BOTTOM BAR - PAGE 6) */}
          {/* ============================================================== */}
          <div className="checkout-card bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <PaymentTrustBadges />

            <button
              type="submit"
              disabled={isProcessing || cart.length === 0}
              className="w-full mt-3 py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              <span>
                {isProcessing
                  ? 'CONNECTING TO SECURE PAYMENT...'
                  : `PLACE ORDER • ${formatPrice(totals.total)}`}
              </span>
            </button>
            <p className="text-[11px] text-neutral-400 text-center mt-2">
              🔒 100% Safe &amp; Secure Payments via Razorpay.
            </p>
          </div>
        </div>
        </form>

        {/* Mobile Sticky Place Order Bar */}
        <div className="mobile-checkout-sticky-bar">
          <div>
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
              Total Amount
            </span>
            <span className="text-lg font-black text-neutral-900">
              {formatPrice(totals.total)}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isProcessing || cart.length === 0}
            className="mobile-place-order-btn"
          >
            <Lock size={15} />
            <span>{isProcessing ? 'PROCESSING...' : 'PLACE ORDER'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}

export function OrderSuccessPage() {
  const id = new URLSearchParams(window.location.search).get('order');
  const { orders } = useStore();
  const order = orders.find((item) => item.id === id) || orders[0];

  // Calculate delivery date (7–8 business days from order)
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 8);
  const deliveryStr = estimatedDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="postgenz-confirmation-page">
      <div className="confirmation-card-box max-w-2xl mx-auto px-4 py-12">
        <div className="success-icon-wrap w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Check size={40} strokeWidth={3} />
        </div>

        <h1 className="confirmation-title text-2xl md:text-3xl font-extrabold text-neutral-900 mb-2">
          Order Placed Successfully!
        </h1>
        <p className="confirmation-subtitle text-neutral-600 text-sm mb-6">
          Thank you for your purchase from Dungeons! Your prints are being processed using premium 250–300 GSM matte archival stock.
        </p>

        {order ? (
          <div className="order-details-box bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm text-left mb-8 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
              <div>
                <span className="text-xs font-semibold text-neutral-400 block uppercase">Order Reference</span>
                <strong className="text-base font-extrabold text-neutral-900">#{order.id}</strong>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase">
                Payment: Paid
              </span>
            </div>

            {/* Estimated Delivery Date */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start gap-3">
              <Truck size={20} className="text-neutral-700 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                  Estimated Delivery Date
                </span>
                <strong className="text-sm text-neutral-900 block mt-0.5">
                  {deliveryStr} (7–8 Business Days)
                </strong>
                <span className="text-xs text-neutral-500">
                  Tracking details will be sent via SMS / WhatsApp once your package is dispatched.
                </span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="text-sm">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Delivery Address
              </span>
              <p className="font-semibold text-neutral-900">{order.customer.name}</p>
              <p className="text-neutral-600 text-xs leading-relaxed">
                {order.address.address}, {order.address.city}, {order.address.state} - {order.address.pincode}
              </p>
              <p className="text-neutral-500 text-xs mt-1">Phone: {order.customer.phone}</p>
            </div>

            {/* Purchased Items Summary */}
            <div className="pt-3 border-t border-neutral-100">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                Purchased Items ({order.products?.length || 0})
              </span>
              <div className="divide-y divide-neutral-100">
                {order.products?.map((item) => (
                  <div key={item.key} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 bg-neutral-100 rounded overflow-hidden shrink-0 border border-neutral-200">
                        {item.customUpload?.preview ? (
                          <img src={item.customUpload.preview} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-[9px] bg-neutral-900 text-white">
                            POSTER
                          </div>
                        )}
                      </div>
                      <div>
                        <strong className="text-neutral-900 block truncate max-w-[200px] md:max-w-[280px]">{item.title}</strong>
                        <span className="text-neutral-500">{item.size} • Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <strong className="text-neutral-900 font-bold">{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Paid */}
            <div className="pt-3 border-t border-neutral-200 flex justify-between items-center">
              <span className="text-sm font-bold text-neutral-600">Total Paid:</span>
              <span className="text-lg font-black text-neutral-900">{formatPrice(order.total)}</span>
            </div>
          </div>
        ) : null}

        <div className="confirmation-actions flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/collections/posters"
            className="px-6 py-3 bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="px-6 py-3 border border-neutral-300 bg-white text-neutral-800 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-50 transition-colors"
          >
            View Order History
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

      <div className="search-page-box max-w-4xl mx-auto px-4 py-6">
        {initial && results.length === 0 ? (
          <div className="search-empty-state-card text-center py-12 px-4 max-w-md mx-auto">
            {/* SVG Document with Sad Face (Page 9 Reference) */}
            <div className="empty-search-icon-wrapper mb-5 flex justify-center">
              <svg width="84" height="100" viewBox="0 0 84 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10C6 5.58172 9.58172 2 14 2H54L78 26V90C78 94.4183 74.4183 98 70 98H14C9.58172 98 6 94.4183 6 90V10Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2.5" />
                <path d="M54 2V26H78" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2.5" />
                <line x1="18" y1="20" x2="44" y2="20" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="32" x2="40" y2="32" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
                <circle cx="42" cy="58" r="18" stroke="#94A3B8" strokeWidth="2.2" fill="#FFFFFF" />
                <circle cx="35" cy="54" r="2.2" fill="#64748B" />
                <circle cx="49" cy="54" r="2.2" fill="#64748B" />
                <path d="M35 66C37 63 47 63 49 66" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-neutral-800 mb-2">No Results Found</h2>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              We couldn&apos;t find any posters matching &ldquo;{initial}&rdquo;. Please check the spelling or try searching for another keyword.
            </p>

            <Link href="/collections/posters" className="btn-explore-more inline-block">
              EXPLORE ALL POSTERS →
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="postgenz-search-form mb-6">
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
              {initial && results.length > 0 && (
                <p className="search-count-text mb-4 text-sm text-neutral-600 font-semibold">
                  Found {results.length} poster{results.length === 1 ? '' : 's'} for &ldquo;{initial}&rdquo;
                </p>
              )}
              <div className="collection-grid-container two-column-grid">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </>
        )}
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