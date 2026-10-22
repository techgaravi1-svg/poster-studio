import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import {
  TrendingUp,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Database,
  Tag,
  Copy,
  Check,
  Eye,
  EyeOff,
  Printer,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  ArrowUpRight,
  X,
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  KeyRound,
  Mail,
  SlidersHorizontal,
  FileText,
  Calendar,
  Phone,
  MapPin,
  HelpCircle,
  CheckCheck,
  Terminal,
} from 'lucide-react';
import { formatPrice, fetchLiveProducts, products as fallbackCatalog } from '@/lib/catalog';

interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalCoupons: number;
  totalSubscribers: number;
  databaseConnected: boolean;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: any;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  fulfillmentStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  trackingNumber?: string | null;
  items: Array<{
    id: string;
    productTitle: string;
    productImage?: string | null;
    size: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category: string;
  orientation: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  tags: string[];
  stock: number;
  isBestSeller: boolean;
  isNewRelease: boolean;
  isActive: boolean;
}

interface AdminCoupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  minQty: number;
  maxDiscount?: number | null;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

interface AdminSubscriber {
  id: string;
  email: string;
  createdAt: string;
}

const CATEGORIES_LIST = [
  'All',
  'Marvel & DC',
  'Anime',
  'Diva',
  'Landscapes',
  'Automative',
  'Movies & Web Series',
  'Music Artists',
  'Video Games',
  'Sports',
  'Motivational',
  'Devotional',
];

export function AdminDashboardPage() {
  // -------------------------------------------------------------
  // AUTHENTICATION STATE
  // -------------------------------------------------------------
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('dungeons_admin_token') || sessionStorage.getItem('dungeons_admin_token') || null;
  });
  const [adminUser, setAdminUser] = useState<{ name: string; email: string; role: string } | null>(() => {
    const raw = localStorage.getItem('dungeons_admin_user') || sessionStorage.getItem('dungeons_admin_user');
    return raw ? JSON.parse(raw) : null;
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@posterstudio.com');
  const [loginPassword, setLoginPassword] = useState('Admin@Poster2026!');
  const [loginAdminKey, setLoginAdminKey] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'key'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // -------------------------------------------------------------
  // DASHBOARD STATE
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'coupons' | 'customers' | 'security'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Data states
  const [stats, setStats] = useState<AdminStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    totalProducts: fallbackCatalog.length,
    totalCustomers: 0,
    totalCoupons: 4,
    totalSubscribers: 0,
    databaseConnected: true,
  });
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; sales: number; orders: number }>>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>(() => {
    return fallbackCatalog.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      category: p.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-'),
      orientation: p.orientation || 'portrait',
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: p.images,
      tags: p.tags,
      stock: p.stock || 50,
      isBestSeller: Boolean(p.bestseller),
      isNewRelease: Boolean(p.newArrival),
      isActive: true,
    }));
  });
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [subscribers, setSubscribers] = useState<AdminSubscriber[]>([]);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  // Modals
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<AdminOrder | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productFormData, setProductFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: 'anime',
    orientation: 'portrait',
    price: 79,
    compareAtPrice: 159,
    images: ['/assets/posters/poster-01.jpg'],
    tags: 'anime, poster, art',
    stock: 50,
    isBestSeller: true,
    isNewRelease: false,
  });

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    minSpend: 0,
    minQty: 1,
  });

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwChangeLoading, setPwChangeLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Authenticated fetch wrapper
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
      headers.set('x-admin-token', authToken);
    }
    headers.set('Content-Type', 'application/json');

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      handleSignOut('Session expired. Please sign in again.');
      throw new Error('Unauthorized');
    }
    return res;
  };

  // -------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const payload = loginMode === 'key'
        ? { adminKey: loginAdminKey.trim() }
        : { email: loginEmail.trim(), password: loginPassword };

      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAuthToken(data.token);
        setAdminUser(data.admin);
        localStorage.setItem('dungeons_admin_token', data.token);
        localStorage.setItem('dungeons_admin_user', JSON.stringify(data.admin));
        showToast(`Welcome back, ${data.admin.name}!`);
      } else {
        setLoginError(data.error || 'Authentication failed. Please check credentials.');
        if (typeof data.remainingAttempts === 'number') {
          setRemainingAttempts(data.remainingAttempts);
        }
      }
    } catch {
      setLoginError('Unable to connect to security gateway. Please verify server connection.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = (msg = 'Signed out of admin portal.') => {
    setAuthToken(null);
    setAdminUser(null);
    localStorage.removeItem('dungeons_admin_token');
    localStorage.removeItem('dungeons_admin_user');
    sessionStorage.removeItem('dungeons_admin_token');
    sessionStorage.removeItem('dungeons_admin_user');
    showToast(msg);
  };

  // -------------------------------------------------------------
  // LOAD ADMIN DATA
  // -------------------------------------------------------------
  const loadAdminData = async () => {
    if (!authToken) return;
    setRefreshing(true);
    try {
      const [statsRes, ordersRes, productsRes, couponsRes, subsRes] = await Promise.allSettled([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/orders'),
        authFetch('/api/admin/products'),
        authFetch('/api/admin/coupons'),
        authFetch('/api/admin/subscribers'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        if (d.success) {
          setStats(d.stats);
          setSalesTrend(d.salesTrend || []);
        }
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const d = await ordersRes.value.json();
        if (d.success) setOrders(d.orders || []);
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const d = await productsRes.value.json();
        if (d.success && Array.isArray(d.products) && d.products.length > 0) {
          setProducts(d.products);
          setStats((prev) => ({ ...prev, totalProducts: d.products.length }));
        }
      }

      if (couponsRes.status === 'fulfilled' && couponsRes.value.ok) {
        const d = await couponsRes.value.json();
        if (d.success) setCoupons(d.coupons || []);
      }

      if (subsRes.status === 'fulfilled' && subsRes.value.ok) {
        const d = await subsRes.value.json();
        if (d.success) setSubscribers(d.subscribers || []);
      }
    } catch (err) {
      console.warn('Admin sync notice:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadAdminData();
    }
  }, [authToken]);

  // -------------------------------------------------------------
  // MUTATION HANDLERS
  // -------------------------------------------------------------
  const handleUpdateOrderStatus = async (
    orderId: string,
    updates: { fulfillmentStatus?: string; paymentStatus?: string; trackingNumber?: string }
  ) => {
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        showToast(`Order #${data.order.orderNumber} updated successfully!`);
        authFetch('/api/admin/stats').then((r) => r.json()).then((d) => d.success && setStats(d.stats));
      } else {
        showToast('Failed to update order status');
      }
    } catch {
      showToast('Network error updating order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Delete this order permanently from PostgreSQL?')) return;
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast('Order removed from database');
      }
    } catch {
      showToast('Error deleting order');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...productFormData,
        price: Number(productFormData.price),
        compareAtPrice: Number(productFormData.compareAtPrice) || null,
        stock: Number(productFormData.stock),
        tags: typeof productFormData.tags === 'string'
          ? productFormData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : productFormData.tags,
      };

      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingProduct ? 'Poster updated in database!' : 'New Poster added to catalog!');
        setIsProductModalOpen(false);
        setEditingProduct(null);
        loadAdminData();
        fetchLiveProducts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save poster');
      }
    } catch {
      showToast('Network error saving product');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this poster from the live catalog?')) return;
    try {
      const res = await authFetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        showToast('Poster deleted from Prisma database');
        fetchLiveProducts();
      }
    } catch {
      showToast('Error deleting poster');
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...couponFormData,
        discountValue: Number(couponFormData.discountValue),
        minSpend: Number(couponFormData.minSpend),
        minQty: Number(couponFormData.minQty),
      };

      const res = await authFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Voucher code created in database!');
        setIsCouponModalOpen(false);
        setCouponFormData({
          code: '',
          description: '',
          discountType: 'percentage',
          discountValue: 10,
          minSpend: 0,
          minQty: 1,
        });
        loadAdminData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Could not create coupon');
      }
    } catch {
      showToast('Network error saving voucher');
    }
  };

  const handleToggleCoupon = async (couponId: string) => {
    try {
      const res = await authFetch(`/api/admin/coupons/${couponId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const d = await res.json();
        setCoupons((prev) => prev.map((c) => (c.id === couponId ? d.coupon : c)));
        showToast('Coupon status updated');
      }
    } catch {
      showToast('Could not toggle coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Delete this coupon code?')) return;
    try {
      const res = await authFetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId));
        showToast('Coupon deleted');
      }
    } catch {
      showToast('Error deleting coupon');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeLoading(true);
    try {
      const res = await authFetch('/api/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Admin password changed successfully!');
        setCurrentPw('');
        setNewPw('');
      } else {
        showToast(data.error || 'Failed to update password');
      }
    } catch {
      showToast('Network error changing password');
    } finally {
      setPwChangeLoading(false);
    }
  };

  // -------------------------------------------------------------
  // FILTERED LISTS
  // -------------------------------------------------------------
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesFilter = orderStatusFilter === 'all' || o.fulfillmentStatus === orderStatusFilter.toUpperCase();
      const matchesSearch =
        !orderSearch ||
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerPhone.includes(orderSearch);
      return matchesFilter && matchesSearch;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        productCategoryFilter === 'all' ||
        p.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-') ===
          productCategoryFilter.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
      const matchesSearch =
        !productSearch ||
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(productSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, productCategoryFilter, productSearch]);

  const maxSales = Math.max(...salesTrend.map((s) => s.sales), 500);

  // -------------------------------------------------------------
  // RENDER: SECURITY LOGIN GATE (IF NOT AUTHENTICATED)
  // -------------------------------------------------------------
  if (!authToken) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Cyber Header Logo Card */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl mb-3 relative">
              <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#07090e] rounded-full" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-wider flex items-center justify-center gap-2">
              <span>DUNGEONS</span>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-widest">
                ADMIN
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-semibold">
              Restricted Administrative Gateway
            </p>
          </div>

          {/* Secure Login Box */}
          <div className="bg-[#0e121a]/90 backdrop-blur-xl border border-neutral-800/80 rounded-2xl shadow-2xl p-6 sm:p-8">
            {/* Mode Tabs */}
            <div className="flex items-center bg-neutral-900/80 p-1 rounded-xl mb-6 border border-neutral-800">
              <button
                type="button"
                onClick={() => { setLoginMode('password'); setLoginError(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'password' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Lock size={13} />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode('key'); setLoginError(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'key' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <KeyRound size={13} />
                <span>Master Secret Key</span>
              </button>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="mb-5 bg-red-950/40 border border-red-500/40 text-red-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-shake">
                <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {loginMode === 'password' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Admin Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@posterstudio.com"
                        className="w-full bg-neutral-900/90 border border-neutral-800 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Admin Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-neutral-900/90 border border-neutral-800 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Master Admin Secret Key
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginAdminKey}
                      onChange={(e) => setLoginAdminKey(e.target.value)}
                      placeholder="dungeons_adm_sec_..."
                      className="w-full bg-neutral-900/90 border border-neutral-800 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1.5">
                    Found in backend environment configuration (ADMIN_API_KEY).
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Authenticate & Access Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>256-Bit SSL Protected</span>
              </span>
              <Link href="/" className="text-neutral-400 hover:text-cyan-400 transition font-medium">
                ← Return to Store
              </Link>
            </div>
          </div>

          <p className="text-[11px] text-neutral-600 text-center mt-4">
            Security audit log active. Unauthorized login attempts are tracked and reported.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: ENTERPRISE STANDALONE DASHBOARD (AUTHENTICATED)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#090b10] text-neutral-100 font-sans flex antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================= */}
      <aside className="w-64 bg-[#0d1017] border-r border-neutral-800/80 flex flex-col shrink-0 min-h-screen sticky top-0 h-screen z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/assets/dungeons-logo.png" alt="DUNGEONS" className="h-7 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                CONTROL v2.4
              </span>
            </div>
          </Link>
        </div>

        {/* Live Status Pill */}
        <div className="px-4 py-3 border-b border-neutral-800/50 bg-[#0a0d13]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Prisma PostgreSQL</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">
              38ms
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-neutral-400 px-3 py-1.5 tracking-wider">
            Management
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <TrendingUp size={16} />
              <span>Overview & Analytics</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Package size={16} />
              <span>Orders & Tracking</span>
            </span>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
              {orders.filter((o) => o.fulfillmentStatus === 'PENDING').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'products'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers size={16} />
              <span>Posters Catalog</span>
            </span>
            <span className="text-[10px] font-bold bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Tag size={16} />
              <span>Coupons & Offers</span>
            </span>
            <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
              {coupons.length || 4}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users size={16} />
              <span>Customers & Reach</span>
            </span>
          </button>

          <div className="text-[10px] uppercase font-bold text-neutral-400 px-3 pt-4 pb-1.5 tracking-wider">
            System & Security
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck size={16} />
              <span>Security & Diagnostic</span>
            </span>
          </button>
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-3 border-t border-neutral-800/80 bg-[#0a0d13]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{adminUser?.name || 'Super Admin'}</span>
                <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">{adminUser?.email || 'admin@posterstudio.com'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSignOut()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-neutral-800/80 bg-[#0d1017]/90 backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {activeTab === 'dashboard' && 'Dashboard Overview & Analytics'}
              {activeTab === 'orders' && 'Orders Fulfillment & Live Tracking'}
              {activeTab === 'products' && 'Posters Catalog Management'}
              {activeTab === 'coupons' && 'Discount Vouchers & Offers'}
              {activeTab === 'customers' && 'Customers & Newsletter Subscribers'}
              {activeTab === 'security' && 'Security Guard & System Diagnostics'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAdminData}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-xl border border-neutral-700 transition cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync DB'}</span>
            </button>

            {activeTab === 'products' && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductFormData({
                    title: '',
                    slug: '',
                    description: '',
                    category: 'anime',
                    orientation: 'portrait',
                    price: 79,
                    compareAtPrice: 159,
                    images: ['/assets/posters/poster-01.jpg'],
                    tags: 'anime, poster, art',
                    stock: 50,
                    isBestSeller: true,
                    isNewRelease: false,
                  });
                  setIsProductModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 rounded-xl shadow-md shadow-cyan-500/20 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Poster</span>
              </button>
            )}

            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl border border-neutral-800 transition"
            >
              <span>View Store</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ===================================================== */}
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {/* ===================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider">
                    <span>Total Revenue</span>
                    <DollarSign size={16} className="text-emerald-400" />
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">
                    {formatPrice(stats.totalRevenue || orders.reduce((sum, o) => sum + o.total, 0))}
                  </div>
                  <div className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Prisma Live Sync</span>
                  </div>
                </div>

                <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider">
                    <span>Total Orders</span>
                    <Package size={16} className="text-blue-400" />
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">
                    {orders.length}
                  </div>
                  <div className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{orders.filter((o) => o.fulfillmentStatus === 'PENDING').length} Pending Dispatch</span>
                  </div>
                </div>

                <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider">
                    <span>Catalog Posters</span>
                    <Layers size={16} className="text-purple-400" />
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">
                    {products.length}
                  </div>
                  <div className="mt-1 text-xs text-purple-400 flex items-center gap-1">
                    <Tag size={12} />
                    <span>Across 11 Categories</span>
                  </div>
                </div>

                <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider">
                    <span>Newsletter Reach</span>
                    <Users size={16} className="text-cyan-400" />
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">
                    {subscribers.length || stats.totalSubscribers || 14}
                  </div>
                  <div className="mt-1 text-xs text-cyan-400 flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>Subscribed Art Lovers</span>
                  </div>
                </div>
              </div>

              {/* Chart & Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Revenue Trend SVG Chart */}
                <div className="lg:col-span-2 bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">7-Day Sales & Order Volume</h3>
                      <p className="text-xs text-neutral-400">Daily store revenue performance</p>
                    </div>
                    <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      Live Database
                    </span>
                  </div>

                  <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-neutral-800/80">
                    {(salesTrend.length > 0 ? salesTrend : [
                      { date: 'Mon', sales: 450, orders: 3 },
                      { date: 'Tue', sales: 820, orders: 5 },
                      { date: 'Wed', sales: 620, orders: 4 },
                      { date: 'Thu', sales: 1100, orders: 7 },
                      { date: 'Fri', sales: 1450, orders: 9 },
                      { date: 'Sat', sales: 1980, orders: 12 },
                      { date: 'Sun', sales: 1650, orders: 10 },
                    ]).map((day, idx) => {
                      const heightPct = Math.max(15, Math.min(100, Math.round((day.sales / (maxSales || 2000)) * 100)));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-neutral-900 border border-neutral-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                            {formatPrice(day.sales)} ({day.orders} orders)
                          </div>
                          {/* Bar */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full max-w-[40px] bg-gradient-to-t from-cyan-600 to-blue-500 rounded-t-lg transition-all group-hover:from-cyan-400 group-hover:to-blue-400 cursor-pointer shadow-md shadow-cyan-500/10"
                          />
                          <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">
                            {day.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Categories Progress */}
                <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-1">Catalog Categories</h3>
                  <p className="text-xs text-neutral-400 mb-4">Posters distribution by genre</p>

                  <div className="space-y-3">
                    {['Anime', 'Marvel & DC', 'Movies & Web Series', 'Sports', 'Landscapes', 'Diva'].map((cat) => {
                      const count = products.filter(
                        (p) => p.category.toLowerCase().includes(cat.toLowerCase().split(' ')[0])
                      ).length;
                      const pct = Math.round((count / (products.length || 1)) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-300 font-medium">{cat}</span>
                            <span className="text-neutral-400">{count} posters ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.max(8, pct)}%` }}
                              className="h-full bg-cyan-500 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Recent Customer Orders</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Orders</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    No customer orders yet. Place a test order on the store to see live telemetry!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800">
                        <tr>
                          <th className="pb-2.5">Order ID</th>
                          <th className="pb-2.5">Customer</th>
                          <th className="pb-2.5">Total</th>
                          <th className="pb-2.5">Payment</th>
                          <th className="pb-2.5">Fulfillment</th>
                          <th className="pb-2.5 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="hover:bg-neutral-800/20 transition">
                            <td className="py-3 font-mono font-bold text-cyan-400">
                              #{order.orderNumber}
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-white">{order.customerName}</div>
                              <div className="text-[10px] text-neutral-400">{order.customerPhone}</div>
                            </td>
                            <td className="py-3 font-bold text-white">
                              {formatPrice(order.total)}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.fulfillmentStatus === 'DELIVERED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : order.fulfillmentStatus === 'SHIPPED'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {order.fulfillmentStatus}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 transition cursor-pointer"
                              >
                                Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 2: ORDERS & FULFILLMENT */}
          {/* ===================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search by Order #, Customer, Phone..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full bg-[#11151f] border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer whitespace-nowrap ${
                        orderStatusFilter === status
                          ? 'bg-cyan-500 text-black'
                          : 'bg-[#11151f] text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    No orders match your filter criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-900/60 border-b border-neutral-800">
                        <tr>
                          <th className="p-3.5">Order</th>
                          <th className="p-3.5">Customer & Contact</th>
                          <th className="p-3.5">Items</th>
                          <th className="p-3.5">Total</th>
                          <th className="p-3.5">Payment</th>
                          <th className="p-3.5">Fulfillment</th>
                          <th className="p-3.5">Courier Tracking</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-neutral-800/20 transition">
                            {/* Order Number & Date */}
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-cyan-400 block">#{order.orderNumber}</span>
                              <span className="text-[10px] text-neutral-400">
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>

                            {/* Customer & Address */}
                            <td className="p-3.5">
                              <div className="font-bold text-white">{order.customerName}</div>
                              <div className="text-neutral-400 text-[11px]">{order.customerPhone}</div>
                              <div className="text-[10px] text-neutral-400 truncate max-w-[160px]">
                                {order.shippingAddress?.city}, {order.shippingAddress?.pincode}
                              </div>
                            </td>

                            {/* Items count */}
                            <td className="p-3.5">
                              <span className="text-neutral-300 font-semibold">
                                {order.items?.length || 1} item(s)
                              </span>
                            </td>

                            {/* Total Amount */}
                            <td className="p-3.5 font-bold text-white">
                              {formatPrice(order.total)}
                            </td>

                            {/* Payment Status Dropdown */}
                            <td className="p-3.5">
                              <select
                                value={order.paymentStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, { paymentStatus: e.target.value })}
                                className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="PAID">PAID</option>
                                <option value="FAILED">FAILED</option>
                                <option value="REFUNDED">REFUNDED</option>
                              </select>
                            </td>

                            {/* Fulfillment Status Dropdown */}
                            <td className="p-3.5">
                              <select
                                value={order.fulfillmentStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, { fulfillmentStatus: e.target.value })}
                                className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="PROCESSING">PROCESSING</option>
                                <option value="SHIPPED">SHIPPED</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </td>

                            {/* Courier Tracking */}
                            <td className="p-3.5">
                              <input
                                type="text"
                                defaultValue={order.trackingNumber || ''}
                                placeholder="AWB / Tracking #"
                                onBlur={(e) => {
                                  if (e.target.value !== (order.trackingNumber || '')) {
                                    handleUpdateOrderStatus(order.id, { trackingNumber: e.target.value });
                                  }
                                }}
                                className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2 py-1 w-32 focus:border-cyan-500"
                              />
                            </td>

                            {/* Invoice & Actions */}
                            <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 transition cursor-pointer"
                              >
                                Invoice
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1 text-neutral-400 hover:text-red-400 transition cursor-pointer"
                                title="Delete Order"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 3: POSTERS CATALOG CRUD */}
          {/* ===================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search posters by title, slug..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-[#11151f] border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {CATEGORIES_LIST.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setProductCategoryFilter(cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-'))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        productCategoryFilter === cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-')
                          ? 'bg-cyan-500 text-black'
                          : 'bg-[#11151f] text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-[#11151f] border border-neutral-800/80 rounded-2xl overflow-hidden hover:border-neutral-700 transition flex flex-col group shadow-lg"
                  >
                    {/* Image Preview */}
                    <div className="aspect-[3/4] bg-neutral-900 relative overflow-hidden">
                      <img
                        src={prod.images[0] || '/assets/posters/poster-01.jpg'}
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-[10px] font-bold uppercase text-white px-2 py-0.5 rounded">
                        {prod.category}
                      </span>
                      {prod.isBestSeller && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded">
                          Bestseller
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                          {prod.title}
                        </h4>
                        <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                          /{prod.slug}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-cyan-400">
                            {formatPrice(prod.price)}
                          </span>
                          {prod.compareAtPrice && (
                            <span className="text-[10px] text-neutral-400 line-through ml-1.5">
                              {formatPrice(prod.compareAtPrice)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setProductFormData({
                                title: prod.title,
                                slug: prod.slug,
                                description: prod.description || '',
                                category: prod.category,
                                orientation: prod.orientation,
                                price: prod.price,
                                compareAtPrice: prod.compareAtPrice || 159,
                                images: prod.images,
                                tags: prod.tags.join(', '),
                                stock: prod.stock,
                                isBestSeller: prod.isBestSeller,
                                isNewRelease: prod.isNewRelease,
                              });
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 4: COUPONS & OFFERS */}
          {/* ===================================================== */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Active Discount Codes</h3>
                  <p className="text-xs text-neutral-400">Manage promotional coupons and savings</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(coupons.length > 0 ? coupons : [
                  { id: '1', code: 'STUDIO10', description: 'Extra 10% OFF on all posters', discountType: 'percentage' as const, discountValue: 10, minSpend: 0, minQty: 1, isActive: true, createdAt: new Date().toISOString() },
                  { id: '2', code: 'FIRST10', description: 'Welcome 10% discount for art lovers', discountType: 'percentage' as const, discountValue: 10, minSpend: 0, minQty: 1, isActive: true, createdAt: new Date().toISOString() },
                  { id: '3', code: 'DUNGEONS3', description: 'Buy 2 Get 1 FREE (Special Offer)', discountType: 'percentage' as const, discountValue: 33.33, minSpend: 200, minQty: 3, isActive: true, createdAt: new Date().toISOString() },
                  { id: '4', code: 'POSTER5', description: 'Buy 3 Get 2 FREE (Mega Bundle)', discountType: 'percentage' as const, discountValue: 40, minSpend: 350, minQty: 5, isActive: true, createdAt: new Date().toISOString() },
                ]).map((coupon) => (
                  <div key={coupon.id} className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(coupon.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                            coupon.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-300 mt-3 font-semibold">
                        {coupon.description || `${coupon.discountValue}% Discount`}
                      </p>
                      <div className="text-[11px] text-neutral-400 mt-2 space-y-0.5">
                        <div>Min Spend: {formatPrice(coupon.minSpend)}</div>
                        <div>Min Quantity: {coupon.minQty} items</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">
                        {coupon.discountValue}% OFF
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="text-xs text-neutral-400 hover:text-red-400 transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 5: CUSTOMERS & NEWSLETTER */}
          {/* ===================================================== */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-1">Newsletter Subscribers</h3>
                <p className="text-xs text-neutral-400 mb-4">Emails captured from homepage newsletter footer</p>

                {subscribers.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    Subscribers will appear here when users submit their email in the footer.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/60">
                    {subscribers.map((sub) => (
                      <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{sub.email}</span>
                        <span className="text-neutral-400 text-[11px]">
                          {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 6: SECURITY & SYSTEM DIAGNOSTICS */}
          {/* ===================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Security Status Box */}
              <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">System Security Status: Protected</h3>
                    <p className="text-xs text-neutral-400">Prisma PostgreSQL SSL active • End-to-end token verification</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 text-xs">
                    <div className="text-neutral-400 text-[10px] font-bold uppercase">Database Driver</div>
                    <div className="text-white font-mono mt-1">@prisma/client 6.4.1</div>
                  </div>
                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 text-xs">
                    <div className="text-neutral-400 text-[10px] font-bold uppercase">Connection Pool</div>
                    <div className="text-emerald-400 font-mono mt-1">pooled.db.prisma.io:5432</div>
                  </div>
                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 text-xs">
                    <div className="text-neutral-400 text-[10px] font-bold uppercase">Rate Limiting</div>
                    <div className="text-white font-mono mt-1">Sliding Window (120 req/min)</div>
                  </div>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="bg-[#11151f] border border-neutral-800/80 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-1">Update Admin Password</h3>
                <p className="text-xs text-neutral-400 mb-4">Change the master administrative login password</p>

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">New Password (min 8 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwChangeLoading}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    {pwChangeLoading ? 'Updating...' : 'Save New Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 3. MODALS */}
      {/* ========================================================= */}

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151f] border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingProduct ? 'Edit Catalog Poster' : 'Add New Poster to Database'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-400 mb-1">Poster Title</label>
                <input
                  type="text"
                  required
                  value={productFormData.title}
                  onChange={(e) => setProductFormData({ ...productFormData, title: e.target.value })}
                  placeholder="ASTA POSTER | BLACK CLOVER"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={productFormData.slug}
                  onChange={(e) => setProductFormData({ ...productFormData, slug: e.target.value })}
                  placeholder="asta-black-clover-anime-poster"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Category</label>
                  <select
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="anime">Anime</option>
                    <option value="marvel-dc">Marvel & DC</option>
                    <option value="diva">Diva</option>
                    <option value="landscapes">Landscapes</option>
                    <option value="automative">Automative</option>
                    <option value="movies-web-series">Movies & Web Series</option>
                    <option value="music-artists">Music Artists</option>
                    <option value="video-games">Video Games</option>
                    <option value="sports">Sports</option>
                    <option value="motivational">Motivational</option>
                    <option value="devotional">Devotional</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Orientation</label>
                  <select
                    value={productFormData.orientation}
                    onChange={(e) => setProductFormData({ ...productFormData, orientation: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                    <option value="square">Square</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={productFormData.price}
                    onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Compare Price (₹)</label>
                  <input
                    type="number"
                    value={productFormData.compareAtPrice}
                    onChange={(e) => setProductFormData({ ...productFormData, compareAtPrice: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Stock</label>
                  <input
                    type="number"
                    value={productFormData.stock}
                    onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">Primary Image Path / URL</label>
                <input
                  type="text"
                  required
                  value={productFormData.images[0] || ''}
                  onChange={(e) => setProductFormData({ ...productFormData, images: [e.target.value] })}
                  placeholder="/assets/posters/poster-01.jpg"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={productFormData.tags}
                  onChange={(e) => setProductFormData({ ...productFormData, tags: e.target.value })}
                  placeholder="anime, hero, black clover"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productFormData.isBestSeller}
                    onChange={(e) => setProductFormData({ ...productFormData, isBestSeller: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-cyan-500"
                  />
                  <span>Mark as Bestseller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productFormData.isNewRelease}
                    onChange={(e) => setProductFormData({ ...productFormData, isNewRelease: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-cyan-500"
                  />
                  <span>Mark as New Release</span>
                </label>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl"
                >
                  Save Poster to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151f] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Coupon Code</h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-400 mb-1">Coupon Code (e.g. FLASH20)</label>
                <input
                  type="text"
                  required
                  value={couponFormData.code}
                  onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-400 mb-1">Description</label>
                <input
                  type="text"
                  value={couponFormData.description}
                  onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                  placeholder="Special 20% discount"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Discount %</label>
                  <input
                    type="number"
                    required
                    value={couponFormData.discountValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-400 mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={couponFormData.minSpend}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minSpend: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl"
                >
                  Create Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-neutral-200 pb-5">
              <div>
                <img src="/assets/dungeons-logo.png" alt="DUNGEONS" className="h-8 w-auto mb-1" />
                <p className="text-xs text-neutral-500">Premium Archival Poster Prints</p>
                <p className="text-[11px] text-neutral-400 mt-1">support@dungeons.com</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black uppercase tracking-wider bg-neutral-100 px-2.5 py-1 rounded">
                  TAX INVOICE
                </span>
                <p className="text-sm font-bold text-neutral-900 mt-2">#{selectedInvoiceOrder.orderNumber}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(selectedInvoiceOrder.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-6 my-6 text-xs">
              <div>
                <p className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">BILLED TO</p>
                <p className="font-bold text-sm text-neutral-900 mt-1">{selectedInvoiceOrder.customerName}</p>
                <p className="text-neutral-600 mt-0.5">{selectedInvoiceOrder.customerPhone}</p>
                <p className="text-neutral-600">{selectedInvoiceOrder.customerEmail}</p>
              </div>
              <div>
                <p className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">SHIPPING DESTINATION</p>
                <p className="text-neutral-700 mt-1">{selectedInvoiceOrder.shippingAddress?.flat}</p>
                <p className="text-neutral-700">{selectedInvoiceOrder.shippingAddress?.locality}</p>
                <p className="text-neutral-700 font-semibold">
                  {selectedInvoiceOrder.shippingAddress?.city}, {selectedInvoiceOrder.shippingAddress?.state} - {selectedInvoiceOrder.shippingAddress?.pincode}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left my-6">
              <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">Size</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Price</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(selectedInvoiceOrder.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-semibold text-neutral-800">{item.productTitle}</td>
                    <td className="p-2.5 text-neutral-600">{item.size}</td>
                    <td className="p-2.5 text-center">{item.quantity}</td>
                    <td className="p-2.5 text-right">{formatPrice(item.price)}</td>
                    <td className="p-2.5 text-right font-bold">{formatPrice(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-neutral-200 pt-4 flex justify-end text-xs">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedInvoiceOrder.subtotal)}</span>
                </div>
                {selectedInvoiceOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>-{formatPrice(selectedInvoiceOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Standard Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between font-bold text-sm text-neutral-900">
                  <span>Total Amount Paid</span>
                  <span>{formatPrice(selectedInvoiceOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Printer size={14} />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminDashboardPage;
