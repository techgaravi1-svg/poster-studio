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
                  <span className="cat-soon-pill-badge">SOON</span>
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

  // ADD TO CART HANDLERS
  const handleAddStripToCart = () => {
    store.addToCart({
      productId: 'custom-photobooth',
      slug: 'custom-photobooth-strip',
      title: `Custom Photobooth Strip (${stripFormat.toUpperCase()}) - Qty: ${stripQuantity}`,
      price: stripPricePerUnit,
      size: 'A5',
      quantity: stripQuantity,
      orientation: 'portrait',
      artTreatment: 'art-aurora',
      customUpload: {
        name: `Photobooth_${stripPhotos.length}_photos`,
        preview: stripPhotos[0]?.url || '/assets/custom-photobooth.jpg',
      },
    });
    setToast(`${stripQuantity} × Custom Photobooth Strip added to your bag!`);
    window.setTimeout(() => setToast(''), 2500);
  };

  const handleAddPocketToCart = () => {
    store.addToCart({
      productId: 'custom-mini-pocket',
      slug: 'custom-mini-pocket-photos',
      title: `Mini Pocket Photos (${pocketPack === '5-pack' ? 'Pack of 5' : 'Pack of 7'}) - Qty: ${pocketQuantity}`,
      price: pocketPricePerPack,
      size: 'A5',
      quantity: pocketQuantity,
      orientation: 'portrait',
      artTreatment: 'art-pulse',
      customUpload: {
        name: `MiniPocket_${pocketPhotos.length}_photos`,
        preview: pocketPhotos[0]?.url || '/assets/custom-mini-pocket.jpg',
      },
    });
    setToast(`${pocketQuantity} × Mini Pocket Photos added to your bag!`);
    window.setTimeout(() => setToast(''), 2500);
  };

  const handleAddPosterToCart = () => {
    store.addToCart({
      productId: 'custom-wall-poster',
      slug: 'custom-wall-poster',
      title: `Custom Wall Poster (${posterSize} • ${posterOrientation === 'portrait' ? 'Portrait' : posterOrientation === 'landscape' ? 'Landscape' : 'Square'}) - Qty: ${posterQuantity}`,
      price: posterUnitCost,
      size: posterSize,
      quantity: posterQuantity,
      orientation: posterOrientation,
      artTreatment: 'art-signal',
      customUpload: {
        name: `Poster_${posterSize}_${posterOrientation}`,
        preview: posterPhoto || '/assets/custom-posters.jpg',
      },
    });
    setToast(`${posterQuantity} × Custom Wall Poster (${posterSize}) added to your bag!`);
    window.setTimeout(() => setToast(''), 2500);
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
                <button
                  type="button"
                  className={`option-pill ${posterOrientation === 'square' ? 'active-pill' : ''}`}
                  onClick={() => setPosterOrientation('square')}
                >
                  Square (1:1)
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

            {/* 4. QUANTITY */}
            <div className="control-group">
              <label className="control-label">Number of Packs (Quantity)</label>
              <div className="stepper-box">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPosterQuantity(Math.max(1, posterQuantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="stepper-val">{posterQuantity}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPosterQuantity(posterQuantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="quantity-hint-text">
                Order multiple sets of your mini prints
              </span>
            </div>

            {/* 5. TOTAL PRICE */}
            <div className="custom-price-total">
              <span>Total Price:</span>
              <strong>RS. {posterTotalPrice}.00</strong>
            </div>

            {/* 6. ADD TO BAG */}
            <button
              type="button"
              className="btn-buy-it-now-blue"
              onClick={handleAddPosterToCart}
            >
              ADD TO BAG • RS. {posterTotalPrice}.00
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

            <div className="size-guide-modal-footer">
              <button
                type="button"
                className="btn-size-guide-done"
                onClick={() => setSizeChartOpen(false)}
              >
                GOT IT • CLOSE GUIDE
              </button>
            </div>
          </div>
        </div>
      )}

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