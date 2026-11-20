import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'wouter';
import {
  BadgeIndianRupee,
  CheckCircle2,
  ClipboardList,
  Clock,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { CIRCLE_PRODUCT_CATEGORIES, posterCategories, transformDbProductToFrontend, type Product } from '@/lib/catalog';
import { PARTNER_MAILTO_LINK, ProductCard } from '@/components/storefront';
import './seller-portal.css';

// ==============================================================================
// MARKETPLACE SELLER PORTAL (/seller) and public seller store page (/store/:slug)
// ==============================================================================

const TOKEN_KEY = 'dungeons_seller_token';

type SellerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
type ListingStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
type ItemStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface SellerProfile {
  id: string;
  email: string;
  ownerName: string;
  businessName: string;
  storeSlug: string;
  phone: string;
  gstin?: string | null;
  pan?: string | null;
  description?: string | null;
  categories: string[];
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  hasBankAccount: boolean;
  status: SellerStatus;
  statusReason?: string | null;
  commissionRate: number;
}

interface SellerStats {
  listings: { total: number; approved: number; pendingReview: number; rejected: number };
  orders: number;
  unitsSold: number;
  awaitingShipment: number;
  grossSales: number;
  commission: number;
  netEarnings: number;
  commissionRate: number;
}

interface SellerListing {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category: string;
  orientation: 'portrait' | 'landscape' | 'square';
  price: number;
  compareAtPrice?: number | null;
  sizePrices?: Record<string, number> | null;
  stock: number;
  images: string[];
  tags: string[];
  isActive: boolean;
  approvalStatus: ListingStatus;
  rejectionReason?: string | null;
}

interface SellerOrderItem {
  id: string;
  title: string;
  size: string;
  quantity: number;
  price: number;
  fulfillmentStatus: ItemStatus;
  trackingNumber?: string | null;
  createdAt: string;
  earnings: { gross: number; commission: number; net: number; rate: number };
  order: {
    orderNumber: string;
    createdAt: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: Record<string, string>;
  };
}

const POSTER_SLUGS = new Set(posterCategories.map((c) => c.slug));
const CATEGORY_GROUPS = [
  { label: 'Posters', items: posterCategories.map((c) => ({ slug: c.slug, name: c.name })) },
  { label: 'Home & decor', items: CIRCLE_PRODUCT_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name })) },
];
const CATEGORY_NAME: Record<string, string> = Object.fromEntries(CATEGORY_GROUPS.flatMap((g) => g.items.map((i) => [i.slug, i.name])));

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// ------------------------------------------------------------------------------
// API helper
// ------------------------------------------------------------------------------

async function sellerApi(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  try {
    const res = await fetch(path, {
      method: init.method || 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const type = res.headers.get('content-type') || '';
    const data: any = type.includes('application/json') ? await res.json() : {};
    return { ok: res.ok && data?.success !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your connection and try again.' } };
  }
}

/** Resize and re-encode an image in the browser so uploads stay small and fast. */
function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      reject(new Error('Please choose a JPG, PNG or WEBP photo.'));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('That photo is larger than 20MB.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Your browser could not process this image.'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file does not look like a valid image.'));
    };
    img.src = url;
  });
}

// ------------------------------------------------------------------------------
// Small UI pieces
// ------------------------------------------------------------------------------

const inputCls =
  'w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10';
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-slate-700';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed';
const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={labelCls}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-[11px] font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function Pill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    PENDING: ['bg-amber-100 text-amber-800', 'Under review'],
    PENDING_REVIEW: ['bg-amber-100 text-amber-800', 'In review'],
    APPROVED: ['bg-emerald-100 text-emerald-800', 'Live'],
    REJECTED: ['bg-red-100 text-red-700', 'Rejected'],
    SUSPENDED: ['bg-slate-200 text-slate-700', 'Suspended'],
    PROCESSING: ['bg-sky-100 text-sky-800', 'To ship'],
    SHIPPED: ['bg-indigo-100 text-indigo-800', 'Shipped'],
    DELIVERED: ['bg-emerald-100 text-emerald-800', 'Delivered'],
    CANCELLED: ['bg-red-100 text-red-700', 'Cancelled'],
  };
  const [cls, label] = map[status] || ['bg-slate-100 text-slate-700', status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

function CategoryChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (slug: string) => onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  return (
    <div className="flex flex-col gap-3">
      {CATEGORY_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((c) => {
              const on = value.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.slug)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==============================================================================
// PAGE
// ==============================================================================

export function SellerPortalPage() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [booting, setBooting] = useState(Boolean(token));

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setSeller(null);
    setStats(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const r = await sellerApi('/api/seller/dashboard', { token });
    if (r.status === 401) {
      signOut();
    } else if (r.ok) {
      setSeller(r.data.seller);
      setStats(r.data.stats);
    }
    setBooting(false);
  }, [token, signOut]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    document.title = 'Sell on DUNGEONS | Seller Hub';
  }, []);

  const onAuthenticated = (newToken: string, profile: SellerProfile) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
    } catch {
      /* private mode: session-only */
    }
    setToken(newToken);
    setSeller(profile);
  };

  if (booting && !seller) {
    return (
      <main className="seller-scope flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" size={28} />
      </main>
    );
  }

  if (!token || !seller) return <SellerLanding onAuthenticated={onAuthenticated} />;

  return <SellerDashboard token={token} seller={seller} stats={stats} onSignOut={signOut} onRefresh={refresh} onSellerUpdated={setSeller} />;
}

// ------------------------------------------------------------------------------
// Landing + auth
// ------------------------------------------------------------------------------

function SellerLanding({ onAuthenticated }: { onAuthenticated: (token: string, seller: SellerProfile) => void }) {
  return (
    <main className="seller-scope bg-[#f8f9fa] pb-16">
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2 md:py-16">
        <div className="flex flex-col justify-center gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold tracking-wider text-white">
            <Store size={14} /> DUNGEONS SELLER HUB
          </span>
          <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-4xl">Seller login</h1>
          <p className="text-sm text-slate-600 md:text-base">
            Sign in with the seller ID and password you received from the DUNGEONS team to manage your products, orders and earnings.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Want to sell on DUNGEONS?</div>
            <p className="mt-1 text-xs text-slate-600">
              Send us your brand and product details. After we review them, our team will create your seller account and email you the login details.
            </p>
            <a href={PARTNER_MAILTO_LINK} className={`${btnGhost} mt-3`}>
              <Mail size={15} /> Partner With Us — Send Details
            </a>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="mb-5 text-lg font-black text-slate-900">Sign in to your seller account</h2>
          <LoginForm onAuthenticated={onAuthenticated} />
        </div>
      </section>
    </main>
  );
}

function LoginForm({ onAuthenticated }: { onAuthenticated: (token: string, seller: SellerProfile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await sellerApi('/api/seller/login', { method: 'POST', body: { email, password } });
    setBusy(false);
    if (r.ok) onAuthenticated(r.data.token, r.data.seller);
    else setError(r.data?.error || 'Sign in failed.');
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ErrorBox message={error} />
      <Field label="Business email">
        <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <input className={inputCls} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button type="submit" className={btnPrimary} disabled={busy}>
        {busy && <Loader2 size={16} className="animate-spin" />} Sign in
      </button>
      <p className="text-center text-xs text-slate-500">
        Forgot your password? Email <a className="font-semibold underline" href="mailto:dungeons.support@gmail.com">dungeons.support@gmail.com</a> from your registered address.
      </p>
    </form>
  );
}

// ------------------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------------------

type Tab = 'overview' | 'listings' | 'orders' | 'profile';

function SellerDashboard({
  token,
  seller,
  stats,
  onSignOut,
  onRefresh,
  onSellerUpdated,
}: {
  token: string;
  seller: SellerProfile;
  stats: SellerStats | null;
  onSignOut: () => void;
  onRefresh: () => void;
  onSellerUpdated: (s: SellerProfile) => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const approved = seller.status === 'APPROVED';

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'listings', label: 'Listings', icon: <Package size={16} /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList size={16} /> },
    { id: 'profile', label: 'Profile & payouts', icon: <UserRound size={16} /> },
  ];

  return (
    <main className="seller-scope min-h-screen bg-[#f8f9fa] pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Store size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">{seller.businessName}</h1>
                <Pill status={seller.status} />
              </div>
              <p className="text-xs text-slate-500">Seller Hub · {seller.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {approved && (
              <Link href={`/store/${seller.storeSlug}`} className={btnGhost}>
                View my store
              </Link>
            )}
            <button type="button" className={btnGhost} onClick={onSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Seller sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-6 px-4">
        <StatusBanner seller={seller} />
        {tab === 'overview' && <OverviewTab stats={stats} seller={seller} goTo={setTab} />}
        {tab === 'listings' && <ListingsTab token={token} approved={approved} onChanged={onRefresh} />}
        {tab === 'orders' && <OrdersTab token={token} onChanged={onRefresh} />}
        {tab === 'profile' && <ProfileTab token={token} seller={seller} onSellerUpdated={onSellerUpdated} />}
      </div>
    </main>
  );
}

function StatusBanner({ seller }: { seller: SellerProfile }) {
  if (seller.status === 'APPROVED') return null;
  const content: Record<Exclude<SellerStatus, 'APPROVED'>, { cls: string; title: string; body: string }> = {
    PENDING: {
      cls: 'border-amber-200 bg-amber-50 text-amber-900',
      title: 'Your application is under review',
      body: 'We usually verify new sellers within 48 hours. Meanwhile, add your payout details under Profile & payouts so you are ready to go.',
    },
    REJECTED: {
      cls: 'border-red-200 bg-red-50 text-red-800',
      title: 'Your application was not approved',
      body: 'Update your details under Profile & payouts and email us if you would like us to take another look.',
    },
    SUSPENDED: {
      cls: 'border-slate-300 bg-slate-100 text-slate-800',
      title: 'Your seller account is suspended',
      body: 'Your listings are hidden from the store. Please contact dungeons.support@gmail.com.',
    },
  };
  const c = content[seller.status];
  return (
    <div className={`rounded-2xl border px-5 py-4 ${c.cls}`}>
      <div className="flex items-center gap-2 text-sm font-black">
        <Clock size={16} /> {c.title}
      </div>
      <p className="mt-1 text-sm">{c.body}</p>
      {seller.statusReason && <p className="mt-2 text-sm font-semibold">Note from our team: {seller.statusReason}</p>}
    </div>
  );
}

function OverviewTab({ stats, seller, goTo }: { stats: SellerStats | null; seller: SellerProfile; goTo: (t: Tab) => void }) {
  if (!stats) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }
  const cards = [
    { label: 'Net earnings', value: inr(stats.netEarnings), sub: `after ${stats.commissionRate}% commission`, icon: <BadgeIndianRupee size={18} /> },
    { label: 'Gross sales', value: inr(stats.grossSales), sub: `${stats.unitsSold} units sold`, icon: <PackageCheck size={18} /> },
    { label: 'Paid orders', value: String(stats.orders), sub: `${stats.awaitingShipment} item(s) to ship`, icon: <Truck size={18} /> },
    { label: 'Live listings', value: String(stats.listings.approved), sub: `${stats.listings.pendingReview} in review · ${stats.listings.rejected} rejected`, icon: <Package size={18} /> },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              {c.label} <span className="text-slate-400">{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{c.value}</div>
            <div className="mt-1 text-xs text-slate-500">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {stats.awaitingShipment > 0 && (
          <button type="button" onClick={() => goTo('orders')} className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left">
            <div className="text-sm font-bold text-sky-900">{stats.awaitingShipment} item(s) waiting to be shipped</div>
            <div className="mt-1 text-xs text-sky-800">Open Orders to add tracking and mark them shipped.</div>
          </button>
        )}
        {seller.status === 'APPROVED' && (
          <button type="button" onClick={() => goTo('listings')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left">
            <div className="text-sm font-bold text-slate-900">Add a new product</div>
            <div className="mt-1 text-xs text-slate-600">Posters, mirrors, wall art, rugs and more.</div>
          </button>
        )}
        {!seller.hasBankAccount && !seller.upiId && (
          <button type="button" onClick={() => goTo('profile')} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <div className="text-sm font-bold text-amber-900">Add payout details</div>
            <div className="mt-1 text-xs text-amber-800">We need a bank account or UPI ID to pay you.</div>
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------
// Listings
// ------------------------------------------------------------------------------

function ListingsTab({ token, approved, onChanged }: { token: string; approved: boolean; onChanged: () => void }) {
  const [items, setItems] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SellerListing | 'new' | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await sellerApi('/api/seller/products', { token });
    if (r.ok) setItems(r.data.products);
    else setError(r.data?.error || 'Could not load your listings.');
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (p: SellerListing) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    const r = await sellerApi(`/api/seller/products/${p.id}`, { method: 'DELETE', token });
    if (r.ok) {
      setNotice('Listing deleted.');
      load();
      onChanged();
    } else setError(r.data?.error || 'Could not delete.');
  };

  if (editing) {
    return (
      <ListingForm
        token={token}
        listing={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={(msg) => {
          setEditing(null);
          setNotice(msg);
          load();
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Your listings</h2>
        <button type="button" className={btnPrimary} disabled={!approved} onClick={() => setEditing('new')} title={approved ? undefined : 'Available once your account is approved'}>
          <Plus size={16} /> Add listing
        </button>
      </div>
      {!approved && <p className="text-sm text-slate-500">You can add listings once your seller account is approved.</p>}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> {notice}
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <ErrorBox message={error} />
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No listings yet.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
              <img src={p.images[0]} alt="" className="h-24 w-24 shrink-0 rounded-xl bg-slate-100 object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">{p.title}</span>
                  <Pill status={p.approvalStatus} />
                  {!p.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">Paused</span>}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {CATEGORY_NAME[p.category] || p.category} ·{' '}
                  {p.sizePrices && Object.keys(p.sizePrices).length > 0
                    ? Object.entries(p.sizePrices).sort(([a], [b]) => ['A5', 'A4', 'A3'].indexOf(a) - ['A5', 'A4', 'A3'].indexOf(b)).map(([k, v]) => `${k} ${inr(v)}`).join(' / ')
                    : inr(p.price)}{' '}
                  · stock {p.stock}
                </div>
                {p.approvalStatus === 'REJECTED' && p.rejectionReason && (
                  <div className="mt-1 text-xs font-semibold text-red-700">Why it was rejected: {p.rejectionReason}</div>
                )}
              </div>
              <div className="flex gap-2">
                {p.approvalStatus === 'APPROVED' && p.isActive && (
                  <Link href={`/products/${p.slug}`} className={btnGhost}>
                    View
                  </Link>
                )}
                <button type="button" className={btnGhost} disabled={!approved} onClick={() => setEditing(p)}>
                  <Pencil size={14} /> Edit
                </button>
                <button type="button" className={`${btnGhost} text-red-600`} onClick={() => remove(p)} aria-label={`Delete ${p.title}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingForm({
  token,
  listing,
  onCancel,
  onSaved,
}: {
  token: string;
  listing: SellerListing | null;
  onCancel: () => void;
  onSaved: (msg: string) => void;
}) {
  const [title, setTitle] = useState(listing?.title || '');
  const [category, setCategory] = useState(listing?.category || '');
  const [description, setDescription] = useState(listing?.description || '');
  const [orientation, setOrientation] = useState<SellerListing['orientation']>(listing?.orientation || 'portrait');
  const [price, setPrice] = useState(listing ? String(listing.sizePrices?.A5 ?? listing.price) : '');
  const [priceA4, setPriceA4] = useState(listing?.sizePrices?.A4 ? String(listing.sizePrices.A4) : '');
  const [priceA3, setPriceA3] = useState(listing?.sizePrices?.A3 ? String(listing.sizePrices.A3) : '');
  const [mrp, setMrp] = useState(listing?.compareAtPrice ? String(listing.compareAtPrice) : '');
  const [stock, setStock] = useState(listing ? String(listing.stock) : '10');
  const [tags, setTags] = useState((listing?.tags || []).filter((t) => !t.includes(':')).join(', '));
  const [images, setImages] = useState<string[]>(listing?.images || []);
  const [isActive, setIsActive] = useState(listing?.isActive ?? true);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isPoster = POSTER_SLUGS.has(category);
  const base = Number(price) || 0;

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - images.length);
    e.target.value = '';
    setError('');
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const dataUrl = await compressImage(file);
        const r = await sellerApi('/api/seller/upload-image', { method: 'POST', token, body: { image: dataUrl } });
        if (r.ok && r.data.url) setImages((prev) => [...prev, r.data.url].slice(0, 6));
        else setError(r.data?.error || 'Upload failed.');
      } catch (err: any) {
        setError(err?.message || 'Upload failed.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!category) return setError('Choose a category.');
    if (images.length === 0) return setError('Add at least one product photo.');
    if (!(base > 0)) return setError('Enter a valid price.');

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      category,
      orientation,
      price: base,
      compareAtPrice: mrp ? Number(mrp) : null,
      stock: Math.max(0, Math.floor(Number(stock) || 0)),
      images,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 15),
      isActive,
    };
    if (isPoster) {
      body.sizePrices = {
        A5: base,
        ...(priceA4 ? { A4: Number(priceA4) } : {}),
        ...(priceA3 ? { A3: Number(priceA3) } : {}),
      };
    }

    setBusy(true);
    const r = await sellerApi(listing ? `/api/seller/products/${listing.id}` : '/api/seller/products', {
      method: listing ? 'PUT' : 'POST',
      token,
      body,
    });
    setBusy(false);
    if (r.ok) onSaved(r.data.message || 'Saved.');
    else setError(r.data?.error || 'Could not save the listing.');
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">{listing ? 'Edit listing' : 'New listing'}</h2>
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <ErrorBox message={error} />

      <div>
        <div className="mb-2 text-xs font-semibold text-slate-700">Photos (up to 6, the first is the cover)</div>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={src} className="relative h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setImages((prev) => prev.filter((x) => x !== src))}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-700 shadow"
              >
                <X size={12} />
              </button>
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1.5 text-[10px] font-bold text-white">Cover</span>}
            </div>
          ))}
          {images.length < 6 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading > 0}
              className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-slate-500"
            >
              {uploading > 0 ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              {uploading > 0 ? 'Uploading…' : 'Add photos'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={onFiles} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Product title">
            <input className={inputCls} required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Arched Wavy Wall Mirror | 24 x 36 in" />
          </Field>
        </div>
        <Field label="Category">
          <select className={inputCls} required value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Choose a category</option>
            {CATEGORY_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {isPoster ? (
          <Field label="Orientation">
            <select className={inputCls} value={orientation} onChange={(e) => setOrientation(e.target.value as SellerListing['orientation'])}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
              <option value="square">Square</option>
            </select>
          </Field>
        ) : (
          <div />
        )}

        {isPoster ? (
          <>
            <Field label="Price for A5 (₹)">
              <input className={inputCls} type="number" min={1} step="1" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Price for A4 (₹)" hint={base ? `Leave empty for ${inr(Math.round(base * 1.5))}` : undefined}>
              <input className={inputCls} type="number" min={1} step="1" value={priceA4} onChange={(e) => setPriceA4(e.target.value)} />
            </Field>
            <Field label="Price for A3 (₹)" hint={base ? `Leave empty for ${inr(Math.round(base * 2.2))}` : undefined}>
              <input className={inputCls} type="number" min={1} step="1" value={priceA3} onChange={(e) => setPriceA3(e.target.value)} />
            </Field>
          </>
        ) : (
          <Field label="Selling price (₹)">
            <input className={inputCls} type="number" min={1} step="1" required value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        )}
        <Field label="MRP (₹, optional)" hint="Shown struck-through to show the discount">
          <input className={inputCls} type="number" min={1} step="1" value={mrp} onChange={(e) => setMrp(e.target.value)} />
        </Field>
        <Field label="Units in stock">
          <input className={inputCls} type="number" min={0} step="1" required value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" hint="Size, material, what's in the box, care instructions">
            <textarea className={`${inputCls} h-32 py-2`} required minLength={10} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Search keywords (optional)" hint="Comma separated, e.g. boho, bedroom, gold frame">
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Listing is active (uncheck to pause sales without deleting)
      </label>

      <p className="text-xs text-slate-500">
        New listings and changes to the title, photos, description or category are reviewed by our team before going live. Price and stock updates apply immediately.
      </p>

      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={busy || uploading > 0}>
          {busy && <Loader2 size={16} className="animate-spin" />} {listing ? 'Save changes' : 'Submit for review'}
        </button>
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------------------
// Orders
// ------------------------------------------------------------------------------

const NEXT_STATUSES: Record<ItemStatus, ItemStatus[]> = {
  PENDING: ['PROCESSING', 'SHIPPED', 'DELIVERED'],
  PROCESSING: ['SHIPPED', 'DELIVERED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

function OrdersTab({ token, onChanged }: { token: string; onChanged: () => void }) {
  const [items, setItems] = useState<SellerOrderItem[]>([]);
  const [filter, setFilter] = useState<'' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await sellerApi(`/api/seller/orders${filter ? `?status=${filter}` : ''}`, { token });
    if (r.ok) setItems(r.data.items);
    else setError(r.data?.error || 'Could not load orders.');
    setLoading(false);
  }, [token, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">Orders to fulfil</h2>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {([
            ['', 'All'],
            ['PROCESSING', 'To ship'],
            ['SHIPPED', 'Shipped'],
            ['DELIVERED', 'Delivered'],
          ] as const).map(([v, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">Only paid orders appear here. Ship within 2 business days and add the courier tracking number.</p>
      <ErrorBox message={error} />
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No orders here yet.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <OrderItemCard key={item.id} token={token} item={item} onUpdated={() => { load(); onChanged(); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderItemCard({ token, item, onUpdated }: { token: string; item: SellerOrderItem; onUpdated: () => void }) {
  const options = NEXT_STATUSES[item.fulfillmentStatus] || [];
  const [status, setStatus] = useState<ItemStatus | ''>(options[0] || '');
  const [tracking, setTracking] = useState(item.trackingNumber || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const a = item.order.shippingAddress || {};
  const address = [a.flat, a.locality, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');

  const save = async () => {
    if (!status) return;
    setBusy(true);
    setError('');
    const r = await sellerApi(`/api/seller/orders/items/${item.id}`, {
      method: 'PATCH',
      token,
      body: { fulfillmentStatus: status, trackingNumber: tracking.trim() || null },
    });
    setBusy(false);
    if (r.ok) onUpdated();
    else setError(r.data?.error || 'Could not update.');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-slate-500">
            {item.order.orderNumber} · {new Date(item.order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">{item.title}</div>
          <div className="text-xs text-slate-600">
            {item.size} × {item.quantity} · {inr(item.earnings.gross)} · you earn <b>{inr(item.earnings.net)}</b>
          </div>
        </div>
        <Pill status={item.fulfillmentStatus === 'PENDING' ? 'PROCESSING' : item.fulfillmentStatus} />
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
        <div className="font-bold">Ship to: {a.name || item.order.customerName}</div>
        <div>{address}</div>
        <div>Phone: {a.phone || item.order.customerPhone}</div>
        {item.trackingNumber && <div className="mt-1">Tracking: {item.trackingNumber}</div>}
      </div>
      {options.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className={`${labelCls} w-40`}>
            Update status
            <select className={`${inputCls} h-10`} value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o === 'PROCESSING' ? 'Packing' : o.charAt(0) + o.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelCls} min-w-[180px] flex-1`}>
            Courier tracking number
            <input className={`${inputCls} h-10`} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Required when shipped" />
          </label>
          <button type="button" className={`${btnPrimary} h-10`} disabled={busy} onClick={save}>
            {busy && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

// ------------------------------------------------------------------------------
// Profile & payouts
// ------------------------------------------------------------------------------

function ProfileTab({ token, seller, onSellerUpdated }: { token: string; seller: SellerProfile; onSellerUpdated: (s: SellerProfile) => void }) {
  const [f, setF] = useState({
    ownerName: seller.ownerName,
    businessName: seller.businessName,
    phone: seller.phone,
    description: seller.description || '',
    addressLine: seller.addressLine,
    city: seller.city,
    state: seller.state,
    pincode: seller.pincode,
    gstin: seller.gstin || '',
    pan: seller.pan || '',
    bankAccountName: seller.bankAccountName || '',
    bankAccountNumber: '',
    bankIfsc: seller.bankIfsc || '',
    upiId: seller.upiId || '',
    categories: seller.categories,
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    const body: Record<string, unknown> = { ...f };
    if (!f.bankAccountNumber) delete body.bankAccountNumber; // keep the saved one
    const r = await sellerApi('/api/seller/me', { method: 'PUT', token, body });
    setBusy(false);
    if (r.ok) {
      onSellerUpdated(r.data.seller);
      setF((p) => ({ ...p, bankAccountNumber: '' }));
      setMsg('Profile saved.');
    } else setError(r.data?.error || 'Could not save.');
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    const r = await sellerApi('/api/seller/me/password', { method: 'POST', token, body: pw });
    setPwMsg(r.ok ? 'Password updated.' : r.data?.error || 'Could not update password.');
    if (r.ok) setPw({ currentPassword: '', newPassword: '' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
        <h2 className="text-lg font-black text-slate-900">Business details</h2>
        <ErrorBox message={error} />
        {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{msg}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name"><input className={inputCls} value={f.ownerName} onChange={set('ownerName')} /></Field>
          <Field label="Business name"><input className={inputCls} value={f.businessName} onChange={set('businessName')} /></Field>
          <Field label="Mobile"><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Email" hint="Contact support to change your login email"><input className={`${inputCls} bg-slate-50`} value={seller.email} disabled /></Field>
          <div className="sm:col-span-2"><Field label="Pickup address"><input className={inputCls} value={f.addressLine} onChange={set('addressLine')} /></Field></div>
          <Field label="City"><input className={inputCls} value={f.city} onChange={set('city')} /></Field>
          <Field label="State"><input className={inputCls} value={f.state} onChange={set('state')} /></Field>
          <Field label="PIN code"><input className={inputCls} value={f.pincode} onChange={set('pincode')} /></Field>
          <Field label="GSTIN"><input className={`${inputCls} uppercase`} value={f.gstin} onChange={set('gstin')} /></Field>
          <Field label="PAN"><input className={`${inputCls} uppercase`} value={f.pan} onChange={set('pan')} /></Field>
          <div className="sm:col-span-2"><Field label="About your business"><textarea className={`${inputCls} h-24 py-2`} value={f.description} onChange={set('description')} /></Field></div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-700">Categories</div>
          <CategoryChips value={f.categories} onChange={(categories) => setF((p) => ({ ...p, categories }))} />
        </div>

        <h3 className="pt-2 text-base font-black text-slate-900">Payout details</h3>
        <p className="-mt-3 text-xs text-slate-500">Earnings are paid to your bank account, or to UPI if no bank account is saved.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account holder name"><input className={inputCls} value={f.bankAccountName} onChange={set('bankAccountName')} /></Field>
          <Field label="Account number" hint={seller.bankAccountNumber ? `Saved: ${seller.bankAccountNumber}. Leave empty to keep it.` : undefined}>
            <input className={inputCls} inputMode="numeric" autoComplete="off" value={f.bankAccountNumber} onChange={set('bankAccountNumber')} />
          </Field>
          <Field label="IFSC"><input className={`${inputCls} uppercase`} value={f.bankIfsc} onChange={set('bankIfsc')} /></Field>
          <Field label="UPI ID"><input className={inputCls} value={f.upiId} onChange={set('upiId')} placeholder="name@bank" /></Field>
        </div>
        <button type="submit" className={`${btnPrimary} w-fit`} disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />} Save profile
        </button>
      </form>

      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Your commission</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{seller.commissionRate}%</div>
          <p className="mt-1 text-xs text-slate-500">Deducted from each paid sale. You keep the rest.</p>
        </div>
        <form onSubmit={changePassword} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black text-slate-900">Change password</h3>
          <Field label="Current password">
            <input className={inputCls} type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
          </Field>
          <Field label="New password">
            <input className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
          </Field>
          <button type="submit" className={btnGhost}>Update password</button>
          {pwMsg && <p className="text-xs font-semibold text-slate-700">{pwMsg}</p>}
        </form>
      </div>
    </div>
  );
}

// ==============================================================================
// PUBLIC SELLER STORE PAGE (/store/:slug)
// ==============================================================================

export function SellerStorePage() {
  const params = useParams<{ slug: string }>();
  const [state, setState] = useState<{ loading: boolean; error: string; store: any; products: Product[] }>({ loading: true, error: '', store: null, products: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await sellerApi(`/api/stores/${encodeURIComponent(params.slug || '')}`);
      if (!alive) return;
      if (r.ok) {
        setState({ loading: false, error: '', store: r.data.store, products: (r.data.products || []).map(transformDbProductToFrontend) });
        document.title = `${r.data.store.businessName} | DUNGEONS`;
      } else {
        setState({ loading: false, error: r.status === 404 ? 'This store does not exist or is not open right now.' : r.data?.error || 'Could not load this store.', store: null, products: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.slug]);

  const categories = useMemo(
    () => Array.from(new Set(state.products.map((p) => CATEGORY_NAME[p.collection] || p.category))).slice(0, 8),
    [state.products],
  );

  if (state.loading) {
    return (
      <main className="seller-scope flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" size={28} />
      </main>
    );
  }

  if (!state.store) {
    return (
      <main className="seller-scope mx-auto max-w-xl px-4 py-20 text-center">
        <Store className="mx-auto text-slate-400" size={36} />
        <h1 className="mt-4 text-xl font-black text-slate-900">Store not found</h1>
        <p className="mt-2 text-sm text-slate-600">{state.error}</p>
        <Link href="/" className={`${btnPrimary} mt-6`}>
          Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="seller-scope bg-[#f8f9fa] pb-16">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Seller on DUNGEONS</span>
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">{state.store.businessName}</h1>
          <p className="text-sm text-slate-600">
            {[state.store.city, state.store.state].filter(Boolean).join(', ')}
            {state.store.city || state.store.state ? ' · ' : ''}
            {state.products.length} product{state.products.length === 1 ? '' : 's'}
            {categories.length > 0 && ` · ${categories.join(', ')}`}
          </p>
          {state.store.description && <p className="max-w-3xl whitespace-pre-wrap text-sm text-slate-700">{state.store.description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pt-8">
        {state.products.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">This seller has no products listed right now.</p>
        ) : (
          <div className="collection-grid-container four-col-laptop-grid">
            {state.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
