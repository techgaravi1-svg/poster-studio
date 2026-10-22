import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
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
  Printer,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { formatPrice, fetchLiveProducts } from '@/lib/catalog';

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
  notes?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId?: string | null;
    title: string;
    slug?: string | null;
    size: string;
    quantity: number;
    price: number;
    orientation: string;
  }>;
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
  isBestSeller: boolean;
  isNewRelease: boolean;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

interface AdminCoupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  minSpend: number;
  minQty: number;
  maxDiscount?: number | null;
  isActive: boolean;
  createdAt: string;
}

export function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'coupons'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; sales: number; orders: number }>>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Orders filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<AdminOrder | null>(null);

  // Products filters & Modals
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
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

  // Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    minSpend: 0,
    minQty: 1,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Fetch all live database data
  const loadAdminData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, ordersRes, productsRes, couponsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/products'),
        fetch('/api/admin/coupons'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
        setSalesTrend(d.salesTrend || []);
      }
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.orders || []);
      }
      if (productsRes.ok) {
        const d = await productsRes.json();
        setProducts(d.products || []);
      }
      if (couponsRes.ok) {
        const d = await couponsRes.json();
        setCoupons(d.coupons || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update order fulfillment or payment status in DB
  const handleUpdateOrderStatus = async (
    orderId: string,
    updates: { fulfillmentStatus?: string; paymentStatus?: string; trackingNumber?: string }
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        showToast(`Order #${data.order.orderNumber} updated successfully!`);
        // Refresh stats
        fetch('/api/admin/stats').then((r) => r.json()).then((d) => setStats(d.stats));
      } else {
        showToast('Failed to update order status');
      }
    } catch (err) {
      showToast('Network error updating order');
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order from the database?')) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast('Order deleted from database');
      }
    } catch {
      showToast('Error deleting order');
    }
  };

  // Save product (Add or Edit)
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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingProduct ? 'Poster updated in Prisma DB!' : 'New Poster added to Prisma DB!');
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

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this poster from the database?')) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        showToast('Poster deleted from Prisma database');
        fetchLiveProducts();
      }
    } catch {
      showToast('Error deleting poster');
    }
  };

  // Save coupon
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...couponFormData,
        discountValue: Number(couponFormData.discountValue),
        minSpend: Number(couponFormData.minSpend),
        minQty: Number(couponFormData.minQty),
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('New voucher code created in DB!');
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

  // Delete coupon
  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Delete this coupon code?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId));
        showToast('Coupon removed from database');
      }
    } catch {
      showToast('Error deleting coupon');
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      orderStatusFilter === 'all' || o.fulfillmentStatus.toLowerCase() === orderStatusFilter.toLowerCase();
    const matchesSearch =
      !orderSearch ||
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch);
    return matchesFilter && matchesSearch;
  });

  // Filtered products
  const categoriesList = Array.from(new Set(products.map((p) => p.category)));
  const filteredProducts = products.filter((p) => {
    const matchesCat = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const matchesSearch =
      !productSearch ||
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Max value for simple visual SVG chart
  const maxSales = Math.max(...salesTrend.map((s) => s.sales), 500);

  return (
    <div className="min-h-screen bg-[#0d0f12] text-neutral-100 font-sans pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="border-b border-neutral-800 bg-[#121418] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/assets/dungeons-logo.png" alt="DUNGEONS" className="h-8 w-auto object-contain" />
            </Link>
            <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded">
              CONTROL CENTER
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live DB indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Prisma PostgreSQL Live</span>
            </div>

            <button
              type="button"
              onClick={loadAdminData}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-700 transition cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync DB'}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="hidden md:flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition"
            >
              <span>View Store</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <TrendingUp size={14} />
            <span>Dashboard &amp; Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Package size={14} />
            <span>Orders &amp; Tracking ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers size={14} />
            <span>Posters Catalog ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'coupons'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Tag size={14} />
            <span>Vouchers &amp; Offers ({coupons.length})</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD & ANALYTICS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#15181e] border border-neutral-800 shadow-sm relative overflow-hidden">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Total Gross Revenue
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  ₹{stats?.totalRevenue ? stats.totalRevenue.toLocaleString('en-IN') : '0'}
                </div>
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-2">
                  <ArrowUpRight size={13} />
                  <span>Real-time from Database</span>
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#15181e] border border-neutral-800 shadow-sm">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Total Orders
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalOrders ?? 0}
                </div>
                <span className="text-[11px] text-sky-400 font-bold mt-2 block">
                  {stats?.pendingOrders ?? 0} Pending dispatch
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#15181e] border border-neutral-800 shadow-sm">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Posters in Catalog
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalProducts ?? 0}
                </div>
                <span className="text-[11px] text-purple-400 font-bold mt-2 block">
                  Across {categoriesList.length} Categories
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#15181e] border border-neutral-800 shadow-sm">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Customer Reach
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalCustomers ?? 0}
                </div>
                <span className="text-[11px] text-emerald-400 font-bold mt-2 block">
                  {stats?.totalSubscribers ?? 0} Newsletter subscribers
                </span>
              </div>
            </div>

            {/* Sales Trend Chart & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Visual 7-day Sales Chart */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#15181e] border border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Sales &amp; Orders Trend (Last 7 Days)
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Aggregated daily revenue from orders</p>
                  </div>
                  <span className="text-xs text-sky-400 font-mono font-bold bg-sky-950/50 px-2.5 py-1 rounded-md border border-sky-800/40">
                    Live Telemetry
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-neutral-800 pb-2">
                  {salesTrend.map((st, idx) => {
                    const heightPct = Math.max(8, Math.round((st.sales / maxSales) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] text-neutral-400 font-mono opacity-0 group-hover:opacity-100 transition">
                          ₹{st.sales}
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-sky-600 to-sky-400 group-hover:from-sky-500 group-hover:to-sky-300 transition-all cursor-pointer shadow-md shadow-sky-900/20"
                        />
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap">{st.date.split(',')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="p-6 rounded-2xl bg-[#15181e] border border-neutral-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Top Poster Categories
                </h3>
                <div className="space-y-3.5">
                  {categoriesList.slice(0, 6).map((cat) => {
                    const count = products.filter((p) => p.category === cat).length;
                    const pct = Math.round((count / (products.length || 1)) * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-300 capitalize font-medium">{cat.replace('-', ' ')}</span>
                          <span className="text-neutral-400 font-mono">{count} posters ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="p-6 rounded-2xl bg-[#15181e] border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Recent Customer Orders
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-sky-400 hover:underline font-bold"
                >
                  View All Orders →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Order #</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Items</th>
                      <th className="py-3 px-3">Total</th>
                      <th className="py-3 px-3">Fulfillment</th>
                      <th className="py-3 px-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-neutral-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-sky-400">#{o.orderNumber}</td>
                        <td className="py-3 px-3 text-neutral-200">
                          <div>{o.customerName}</div>
                          <div className="text-[11px] text-neutral-400">{o.customerPhone}</div>
                        </td>
                        <td className="py-3 px-3 text-neutral-300">{o.items?.length || 0} items</td>
                        <td className="py-3 px-3 font-bold text-white">{formatPrice(o.total)}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              o.fulfillmentStatus === 'DELIVERED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : o.fulfillmentStatus === 'SHIPPED'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {o.fulfillmentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              o.paymentStatus === 'PAID'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ORDERS MANAGEMENT & FULFILLMENT                                    */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order #, Customer, Phone..."
                    className="w-full bg-[#15181e] border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {['all', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      orderStatusFilter === st
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                        : 'bg-[#15181e] border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'All Orders' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#15181e] border border-neutral-800">
                  <Package size={32} className="mx-auto text-neutral-600 mb-2" />
                  <p className="text-sm font-bold text-neutral-400">No orders match your filter criteria.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-[#15181e] border border-neutral-800 shadow-sm transition hover:border-neutral-700"
                  >
                    {/* Top Row: Meta & Quick Status Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-base text-sky-400">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Fulfillment Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-neutral-400 font-semibold">Fulfillment:</span>
                          <select
                            value={order.fulfillmentStatus}
                            onChange={(e) =>
                              handleUpdateOrderStatus(order.id, { fulfillmentStatus: e.target.value })
                            }
                            className="bg-[#0f1115] border border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>

                        {/* Payment Status Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-neutral-400 font-semibold">Payment:</span>
                          <select
                            value={order.paymentStatus}
                            onChange={(e) =>
                              handleUpdateOrderStatus(order.id, { paymentStatus: e.target.value })
                            }
                            className="bg-[#0f1115] border border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                          >
                            <option value="PAID">PAID</option>
                            <option value="PENDING">PENDING</option>
                            <option value="REFUNDED">REFUNDED</option>
                            <option value="FAILED">FAILED</option>
                          </select>
                        </div>

                        {/* View Official Tax Invoice */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForInvoice(order)}
                          className="flex items-center gap-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1 rounded-lg border border-neutral-700 transition cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>Invoice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-neutral-500 hover:text-red-400 p-1 transition"
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Customer Details & Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Customer Info */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                          Delivery To
                        </span>
                        <div className="font-bold text-white">{order.customerName}</div>
                        <div className="text-neutral-400">Mobile: +91 {order.customerPhone}</div>
                        <div className="text-neutral-400">{order.customerEmail}</div>
                        <div className="text-neutral-500 leading-relaxed pt-1">
                          {order.shippingAddress?.flat}, {order.shippingAddress?.locality}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="space-y-2 md:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                          Items Summary ({order.items?.length || 0})
                        </span>
                        <div className="space-y-1.5">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-[#0d0f12] p-2 rounded-lg border border-neutral-800/80">
                              <div>
                                <span className="font-bold text-neutral-200">{item.title}</span>
                                <span className="text-neutral-500 text-[11px] ml-2">Size: {item.size} • Qty: {item.quantity}</span>
                              </div>
                              <span className="font-mono font-bold text-neutral-300">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Total Line */}
                        <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                          <span className="text-neutral-400">Grand Total:</span>
                          <span className="text-sm font-black text-white">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: POSTERS CATALOG CRUD (CATEGORY-WISE)                                */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search posters by title or slug..."
                    className="w-full bg-[#15181e] border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

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
                    isBestSeller: false,
                    isNewRelease: true,
                  });
                  setIsProductModalOpen(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add New Poster</span>
              </button>
            </div>

            {/* Category Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', ...categoriesList].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setProductCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap capitalize cursor-pointer ${
                    productCategoryFilter === cat
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-[#15181e] border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-2xl bg-[#15181e] border border-neutral-800 overflow-hidden flex flex-col justify-between group transition hover:border-neutral-700"
                >
                  <div>
                    {/* Image Preview */}
                    <div className="relative aspect-[3/4] bg-neutral-900 overflow-hidden">
                      <img
                        src={prod.images[0] || '/assets/posters/poster-01.jpg'}
                        alt={prod.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-2.5 left-2.5 text-[9px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-white px-2 py-0.5 rounded border border-white/10">
                        {prod.category}
                      </span>
                      {prod.isBestSeller && (
                        <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black px-2 py-0.5 rounded shadow">
                          BESTSELLER
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{prod.title}</h4>
                      <p className="text-[11px] font-mono text-neutral-400 mb-2 truncate">/{prod.slug}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-white">{formatPrice(prod.price)}</span>
                        {prod.compareAtPrice && (
                          <del className="text-xs text-neutral-500">{formatPrice(prod.compareAtPrice)}</del>
                        )}
                        <span className="text-[10px] text-neutral-400 ml-auto font-mono">Stock: {prod.stock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 border-t border-neutral-800 bg-[#121418] flex items-center justify-between">
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
                          compareAtPrice: prod.compareAtPrice || 0,
                          images: prod.images,
                          tags: prod.tags.join(', '),
                          stock: prod.stock,
                          isBestSeller: prod.isBestSeller,
                          isNewRelease: prod.isNewRelease,
                        });
                        setIsProductModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white font-semibold cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="text-neutral-500 hover:text-red-400 transition cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COUPONS & DISCOUNTS CRUD                                           */}
        {/* ========================================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active Promo Codes &amp; Vouchers
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Managed and calculated directly on the Prisma PostgreSQL backend
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCouponModalOpen(true)}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                <Plus size={14} />
                <span>New Voucher</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="p-5 rounded-2xl bg-[#15181e] border border-neutral-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-black text-lg text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1 rounded-xl">
                        {coupon.code}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          coupon.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                        }`}
                      >
                        {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 font-medium mb-3">{coupon.description || 'Special Discount'}</p>

                    <div className="space-y-1 text-xs text-neutral-400">
                      <div>
                        <strong>Discount:</strong> {coupon.discountValue}
                        {coupon.discountType === 'percentage' ? '%' : '₹'}
                      </div>
                      <div>
                        <strong>Min Spend:</strong> ₹{coupon.minSpend}
                      </div>
                      <div>
                        <strong>Min Quantity:</strong> {coupon.minQty} poster(s)
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 transition cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* ADD / EDIT PRODUCT MODAL                                                  */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181e] border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                {editingProduct ? 'Edit Poster Details' : 'Add New Poster to Database'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 font-bold mb-1">Poster Title</label>
                <input
                  type="text"
                  required
                  value={productFormData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setProductFormData({
                      ...productFormData,
                      title,
                      slug: editingProduct ? productFormData.slug : autoSlug,
                    });
                  }}
                  className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={productFormData.slug}
                    onChange={(e) => setProductFormData({ ...productFormData, slug: e.target.value })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    placeholder="anime, marvel-dc, cinema..."
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productFormData.price}
                    onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1">MRP / Compare (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productFormData.compareAtPrice}
                    onChange={(e) => setProductFormData({ ...productFormData, compareAtPrice: Number(e.target.value) })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Stock</label>
                  <input
                    type="number"
                    value={productFormData.stock}
                    onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Image URL</label>
                <input
                  type="text"
                  required
                  value={productFormData.images[0] || ''}
                  onChange={(e) => setProductFormData({ ...productFormData, images: [e.target.value] })}
                  placeholder="/assets/posters/poster-01.jpg or https://..."
                  className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={productFormData.isBestSeller}
                    onChange={(e) => setProductFormData({ ...productFormData, isBestSeller: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-sky-500 focus:ring-0"
                  />
                  <span>Mark as Bestseller</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={productFormData.isNewRelease}
                    onChange={(e) => setProductFormData({ ...productFormData, isNewRelease: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-sky-500 focus:ring-0"
                  />
                  <span>Mark as New Release</span>
                </label>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-sky-500/20"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE COUPON MODAL                                                       */}
      {/* ========================================================================= */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181e] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Create New Voucher</h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 font-bold mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  value={couponFormData.code}
                  onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FLASH20"
                  className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={couponFormData.description}
                  onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                  placeholder="Extra 20% OFF on all prints"
                  className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Discount (% or ₹)</label>
                  <input
                    type="number"
                    required
                    value={couponFormData.discountValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Discount Type</label>
                  <select
                    value={couponFormData.discountType}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={couponFormData.minSpend}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minSpend: Number(e.target.value) })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Min Item Quantity</label>
                  <input
                    type="number"
                    value={couponFormData.minQty}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minQty: Number(e.target.value) })}
                    className="w-full bg-[#0d0f12] border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-sky-500/20"
                >
                  Create Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL PRINTABLE TAX INVOICE MODAL                                      */}
      {/* ========================================================================= */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-neutral-900">TAX INVOICE</span>
                <span className="text-xs text-neutral-500 font-mono">#{selectedOrderForInvoice.orderNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForInvoice(null)}
                  className="text-neutral-500 hover:text-black p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Official Tax Invoice Content */}
            <div className="space-y-6 text-xs text-neutral-800">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black text-neutral-900">POSTGENZ STUDIO PRIVATE LIMITED</h2>
                  <p className="text-neutral-600 mt-0.5">
                    Fulfillment Hub: 417, Satyamev Eminence, Science City Road, Sola<br />
                    Ahmedabad, Gujarat – 380060, India<br />
                    <strong>GSTIN:</strong> 24AABCP8921K1ZM | <strong>CIN:</strong> U74999GJ2023PTC142859<br />
                    <strong>Support:</strong> dungeons.support@gmail.com | +91 9265964547
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-neutral-900">
                    Invoice No: INV-PG-{selectedOrderForInvoice.orderNumber}
                  </div>
                  <div className="text-neutral-600">
                    Date:{' '}
                    {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <strong className="block text-neutral-900 mb-1">Bill To &amp; Ship To:</strong>
                  <div>{selectedOrderForInvoice.customerName}</div>
                  <div className="text-neutral-600">
                    {selectedOrderForInvoice.shippingAddress?.flat}, {selectedOrderForInvoice.shippingAddress?.locality}<br />
                    {selectedOrderForInvoice.shippingAddress?.city}, {selectedOrderForInvoice.shippingAddress?.state} – {selectedOrderForInvoice.shippingAddress?.pincode}
                  </div>
                  <div className="mt-1 font-semibold">Mobile: +91 {selectedOrderForInvoice.customerPhone}</div>
                </div>
                <div className="text-right space-y-1">
                  <div><strong>Payment Method:</strong> {selectedOrderForInvoice.paymentMethod.toUpperCase()}</div>
                  <div><strong>Payment Status:</strong> {selectedOrderForInvoice.paymentStatus}</div>
                  <div><strong>Fulfillment Status:</strong> {selectedOrderForInvoice.fulfillmentStatus}</div>
                  {selectedOrderForInvoice.trackingNumber && (
                    <div><strong>Tracking #:</strong> {selectedOrderForInvoice.trackingNumber}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-neutral-200 text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {selectedOrderForInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">{idx + 1}</td>
                      <td className="p-2.5 font-bold">{item.title}</td>
                      <td className="p-2.5">{item.size}</td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatPrice(item.price)}</td>
                      <td className="p-2.5 text-right font-bold">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedOrderForInvoice.subtotal)}</span>
                  </div>
                  {selectedOrderForInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Discount:</span>
                      <span>− {formatPrice(selectedOrderForInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span className="text-emerald-700 font-bold">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm font-black border-t border-neutral-300 pt-2 text-neutral-900">
                    <span>Total Amount:</span>
                    <span>{formatPrice(selectedOrderForInvoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
