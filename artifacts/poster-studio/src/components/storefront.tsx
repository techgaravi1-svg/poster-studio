import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Menu,
  Search,
  ShoppingBag,
  Heart,
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ClipboardList,
  MapPin,
  Headphones,
  Trash2,
  Instagram,
  Facebook,
  Linkedin,
  Check,
} from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { formatPrice, products, storeCategories } from '@/lib/catalog';
import { cartTotals, store, useStore } from '@/lib/store';

export function PosterArt({
  src,
  treatment,
  title,
  compact = false,
}: {
  src?: string;
  treatment?: string;
  title: string;
  compact?: boolean;
}) {
  if (src) {
    return (
      <div className={`poster-art-img-wrapper ${compact ? 'poster-art-compact' : ''}`}>
        <img
          src={src}
          alt={title}
          className="poster-art-real-img"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div
      className={`poster-art ${treatment || 'art-aurora'} ${compact ? 'poster-art-compact' : ''}`}
      role="img"
      aria-label={`${title} poster artwork`}
    >
      <small>POSTGENZ / STUDIO</small>
      <strong>{title.split(' ').slice(0, 2).join(' ')}</strong>
      <span>350 GSM MATTE PRINT</span>
    </div>
  );
}

export function ProductCard({
  product,
  onAdded,
}: {
  product: Product;
  onAdded?: (title: string) => void;
}) {
  const { wishlist = [] } = useStore();
  const isWishlisted = wishlist.includes(product.slug) || wishlist.includes(product.id);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    store.toggleWishlist(product.slug);
  };

  const imageSrc = product.images?.[0];

  return (
    <article className="postgenz-product-card" data-testid={`card-product-${product.id}`}>
      <div className="product-media-wrap">
        <Link href={`/products/${product.slug}`} className="product-media-link" data-testid={`link-product-${product.id}`}>
          {product.bestseller && (
            <div className="badge-best-seller">
              <span className="badge-icon">⚡</span> BEST SELLER
            </div>
          )}
          {product.newArrival && !product.bestseller && (
            <div className="badge-new-arrival">
              <span className="badge-icon">⚡</span> NEW ARRIVALS
            </div>
          )}
          <PosterArt src={imageSrc} treatment={product.artTreatment} title={product.title} />
        </Link>
        <button
          type="button"
          className={`quick-cart-btn quick-wishlist-btn ${isWishlisted ? 'wishlist-active' : ''}`}
          aria-label={isWishlisted ? `Remove ${product.title} from Wishlist` : `Add ${product.title} to Wishlist`}
          title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
          data-testid={`button-wishlist-${product.id}`}
          onClick={toggleWishlist}
        >
          <Heart
            size={18}
            strokeWidth={2.2}
            fill={isWishlisted ? '#ef4444' : 'none'}
            color={isWishlisted ? '#ef4444' : '#18181b'}
          />
        </button>
      </div>
      <div className="product-info-block">
        <Link href={`/products/${product.slug}`} className="product-card-title">
          {product.title}
        </Link>
        <div className="product-price-row">
          <span className="current-price">{formatPrice(product.price)}</span>
          {product.compareAtPrice > product.price && (
            <del className="compare-price">{formatPrice(product.compareAtPrice)}</del>
          )}
        </div>
      </div>
    </article>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { cart, coupon } = useStore();
  const totals = cartTotals(cart, coupon);
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="section-kicker">POSTGENZ</span>
            <h2 id="cart-drawer-title">
              Your Bag <span>({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close cart" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {cart.length === 0 ? (
          <div className="empty-state compact-empty">
            <ShoppingBag size={48} className="empty-cart-icon" />
            <h3>Your cart is empty.</h3>
            <p>Add your favorite posters or photobooth strips.</p>
            <Link href="/collections" className="button postgenz-btn" onClick={onClose}>
              Explore Editions <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-items">
              {cart.map((item) => (
                <div className="drawer-item" key={item.key}>
                  <div className="drawer-item-thumb">
                    <PosterArt treatment={item.artTreatment} title={item.title} compact />
                  </div>
                  <div className="drawer-item-copy">
                    <Link href={`/products/${item.slug}`} onClick={onClose}>
                      <strong>{item.title}</strong>
                    </Link>
                    <span>Size: {item.size}{item.customUpload ? ' / Custom Print' : ''}</span>
                    <div className="qty-control">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.title}`}
                        onClick={() => store.updateQuantity(item.key, item.quantity - 1)}
                      >
                        <Minus size={13} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.title}`}
                        onClick={() => store.updateQuantity(item.key, item.quantity + 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <strong className="drawer-item-price">{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="drawer-footer-actions">
              <div className="drawer-total">
                <span>Subtotal</span>
                <strong>{formatPrice(totals.subtotal)}</strong>
              </div>
              <p className="shipping-notice-free">🎉 Free shipping on prepaid orders!</p>
              <Link className="button postgenz-btn button-wide" href="/checkout" onClick={onClose}>
                Proceed to Checkout <ArrowRight size={14} />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function MenuDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [postersOpen, setPostersOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [location] = useLocation();

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="postgenz-menu-drawer"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="menu-drawer-content">
          <div className="menu-section">
            <div className="menu-section-heading">SHOP</div>
            <nav className="menu-nav-list">
              <Link
                href="/"
                className={`menu-nav-item ${location === '/' ? 'active-pill' : ''}`}
                onClick={onClose}
              >
                Home
              </Link>
              <Link
                href="/custom"
                className={`menu-nav-item ${location === '/custom' ? 'active-pill' : ''}`}
                onClick={onClose}
              >
                <span>Custom Orders</span>
                <span className="badge-new-pill">NEW</span>
              </Link>
              <Link
                href="/collections/wall-packs"
                className={`menu-nav-item ${location === '/collections/wall-packs' ? 'active-pill' : ''}`}
                onClick={onClose}
              >
                Wall Packs
              </Link>
              <div className="menu-categories-accordion">
                <button
                  type="button"
                  className="menu-nav-item categories-toggle"
                  onClick={() => setPostersOpen(!postersOpen)}
                >
                  <span>Posters</span>
                  {postersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {postersOpen && (
                  <div className="categories-sublist">
                    <Link href="/collections/anime" onClick={onClose} className="sublist-cat-item">
                      <span>Anime & Manga Posters</span>
                    </Link>
                    <Link href="/collections/marvel-dc" onClick={onClose} className="sublist-cat-item">
                      <span>Marvel & DC Posters</span>
                    </Link>
                    <Link href="/collections/football" onClick={onClose} className="sublist-cat-item">
                      <span>Football Posters</span>
                    </Link>
                    <Link href="/collections/aesthetic" onClick={onClose} className="sublist-cat-item">
                      <span>Aesthetic & Cinema</span>
                    </Link>
                    <Link href="/collections/cricket" onClick={onClose} className="sublist-cat-item">
                      <span>Sports & UFC Posters</span>
                    </Link>
                    <Link href="/collections/devotional" onClick={onClose} className="sublist-cat-item">
                      <span>Motivational Posters</span>
                    </Link>
                    <Link href="/collections/posters" onClick={onClose} className="sublist-all">View All Available Posters →</Link>
                  </div>
                )}
              </div>
              <div className="menu-categories-accordion">
                <button
                  type="button"
                  className="menu-nav-item categories-toggle"
                  onClick={() => setComingSoonOpen(!comingSoonOpen)}
                >
                  <span>Coming Soon</span>
                  {comingSoonOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {comingSoonOpen && (
                  <div className="categories-sublist">
                    {storeCategories.filter((c) => !c.available).map((cat) => (
                      <div key={cat.id} className="sublist-cat-item coming-soon disabled" aria-disabled="true">
                        <span>{cat.name}</span>
                        <span className="sublist-soon-badge">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="menu-section">
            <div className="menu-section-heading">MY ACCOUNT</div>
            <nav className="menu-nav-list">
              <Link href="/account/orders" className="menu-nav-item with-icon" onClick={onClose}>
                <ClipboardList size={20} className="menu-icon" />
                <span>Orders</span>
              </Link>
              <Link href="/account/addresses" className="menu-nav-item with-icon" onClick={onClose}>
                <MapPin size={20} className="menu-icon" />
                <span>Addresses</span>
              </Link>
              <a href="mailto:blumun.in@gmail.com" className="menu-nav-item with-icon" onClick={onClose}>
                <Headphones size={20} className="menu-icon" />
                <span>Customer Support</span>
              </a>
            </nav>
          </div>
        </div>

        <div className="menu-account-card">
          <div className="menu-account-heading">ACCOUNT</div>
          <div className="menu-account-actions">
            <Link href="/account" className="btn-menu-login" onClick={onClose}>
              Log In
            </Link>
            <Link href="/account" className="btn-menu-register" onClick={onClose}>
              Register
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Header() {
  const [, navigate] = useLocation();
  const { cart, wishlist = [] } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
        setWishlistOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className={`postgenz-header ${menuOpen ? 'header-menu-active' : ''}`}>
        <div className="header-inner">
          <div className="header-left-group">
            <button
              type="button"
              className="header-icon-btn menu-toggle"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => {
                setMenuOpen((prev) => !prev);
                setSearchOpen(false);
              }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {!menuOpen && (
              <Link href="/" className="header-brand-logo" aria-label="POSTGENZ Home">
                <img
                  src="/assets/postgenz-logo-trans.png"
                  alt="POSTGENZ"
                  className="postgenz-logo-img"
                />
              </Link>
            )}
          </div>

          {!menuOpen && (
            <nav className="desktop-nav-links" aria-label="Desktop navigation">
              <Link href="/" className="desktop-nav-item">
                Home
              </Link>
              <Link href="/custom" className="desktop-nav-item">
                <span>Custom Orders</span>
                <span className="badge-new-pill">NEW</span>
              </Link>
              <Link href="/collections/wall-packs" className="desktop-nav-item">
                Wall Packs
              </Link>
              {/* 4. Posters Dropdown */}
              <div className="desktop-categories-dropdown">
                <button type="button" className="desktop-nav-item categories-dropdown-trigger">
                  <span>Posters</span>
                  <ChevronDown size={14} />
                </button>
                <div className="desktop-dropdown-menu">
                  <div className="dropdown-section-title">POSTER COLLECTIONS</div>
                  <div className="dropdown-poster-sublinks">
                    <Link href="/collections/anime">Anime & Manga Posters</Link>
                    <Link href="/collections/marvel-dc">Marvel & DC Posters</Link>
                    <Link href="/collections/football">Football Posters</Link>
                    <Link href="/collections/aesthetic">Aesthetic & Cinema</Link>
                    <Link href="/collections/cricket">Sports & UFC Posters</Link>
                    <Link href="/collections/devotional">Motivational Posters</Link>
                  </div>
                  <Link href="/collections/posters" className="dropdown-view-all">All Available Posters →</Link>
                </div>
              </div>

              {/* 5. Coming Soon Dropdown */}
              <div className="desktop-categories-dropdown">
                <button type="button" className="desktop-nav-item categories-dropdown-trigger">
                  <span>Coming Soon</span>
                  <ChevronDown size={14} />
                </button>
                <div className="desktop-dropdown-menu">
                  <div className="dropdown-section-title">UPCOMING LUXURY COLLECTIONS</div>
                  <div className="dropdown-soon-grid">
                    {storeCategories.filter((c) => !c.available).map((cat) => (
                      <div key={cat.id} className="dropdown-soon-chip disabled" aria-disabled="true" title={`${cat.name} (Coming Soon)`}>
                        <span>{cat.name}</span>
                        <span className="chip-soon-badge">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-view-all text-neutral-400 font-normal">Launching soon • Pre-order notification available</div>
                </div>
              </div>
            </nav>
          )}

          {!menuOpen && (
            <div className="header-actions-right">
              <button
                type="button"
                className="header-icon-btn"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={21} />
              </button>
              <Link
                href="/wishlist"
                className="header-icon-btn header-wishlist-btn"
                aria-label="Wishlist"
              >
                <Heart size={21} />
                {wishlist.length > 0 && <span className="cart-badge-count">{wishlist.length}</span>}
              </Link>
              <Link
                href="/bag"
                className="header-icon-btn cart-btn-wrap"
                aria-label={`Bag with ${totalCartCount} items`}
              >
                <ShoppingBag size={21} />
                {totalCartCount > 0 && <span className="cart-badge-count">{totalCartCount}</span>}
              </Link>
            </div>
          )}
        </div>
      </header>

      {menuOpen && <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />}

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitSearch} className="postgenz-search-form">
              <Search size={20} className="search-icon-inside text-neutral-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posters, football, anime, spiderman..."
                aria-label="Search posters"
                autoFocus
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={20} />
              </button>
            </form>
            <div className="search-suggestions">
              <span>Trending Searches:</span>
              {['Spiderman', 'Ronaldo', 'Neymar', 'Girl Boss', 'Marvel', 'Photobooth'].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    navigate(`/search?q=${encodeURIComponent(tag)}`);
                    setSearchOpen(false);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {wishlistOpen && (
        <div className="drawer-backdrop" onClick={() => setWishlistOpen(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="section-kicker">POSTGENZ</span>
                <h2>Your Wishlist {wishlist.length > 0 ? `(${wishlist.length})` : ''}</h2>
              </div>
              <button className="icon-button" onClick={() => setWishlistOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {wishlist.length === 0 ? (
              <div className="empty-state compact-empty">
                <Heart size={44} className="empty-cart-icon text-rose-500" />
                <h3>Saved for Later</h3>
                <p>Posters you love will appear here.</p>
                <Link href="/collections" className="button postgenz-btn" onClick={() => setWishlistOpen(false)}>
                  Explore Wall Art
                </Link>
              </div>
            ) : (
              <div className="drawer-items-list" style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {products
                  .filter((p) => wishlist.includes(p.slug) || wishlist.includes(p.id))
                  .map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f9fafb', padding: '10px', borderRadius: '10px' }}>
                      <Link href={`/products/${item.slug}`} onClick={() => setWishlistOpen(false)} style={{ width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden' }}>
                        <img src={item.images[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/products/${item.slug}`} onClick={() => setWishlistOpen(false)} style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.title}
                        </Link>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{formatPrice(item.price)}</div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            style={{ background: '#111827', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}
                            onClick={() => {
                              store.addToCart({
                                productId: item.id,
                                slug: item.slug,
                                title: item.title,
                                price: item.price,
                                size: 'A5',
                                quantity: 1,
                                orientation: item.orientation,
                                artTreatment: item.artTreatment,
                              });
                            }}
                          >
                            Add to Bag
                          </button>
                          <button
                            type="button"
                            style={{ color: '#ef4444', padding: '4px' }}
                            onClick={() => store.toggleWishlist(item.slug)}
                            aria-label="Remove from wishlist"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      window.setTimeout(() => setSubscribed(false), 3500);
    }
  };

  return (
    <footer className="postgenz-black-footer">
      <div className="footer-inner-content">
        <div className="footer-brand-header">
          <img
            src="/assets/blumun-logo.png"
            alt="BLUMUN"
            className="footer-blumun-logo"
          />
        </div>

        <div className="footer-grid-sections">
          <div className="footer-block">
            <h4 className="footer-title">Contact info</h4>
            <div className="footer-subitem">Support</div>
            <div className="footer-subitem">
              <a href="mailto:dungeons.support@gmail.com" className="footer-link">
                Mail: dungeons.support@gmail.com
              </a>
            </div>
            <div className="footer-subitem" style={{ fontSize: '13px', color: '#9ca3af' }}>
              Ahmedabad, Gujarat, India
            </div>
          </div>

          <div className="footer-block">
            <h4 className="footer-title">Quick links</h4>
            <ul className="footer-links-list">
              <li><Link href="/account/orders">Track your order</Link></li>
              <li><Link href="/terms">Terms and Conditions</Link></li>
              <li><Link href="/returns">Return &amp; Refund Policy</Link></li>
              <li><Link href="/shipping-policy">Shipping Policy</Link></li>
              <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/faqs">FAQs</Link></li>
            </ul>
          </div>

          <div className="footer-block newsletter-block">
            <h4 className="footer-title">Subscribe to Our E-mails</h4>
            <form onSubmit={handleSubscribe} className="footer-newsletter-form">
              <div className="newsletter-input-wrap">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="newsletter-input"
                  aria-label="Email address"
                />
                <button type="submit" className="newsletter-submit-btn" aria-label="Submit email">
                  {subscribed ? <Check size={18} /> : <ArrowRight size={18} />}
                </button>
              </div>
            </form>
            {subscribed && (
              <p className="newsletter-thanks">Thank you for subscribing!</p>
            )}
          </div>
        </div>

        <div className="footer-divider-line" />

        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            © 2026·BLUMUN
          </div>
          <div className="footer-social-row">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-icon-box" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-icon-box" aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon-box" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function WishlistSnackbar() {
  const { wishlistNotice } = useStore();
  const [visible, setVisible] = useState(false);
  const [currentNotice, setCurrentNotice] = useState<{ type: 'added' | 'removed' } | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const handleWishlistChange = (e: any) => {
      if (e.detail?.type) {
        setCurrentNotice({ type: e.detail.type });
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setVisible(false);
        }, 2800);
      }
    };

    window.addEventListener('wishlist-change', handleWishlistChange);
    return () => {
      window.removeEventListener('wishlist-change', handleWishlistChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (wishlistNotice?.timestamp) {
      setCurrentNotice({ type: wishlistNotice.type });
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 2800);
    }
  }, [wishlistNotice?.timestamp]);

  if (!visible || !currentNotice) return null;

  const isAdded = currentNotice.type === 'added';

  return (
    <div className="flipkart-wishlist-snackbar" role="status" aria-live="polite">
      <div className="snackbar-left">
        <Heart
          size={18}
          strokeWidth={2.4}
          fill={isAdded ? '#ef4444' : 'none'}
          color={isAdded ? '#ef4444' : '#9ca3af'}
        />
        <span className="snackbar-text">
          {isAdded ? 'Added to Wishlist' : 'Removed from Wishlist'}
        </span>
      </div>
      {isAdded && (
        <Link href="/wishlist" className="snackbar-link">
          VIEW WISHLIST
        </Link>
      )}
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-container">
      <div className="mobile-canvas-wrapper">
        <Header />
        <div className="main-content-flow">
          {children}
        </div>
        <Footer />
        <WishlistSnackbar />
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 3500);
    }
  }, [message, onClose]);

  if (!visible || !currentMessage) return null;

  const isBag =
    currentMessage.toLowerCase().includes('bag') ||
    currentMessage.toLowerCase().includes('cart') ||
    currentMessage.toLowerCase().includes('order');

  // Clean item title for display without repetitive boilerplate
  const cleanedItemName = currentMessage
    .replace(/\s*(added to (bag|your bag|cart)!?|moved to (bag|your bag|cart)!?|ready for (another|new) order\.?)/gi, '')
    .trim();

  return (
    <div className="flipkart-cart-snackbar" role="status" aria-live="polite">
      <div className="cart-snackbar-main">
        <div className="cart-snackbar-icon-wrap" aria-hidden="true">
          <Check size={16} strokeWidth={3} className="cart-snackbar-check-svg" />
        </div>
        <div className="cart-snackbar-text-col">
          <span className="cart-snackbar-headline">
            {isBag ? 'Added to Cart' : 'Notification'}
          </span>
          <span className="cart-snackbar-subtext" title={cleanedItemName}>
            {cleanedItemName || currentMessage}
          </span>
        </div>
      </div>

      <div className="cart-snackbar-actions">
        {isBag && (
          <Link href="/bag" className="btn-cart-snackbar-view" onClick={() => setVisible(false)}>
            GO TO BAG →
          </Link>
        )}
        <button
          type="button"
          className="cart-snackbar-close"
          aria-label="Dismiss notification"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setVisible(false);
            if (onClose) onClose();
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}