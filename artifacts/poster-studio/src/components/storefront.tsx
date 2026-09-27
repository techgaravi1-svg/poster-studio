import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, ChevronUp, Menu, Search, ShoppingBag, UserRound, X, Plus, Minus, MessageCircle, ArrowRight } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { formatPrice } from '@/lib/catalog';
import { cartTotals, store, useStore } from '@/lib/store';

export function PosterArt({ treatment, title, compact = false }: { treatment: string; title: string; compact?: boolean }) {
  return <div className={`poster-art ${treatment} ${compact ? 'poster-art-compact' : ''}`} role="img" aria-label={`${title} poster artwork`}>
    <small>POSTER STUDIO / 2024</small>
    <strong>{title.split(' ').slice(0, 2).join(' ')}</strong>
    <span>EDITION 01 — 50 × 70 CM</span>
  </div>;
}

export function ProductCard({ product, onAdded }: { product: Product; onAdded?: (title: string) => void }) {
  const add = () => {
    store.addToCart({ productId: product.id, slug: product.slug, title: product.title, price: product.price, size: product.sizes[0], quantity: 1, orientation: product.orientation, artTreatment: product.artTreatment });
    onAdded?.(product.title);
  };
  return <article className="product-card" data-testid={`card-product-${product.id}`}>
    <div className="product-image">
      <Link href={`/products/${product.slug}`} className="product-image-link" data-testid={`link-product-${product.id}`}>
        {product.newArrival && <span className="product-tag">New</span>}
        {product.bestseller && !product.newArrival && <span className="product-tag">Best seller</span>}
        <PosterArt treatment={product.artTreatment} title={product.title} />
      </Link>
      <button type="button" className="quick-add" aria-label={`Add ${product.title} to bag`} data-testid={`button-add-${product.id}`} onClick={add}>
        <Plus size={17} strokeWidth={1.8} />
      </button>
    </div>
    <div className="product-details">
      <div><Link href={`/products/${product.slug}`} className="product-name">{product.title}</Link><div className="product-meta">{product.category} / {product.orientation}</div></div>
      <div><div className="product-price">{formatPrice(product.price)}</div><del className="product-compare">{formatPrice(product.compareAtPrice)}</del></div>
    </div>
  </article>;
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { cart, coupon } = useStore();
  const totals = cartTotals(cart, coupon);
  return <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="drawer-header"><div><span className="section-kicker">Your edit</span><h2 id="cart-drawer-title">Bag <span>({cart.reduce((sum, item) => sum + item.quantity, 0)})</span></h2></div><button className="icon-button" type="button" aria-label="Close cart" onClick={onClose}><X size={20} /></button></div>
      {cart.length === 0 ? <div className="empty-state compact-empty"><PosterArt treatment="art-mono" title="A good idea" compact /><h3>Your bag is waiting.</h3><p>Add an edition and it will live here between decisions.</p><Link href="/collections" className="button" onClick={onClose}>Explore editions <ArrowRight size={14} /></Link></div> : <>
        <div className="drawer-items">{cart.map((item) => <div className="drawer-item" key={item.key}><PosterArt treatment={item.artTreatment} title={item.title} compact /><div className="drawer-item-copy"><Link href={`/products/${item.slug}`} onClick={onClose}><strong>{item.title}</strong></Link><span>{item.size}{item.customUpload ? ' / custom' : ''}</span><div className="qty-control"><button type="button" aria-label={`Decrease ${item.title}`} onClick={() => store.updateQuantity(item.key, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" aria-label={`Increase ${item.title}`} onClick={() => store.updateQuantity(item.key, item.quantity + 1)}><Plus size={13} /></button></div></div><strong>{formatPrice(item.price * item.quantity)}</strong></div>)}</div>
        <div className="drawer-total"><span>Subtotal</span><strong>{formatPrice(totals.subtotal)}</strong></div>
        <Link className="button button-wide" href="/cart" onClick={onClose}>Review bag <ArrowRight size={14} /></Link>
      </>}
    </aside>
  </div>;
}

export function Header() {
  const [, navigate] = useLocation();
  const { cart } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSearchOpen(false); setCategoriesOpen(false); setMenuOpen(false); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); if (query.trim()) { navigate(`/search?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); setMenuOpen(false); } };
  const close = () => { setMenuOpen(false); setCategoriesOpen(false); };
  const links = [{ href: '/', label: 'Home' }, { href: '/custom', label: 'Custom', badge: 'NEW' }, { href: '/best-sellers', label: 'Best sellers' }, { href: '/collections/anime', label: 'Anime' }, { href: '/collections/movies', label: 'Movies' }, { href: '/collections/wall-packs', label: 'Wall packs', badge: 'HOT' }];
  return <>
    <div className="announcement"><span>Studio note</span> Free shipping on two or more editions <span>•</span> Printed in small batches</div>
    <header className="nav"><div className="nav-inner">
      <Link href="/" className="wordmark" data-testid="link-home" onClick={close}><span className="wordmark-mark" aria-hidden="true" /><span>poster studio</span></Link>
      <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
        {links.map((link) => <Link href={link.href} className="nav-link" key={link.href} onClick={close}>{link.label}{link.badge && <sup className={link.badge === 'HOT' ? 'hot-badge' : ''}>{link.badge}</sup>}</Link>)}
        <div className="category-wrap"><button className="nav-trigger" type="button" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen((open) => !open)}>Categories {categoriesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
          {categoriesOpen && <div className="category-menu" id="category-menu"><Link href="/collections/anime" onClick={close}>Anime</Link><Link href="/collections/movies" onClick={close}>Movies</Link><Link href="/collections/gaming" onClick={close}>Gaming</Link><Link href="/collections/trading" onClick={close}>Trading</Link><Link href="/collections/free-fire" onClick={close}>Free Fire</Link><Link href="/collections/wall-packs" onClick={close}>Wall Packs</Link><Link href="/collections" onClick={close}>View all collections →</Link></div>}
        </div>
      </nav>
      <div className="nav-actions"><button className="icon-button" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18} strokeWidth={1.7} /></button><Link href="/account" className="icon-button desktop-icon" aria-label="Account"><UserRound size={18} strokeWidth={1.7} /></Link><button className="icon-button" type="button" aria-label={`Shopping bag, ${cart.reduce((sum, item) => sum + item.quantity, 0)} items`} onClick={() => setCartOpen(true)}><ShoppingBag size={18} strokeWidth={1.7} />{cart.length > 0 && <span className="cart-count">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}</button><button className="icon-button menu-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
    </div></header>
    {searchOpen && <div className="search-overlay"><form onSubmit={submitSearch} className="search-form"><Search size={20} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posters, worlds, moods..." aria-label="Search posters" /><button type="button" className="icon-button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={20} /></button></form><div className="search-suggestions"><span>Try</span>{['anime', 'gaming', 'cinema', 'wall packs'].map((suggestion) => <button type="button" key={suggestion} onClick={() => { setQuery(suggestion); navigate(`/search?q=${suggestion}`); setSearchOpen(false); }}>{suggestion}</button>)}</div></div>}
    {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
  </>;
}

export function WhatsApp({ context = 'studio' }: { context?: string }) {
  const number = import.meta.env.VITE_WHATSAPP_NUMBER || '000000000000';
  const message = encodeURIComponent(`Hi Poster Studio, I have a question about ${context}.`);
  return <a className="support" href={`https://wa.me/${number}?text=${message}`} target="_blank" rel="noreferrer" aria-label="Chat with Poster Studio on WhatsApp"><MessageCircle size={16} /> Chat with the studio</a>;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const context = location.startsWith('/products/')
    ? 'a product'
    : location.startsWith('/cart')
      ? 'my bag'
      : location.startsWith('/checkout/success')
        ? 'my order'
        : 'the studio';
  return <div className="site-shell"><Header />{children}<WhatsApp context={context} /><footer className="footer"><div className="footer-inner"><div className="footer-top"><div><div className="wordmark"><span className="wordmark-mark" aria-hidden="true" /><span>poster studio</span></div><p>Art for the everyday. Independent editions for homes with a point of view.</p></div><div><h3>Explore</h3><div className="footer-links"><Link href="/collections">Shop all</Link><Link href="/best-sellers">Best sellers</Link><Link href="/collections">Collections</Link><Link href="/custom">Custom prints</Link></div></div><div><h3>Studio</h3><div className="footer-links"><Link href="/account/orders">Orders</Link><Link href="/account">Account</Link><a href="mailto:hello@posterstudio.example">Contact</a></div></div><div><h3>Keep in touch</h3><p>Notes on new drops, artists and good walls. No noise.</p><div className="footer-links"><a href="mailto:hello@posterstudio.example">hello@posterstudio.example</a></div></div></div><div className="footer-bottom"><span>© 2024 Poster Studio — made for considered spaces</span><span>Privacy · Terms · Accessibility</span></div></div></footer></div>;
}

export function Toast({ message }: { message: string }) { return message ? <div className="toast" role="status">{message}</div> : null; }