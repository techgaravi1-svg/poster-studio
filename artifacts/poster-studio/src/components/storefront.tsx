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
  Package,
  Sparkles,
  Instagram,
  Facebook,
  Linkedin,
  Check,
} from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { formatPrice, storeCategories } from '@/lib/catalog';
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
  const add = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    store.addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      size: product.sizes[0],
      quantity: 1,
      orientation: product.orientation,
      artTreatment: product.artTreatment,
    });
    onAdded?.(product.title);
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
          className="quick-cart-btn"
          aria-label={`Add ${product.title} to bag`}
          data-testid={`button-add-${product.id}`}
          onClick={add}
        >
          <ShoppingBag size={18} strokeWidth={2.2} />
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
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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
        <div className="menu-drawer-top">
          <Link href="/" onClick={onClose} className="drawer-logo-wrap">
            <img src="/assets/postgenz-logo-trans.png" alt="POSTGENZ" className="menu-logo-img" />
          </Link>
          <button type="button" className="menu-close-btn" aria-label="Close menu" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

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
                <span>Custom</span>
                <span className="badge-new-pill">NEW</span>
              </Link>
              <Link
                href="/best-sellers"
                className={`menu-nav-item ${location === '/best-sellers' ? 'active-pill' : ''}`}
                onClick={onClose}
              >
                Best Sellers
              </Link>
              <div className="menu-categories-accordion">
                <button
                  type="button"
                  className="menu-nav-item categories-toggle"
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                >
                  <span>Categories</span>
                  {categoriesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {categoriesOpen && (
                  <div className="categories-sublist">
                    <div className="sublist-section-title">ACTIVE CATEGORY</div>
                    <Link href="/collections/posters" onClick={onClose} className="sublist-cat-item available">
                      <span>Posters</span>
                      <span className="sublist-status-badge">Available</span>
                    </Link>
                    <div className="sublist-section-title">COMING SOON</div>
                    {storeCategories.filter((c) => !c.available).map((cat) => (
                      <Link key={cat.id} href={`/collections/${cat.slug}`} onClick={onClose} className="sublist-cat-item coming-soon">
                        <span>{cat.name}</span>
                        <span className="sublist-soon-badge">Soon</span>
                      </Link>
                    ))}
                    <Link href="/collections" onClick={onClose} className="sublist-all">View All 9 Categories →</Link>
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
              <Link href="/collections/wall-packs" className="menu-nav-item with-icon" onClick={onClose}>
                <Package size={20} className="menu-icon" />
                <span>Wall Packs</span>
              </Link>
              <Link href="/custom" className="menu-nav-item with-icon" onClick={onClose}>
                <Sparkles size={20} className="menu-icon" />
                <span>Custom Art</span>
              </Link>
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
  const { cart } = useStore();
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
      <header className="postgenz-header">
        <div className="header-inner">
          <div className="header-left-group">
            <button
              type="button"
              className="header-icon-btn menu-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={24} />
            </button>

            <Link href="/" className="header-brand-logo" aria-label="POSTGENZ Home">
              <img
                src="/assets/postgenz-logo-trans.png"
                alt="POSTGENZ"
                className="postgenz-logo-img"
              />
            </Link>
          </div>

          <nav className="desktop-nav-links" aria-label="Desktop navigation">
            <Link href="/" className="desktop-nav-item">
              Home
            </Link>
            <Link href="/custom" className="desktop-nav-item">
              <span>Custom</span>
              <span className="badge-new-pill">NEW</span>
            </Link>
            <Link href="/best-sellers" className="desktop-nav-item">
              Best Sellers
            </Link>
            <div className="desktop-categories-dropdown">
              <button type="button" className="desktop-nav-item categories-dropdown-trigger">
                <span>Categories</span>
                <ChevronDown size={14} />
              </button>
              <div className="desktop-dropdown-menu">
                <div className="dropdown-section-title">ACTIVE CATEGORY</div>
                <Link href="/collections/posters" className="dropdown-cat-row available">
                  <strong>Posters</strong>
                  <span className="dropdown-status-badge">Available Now</span>
                </Link>
                <div className="dropdown-poster-sublinks">
                  <Link href="/collections/devotional">Devotional</Link>
                  <Link href="/collections/marvel-dc">Marvel & DC</Link>
                  <Link href="/collections/cricket">Cricket</Link>
                  <Link href="/collections/football">Football</Link>
                  <Link href="/collections/wall-packs">Wall Packs</Link>
                </div>
                <div className="dropdown-section-title">COMING SOON CATEGORIES</div>
                <div className="dropdown-soon-grid">
                  {storeCategories.filter((c) => !c.available).map((cat) => (
                    <Link key={cat.id} href={`/collections/${cat.slug}`} className="dropdown-soon-chip">
                      <span>{cat.name}</span>
                      <span className="chip-soon-badge">Soon</span>
                    </Link>
                  ))}
                </div>
                <Link href="/collections" className="dropdown-view-all">All 9 Categories Overview →</Link>
              </div>
            </div>
          </nav>

          <div className="header-actions-right">
            <button
              type="button"
              className="header-icon-btn"
              aria-label="Wishlist"
              onClick={() => setWishlistOpen(true)}
            >
              <Heart size={21} />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={21} />
            </button>
            <button
              type="button"
              className="header-icon-btn cart-btn-wrap"
              aria-label={`Cart with ${totalCartCount} items`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={21} />
              {totalCartCount > 0 && <span className="cart-badge-count">{totalCartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />}

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitSearch} className="postgenz-search-form">
              <Search size={20} className="search-icon-inside" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posters, football, anime, spiderman..."
                aria-label="Search posters"
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
                    navigate(`/search?q=${tag}`);
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
                <h2>Your Wishlist</h2>
              </div>
              <button className="icon-button" onClick={() => setWishlistOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="empty-state compact-empty">
              <Heart size={44} className="empty-cart-icon text-rose-500" />
              <h3>Saved for Later</h3>
              <p>Posters you love will appear here.</p>
              <Link href="/collections" className="button postgenz-btn" onClick={() => setWishlistOpen(false)}>
                Explore Wall Art
              </Link>
            </div>
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
              <a href="mailto:blumun.in@gmail.com" className="footer-link">
                Mail: blumun.in@gmail.com
              </a>
            </div>
          </div>

          <div className="footer-block">
            <h4 className="footer-title">Quick links</h4>
            <ul className="footer-links-list">
              <li><Link href="/account/orders">Track your order</Link></li>
              <li><a href="mailto:blumun.in@gmail.com">Contact Us</a></li>
              <li><Link href="/terms">Terms and Conditions</Link></li>
              <li><Link href="/shipping-policy">Exchange and Shipping Policy</Link></li>
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

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-container">
      <div className="mobile-canvas-wrapper">
        <Header />
        <div className="main-content-flow">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return message ? <div className="postgenz-toast-notification" role="status">{message}</div> : null;
}