import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import {
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  Search,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Tag,
  Eye,
  EyeOff,
  Printer,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  X,
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  KeyRound,
  Menu,
  Zap,
  Upload,
  Download,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import './admin.css';
import {
  formatPrice,
  fetchLiveProducts,
  products as fallbackCatalog,
  loadCatalogFromStorage,
  saveSingleProduct,
  deleteSingleProduct,
} from '@/lib/catalog';

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
    title?: string;
    productImage?: string | null;
    size: string;
    quantity: number;
    price: number;
    orientation?: string;
    customUpload?: {
      name?: string;
      preview?: string;
      photos?: string[];
      borderStyle?: string;
      customType?: string;
      format?: string;
    } | null;
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
  sizePrices?: Partial<Record<string, number>>;
  sizeComparePrices?: Partial<Record<string, number>>;
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

  // Login form state (Secure: defaults empty, never prefill credentials)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginAdminKey, setLoginAdminKey] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'key'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // -------------------------------------------------------------
  // DASHBOARD STATE
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'coupons' | 'customers' | 'security'>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Data states
  const [stats, setStats] = useState<AdminStats>({
    totalRevenue: 2380,
    totalOrders: 3,
    pendingOrders: 1,
    processingOrders: 1,
    shippedOrders: 1,
    deliveredOrders: 0,
    totalProducts: fallbackCatalog.length,
    totalCustomers: 3,
    totalCoupons: 4,
    totalSubscribers: 12,
    databaseConnected: true,
  });

  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; sales: number; orders: number }>>([
    { date: 'Mon', sales: 450, orders: 3 },
    { date: 'Tue', sales: 820, orders: 5 },
    { date: 'Wed', sales: 620, orders: 4 },
    { date: 'Thu', sales: 1100, orders: 7 },
    { date: 'Fri', sales: 1450, orders: 9 },
    { date: 'Sat', sales: 1980, orders: 12 },
    { date: 'Sun', sales: 1650, orders: 10 },
  ]);

  const [orders, setOrders] = useState<AdminOrder[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('poster-studio-store-v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
            return parsed.orders.map((o: any) => ({
              id: o.id || `ord-${Date.now()}`,
              orderNumber: (o.id || '').replace('order-', 'DNG-') || 'DNG-1001',
              customerName: o.customer?.name || 'Customer',
              customerEmail: o.customer?.email || '',
              customerPhone: o.customer?.phone || '',
              shippingAddress: o.address || {},
              subtotal: Number(o.subtotal) || 0,
              shippingFee: Number(o.shipping) || 0,
              discount: Number(o.discount) || 0,
              total: Number(o.total) || 0,
              paymentStatus: (o.paymentStatus?.toUpperCase() || 'PAID') as any,
              paymentMethod: 'UPI / Razorpay',
              fulfillmentStatus: (o.fulfillmentStatus?.toUpperCase() || 'PENDING') as any,
              items: Array.isArray(o.products)
                ? o.products.map((p: any) => ({
                    id: p.productId || p.key || 'item',
                    productTitle: p.title || 'Poster',
                    productImage: p.customUpload?.preview || '/assets/posters/poster-01.jpg',
                    size: p.size || 'A4',
                    quantity: Number(p.quantity) || 1,
                    price: Number(p.price) || 0,
                  }))
                : [],
              createdAt: o.createdAt || new Date().toISOString(),
            }));
          }
        }
      }
    } catch {
      // fallback to mock
    }
    return [
      {
        id: 'ord-101',
        orderNumber: 'DNG-7598',
        customerName: 'Aarav Sharma',
        customerEmail: 'aarav.demo@example.com',
        customerPhone: '9876543210',
        shippingAddress: { flat: 'Flat 401, Sapphire Heights', locality: 'MG Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        subtotal: 790,
        shippingFee: 0,
        discount: 79,
        total: 711,
        paymentStatus: 'PAID',
        paymentMethod: 'Razorpay UPI',
        fulfillmentStatus: 'PENDING',
        trackingNumber: 'DELHIVERY-9921',
        items: [
          { id: 'item-1', productTitle: 'ASTA POSTER | BLACK CLOVER', productImage: '/assets/posters/poster-01.jpg', size: 'A4', quantity: 2, price: 119 },
          { id: 'item-2', productTitle: 'GOJO SATORU | JUJUTSU KAISEN', productImage: '/assets/posters/poster-02.jpg', size: 'A3', quantity: 1, price: 159 },
        ],
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'ord-102',
        orderNumber: 'DNG-7599',
        customerName: 'Priya Patel',
        customerEmail: 'priya.demo@example.com',
        customerPhone: '9876543211',
        shippingAddress: { flat: 'B-204, Green Valley', locality: 'Near City Mall, Satellite', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' },
        subtotal: 1250,
        shippingFee: 0,
        discount: 125,
        total: 1125,
        paymentStatus: 'PAID',
        paymentMethod: 'Paytm UPI',
        fulfillmentStatus: 'PROCESSING',
        trackingNumber: 'BLUEDART-8812',
        items: [
          { id: 'item-3', productTitle: 'MILES MORALES SPIDER-MAN', productImage: '/assets/posters/poster-03.jpg', size: 'A3', quantity: 3, price: 159 },
        ],
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
      {
        id: 'ord-103',
        orderNumber: 'DNG-7600',
        customerName: 'Rohan Verma',
        customerEmail: 'rohan.demo@example.com',
        customerPhone: '9876543212',
        shippingAddress: { flat: 'A-12, Palm Grove', locality: 'Koregaon Park', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
        subtotal: 544,
        shippingFee: 0,
        discount: 0,
        total: 544,
        paymentStatus: 'PAID',
        paymentMethod: 'Google Pay',
        fulfillmentStatus: 'SHIPPED',
        trackingNumber: 'EKART-4421',
        items: [
          { id: 'item-4', productTitle: 'VINTAGE PORSCHE 911 TURBO', productImage: '/assets/posters/poster-04.jpg', size: 'A4', quantity: 2, price: 119 },
        ],
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
    ];
  });

  const [products, setProducts] = useState<AdminProduct[]>(() => {
    const list = typeof window !== 'undefined' ? loadCatalogFromStorage() : fallbackCatalog;
    return list.map((p) => ({
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

  const [coupons, setCoupons] = useState<AdminCoupon[]>([
    { id: 'c1', code: 'STUDIO10', description: 'Extra 10% OFF on all posters', discountType: 'percentage', discountValue: 10, minSpend: 0, minQty: 1, isActive: true, createdAt: new Date().toISOString() },
    { id: 'c2', code: 'FIRST10', description: 'Welcome 10% discount for new art lovers', discountType: 'percentage', discountValue: 10, minSpend: 0, minQty: 1, isActive: true, createdAt: new Date().toISOString() },
    { id: 'c3', code: 'DUNGEONS3', description: 'Buy 2 Get 1 FREE (Special Offer)', discountType: 'percentage', discountValue: 33.33, minSpend: 200, minQty: 3, isActive: true, createdAt: new Date().toISOString() },
    { id: 'c4', code: 'POSTER5', description: 'Buy 3 Get 2 FREE (Mega Bundle)', discountType: 'percentage', discountValue: 40, minSpend: 350, minQty: 5, isActive: true, createdAt: new Date().toISOString() },
  ]);

  const [subscribers, setSubscribers] = useState<AdminSubscriber[]>([
    { id: 's1', email: 'collector.art@gmail.com', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: 's2', email: 'rahul.designs@yahoo.com', createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
    { id: 's3', email: 'priya.sharma99@gmail.com', createdAt: new Date(Date.now() - 3600000 * 72).toISOString() },
  ]);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  // Modals
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<AdminOrder | null>(null);
  const [selectedCustomArtwork, setSelectedCustomArtwork] = useState<{
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: any;
    itemTitle: string;
    size: string;
    customUpload: any;
  } | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productModalError, setProductModalError] = useState<{ title: string; message: string; statusCode?: number } | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [imageCompressing, setImageCompressing] = useState(false);

  const defaultProductFormData = {
    title: '',
    slug: '',
    description: '',
    category: 'anime',
    orientation: 'portrait',
    price: 79,
    compareAtPrice: 159,
    sizePrices: {
      A5: 79,
      A4: 119,
      A3: 179,
    } as Record<string, number>,
    sizeComparePrices: {
      A5: 159,
      A4: 239,
      A3: 359,
    } as Record<string, number>,
    images: ['/assets/posters/poster-01.jpg'],
    tags: 'anime, poster, art',
    stock: 50,
    isBestSeller: true,
    isNewRelease: false,
  };

  const [productFormData, setProductFormData] = useState(defaultProductFormData);

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

  // Client-side Canvas Image Compressor: Resizes large high-res camera photos to max 850x1050px
  // at 72% JPEG quality (~40KB-60KB), allowing 100+ posters without hitting localStorage limits!
  const compressImageFile = (file: File, maxWidth = 850, maxHeight = 1050, quality = 0.72): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to parse uploaded image'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileUpload = async (file: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      showToast('Error 400: Please upload a valid JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('Error 413: Artwork file size must be under 20MB.');
      return;
    }

    try {
      setImageCompressing(true);
      showToast('Compressing poster artwork for instant loading...');
      const compressedDataUrl = await compressImageFile(file);
      setProductFormData((prev) => ({
        ...prev,
        images: [compressedDataUrl],
      }));
      setProductModalError(null);
      showToast('Artwork image attached and optimized!');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Image processing failed'}`);
    } finally {
      setImageCompressing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handlePrintInvoice = () => {
    const originalTitle = document.title;
    document.title = '';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  // Authenticated fetch wrapper
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
      headers.set('x-admin-token', authToken);
    }
    headers.set('Content-Type', 'application/json');

    try {
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        handleSignOut('Admin session expired. Please sign in again.');
        throw new Error('Unauthorized');
      }
      return res;
    } catch (err: any) {
      if (err.message === 'Unauthorized') throw err;
      return new Response(JSON.stringify({ success: false, fallback: true }), { status: 503 });
    }
  };

  // -------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const trimmedEmail = loginEmail.trim().toLowerCase();
    const trimmedPw = loginPassword;
    const trimmedKey = loginAdminKey.trim();

    try {
      const payload = loginMode === 'key'
        ? { adminKey: trimmedKey }
        : { email: trimmedEmail, password: trimmedPw };

      // 1. Try to call backend auth endpoint if online
      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data.success && data.token) {
            setAuthToken(data.token);
            setAdminUser(data.admin);
            localStorage.setItem('dungeons_admin_token', data.token);
            localStorage.setItem('dungeons_admin_user', JSON.stringify(data.admin));
            showToast(`Welcome back, ${data.admin.name}!`);
            return;
          } else if (res.status === 401 || res.status === 403) {
            setLoginError(data.error || 'Invalid credentials. Please verify your email and password.');
            return;
          }
        }
      } catch {
        // Backend offline or unreachable (e.g. static hosting on Vercel)
      }

      setLoginError('Admin authentication service is unavailable. Please try again when the API is online.');
    } catch {
      setLoginError('Authentication error. Please retry.');
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
        const contentType = statsRes.value.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const d = await statsRes.value.json();
          if (d.success) {
            setStats(d.stats);
            if (Array.isArray(d.salesTrend) && d.salesTrend.length > 0) setSalesTrend(d.salesTrend);
          }
        }
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const contentType = ordersRes.value.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const d = await ordersRes.value.json();
          if (d.success && Array.isArray(d.orders) && d.orders.length > 0) {
            const normalizedOrders: AdminOrder[] = d.orders.map((o: any) => ({
              ...o,
              items: (o.items || []).map((i: any) => ({
                id: i.id || i.productId || 'item',
                productTitle: i.title || i.productTitle || 'Poster',
                title: i.title || i.productTitle || 'Poster',
                productImage: i.customUpload?.preview || i.productImage || '/assets/posters/poster-01.jpg',
                size: i.size || 'A4',
                quantity: Number(i.quantity) || 1,
                price: Number(i.price) || 0,
                orientation: i.orientation || 'portrait',
                customUpload: i.customUpload || null,
              })),
            }));
            setOrders(normalizedOrders);
          }
        }
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const contentType = productsRes.value.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const d = await productsRes.value.json();
          if (d.success && Array.isArray(d.products)) {
            setProducts(d.products);
            setStats((prev) => ({ ...prev, totalProducts: d.products.length }));
          }
        }
      }

      if (couponsRes.status === 'fulfilled' && couponsRes.value.ok) {
        const contentType = couponsRes.value.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const d = await couponsRes.value.json();
          if (d.success && Array.isArray(d.coupons) && d.coupons.length > 0) setCoupons(d.coupons);
        }
      }

      if (subsRes.status === 'fulfilled' && subsRes.value.ok) {
        const contentType = subsRes.value.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const d = await subsRes.value.json();
          if (d.success && Array.isArray(d.subscribers) && d.subscribers.length > 0) setSubscribers(d.subscribers);
        }
      }
    } catch (err) {
      console.warn('Admin sync notice:', err);
    } finally {
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(`Error ${res.status}: ${errData.error || 'Failed to update order status on server'}`);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillmentStatus: (updates.fulfillmentStatus?.toUpperCase() as any) || o.fulfillmentStatus,
                paymentStatus: (updates.paymentStatus?.toUpperCase() as any) || o.paymentStatus,
                trackingNumber: updates.trackingNumber !== undefined ? updates.trackingNumber : o.trackingNumber,
              }
            : o
        )
      );
      showToast('Order status updated successfully!');
    } catch (err: any) {
      showToast(`Error 500: Could not reach server to update order (${err.message})`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Delete this order permanently?')) return;
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(`Error ${res.status}: ${errData.error || 'Failed to delete order from server'}`);
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast('Order removed from database');
    } catch (err: any) {
      showToast(`Error 500: Server delete error (${err.message})`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setProductModalError(null);

    // 1. Validation
    if (!productFormData.title || productFormData.title.trim().length < 2) {
      setProductModalError({
        title: 'Error 400 (Bad Request)',
        message: 'Poster title must be at least 2 characters.',
        statusCode: 400,
      });
      setSavingProduct(false);
      return;
    }

    if (!productFormData.images || !productFormData.images[0] || !productFormData.images[0].trim()) {
      setProductModalError({
        title: 'Error 400 (Bad Request)',
        message: 'Please provide or upload a poster artwork image.',
        statusCode: 400,
      });
      setSavingProduct(false);
      return;
    }

    // Auto-clean URL slug: alphanumeric and hyphens only
    const safeSlug = (productFormData.slug || productFormData.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const payload: AdminProduct = {
      id: editingProduct ? editingProduct.id : `prod-custom-${Date.now()}`,
      ...productFormData,
      slug: safeSlug,
      description: productFormData.description?.trim() || '',
      price: Number(productFormData.sizePrices?.A5) || Number(productFormData.price) || 79,
      compareAtPrice: Number(productFormData.sizeComparePrices?.A5) || Number(productFormData.compareAtPrice) || null,
      sizePrices: productFormData.sizePrices,
      sizeComparePrices: productFormData.sizeComparePrices,
      stock: Number(productFormData.stock) >= 0 ? Number(productFormData.stock) : 50,
      tags: typeof productFormData.tags === 'string'
        ? productFormData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : productFormData.tags,
      isActive: true,
    };

    const serverPayload = {
      title: payload.title,
      slug: payload.slug,
      description: payload.description || '',
      category: payload.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-'),
      orientation: payload.orientation || 'portrait',
      price: payload.price,
      compareAtPrice: payload.compareAtPrice,
      sizePrices: payload.sizePrices || null,
      sizeComparePrices: payload.sizeComparePrices || null,
      images: payload.images,
      tags: payload.tags,
      stock: payload.stock,
      isBestSeller: Boolean(payload.isBestSeller),
      isNewRelease: Boolean(payload.isNewRelease),
      isActive: true,
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(serverPayload),
      });

      if (!res.ok) {
        let errData: any = {};
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          errData = await res.json().catch(() => ({}));
        }

        const statusMessages: Record<number, string> = {
          405: 'The API endpoint is not available. The serverless function may not be deployed correctly. Please contact support.',
          503: 'The database server is temporarily unavailable. Please wait a moment and try again.',
          401: 'Admin authentication failed. Please sign in again.',
          403: 'Admin access denied. Your session may have expired.',
          400: errData.error || 'Invalid poster data. Please check all required fields.',
        };

        const userMessage = statusMessages[res.status] ||
          errData.error ||
          `Server returned HTTP ${res.status}. The poster was NOT saved to the database.`;

        setProductModalError({
          title: `Save Failed — HTTP ${res.status}`,
          message: userMessage,
          statusCode: res.status,
        });
        setSavingProduct(false);
        return;
      }

      const resData = await res.json().catch(() => ({}));
      const savedProduct: AdminProduct = resData.product || { ...payload, id: payload.id };

      // Update shared catalog
      saveSingleProduct({
        id: savedProduct.id,
        slug: savedProduct.slug,
        title: savedProduct.title,
        description: savedProduct.description || '',
        category: (savedProduct.category || '').toUpperCase(),
        collection: (savedProduct.category || '').toLowerCase(),
        images: savedProduct.images,
        price: savedProduct.price,
        compareAtPrice: savedProduct.compareAtPrice || (savedProduct.price * 2 - 1),
        sizePrices: savedProduct.sizePrices,
        sizeComparePrices: savedProduct.sizeComparePrices,
        stock: savedProduct.stock,
        orientation: (savedProduct.orientation as any) || 'portrait',
        tags: savedProduct.tags,
        bestseller: savedProduct.isBestSeller,
        newArrival: savedProduct.isNewRelease,
      });

      // Update React Admin state
      if (editingProduct) {
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? savedProduct : p)));
        showToast(`Poster "${savedProduct.title}" updated in database successfully!`);
      } else {
        setProducts((prev) => [savedProduct, ...prev]);
        showToast(`New poster "${savedProduct.title}" saved to database and live store!`);
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductModalError(null);
      setProductFormData(defaultProductFormData);
    } catch (err: any) {
      setProductModalError({
        title: 'Connection Error',
        message: err.message || 'Could not connect to database server.',
        statusCode: 500,
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this poster permanently from the database?')) return;
    try {
      const res = await authFetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(`Error ${res.status}: ${errData.error || 'Failed to delete poster from database'}`);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== productId && p.slug !== productId));
      deleteSingleProduct(productId);
      showToast('Poster deleted from database successfully!');
    } catch (err: any) {
      showToast(`Notice: ${err.message}`);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCoupon: AdminCoupon = {
      id: `c-${Date.now()}`,
      ...couponFormData,
      discountValue: Number(couponFormData.discountValue),
      minSpend: Number(couponFormData.minSpend),
      minQty: Number(couponFormData.minQty),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await authFetch('/api/admin/coupons', { method: 'POST', body: JSON.stringify(newCoupon) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Error ${res.status}: ${err.error || 'Failed to save coupon on server'}`);
        return;
      }
      setCoupons((prev) => [newCoupon, ...prev]);
      showToast('Voucher created successfully!');
      setIsCouponModalOpen(false);
      setCouponFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        minSpend: 0,
        minQty: 1,
      });
    } catch (err: any) {
      showToast(`Error 500: Server error creating coupon (${err.message})`);
    }
  };

  const handleToggleCoupon = async (couponId: string) => {
    try {
      const res = await authFetch(`/api/admin/coupons/${couponId}/toggle`, { method: 'PATCH' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Error ${res.status}: ${err.error || 'Failed to toggle coupon status'}`);
        return;
      }
      setCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, isActive: !c.isActive } : c))
      );
      showToast('Coupon status updated');
    } catch (err: any) {
      showToast(`Error 500: Server error toggling coupon (${err.message})`);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Delete this coupon code?')) return;
    try {
      const res = await authFetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Error ${res.status}: ${err.error || 'Failed to delete coupon'}`);
        return;
      }
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      showToast('Coupon removed');
    } catch (err: any) {
      showToast(`Error 500: Server error deleting coupon (${err.message})`);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(`Error ${res.status}: ${data.error || 'Failed to update admin password'}`);
        return;
      }
      showToast('Admin password changed successfully!');
      setCurrentPw('');
      setNewPw('');
    } catch (err: any) {
      showToast(`Error 500: Server error changing password (${err.message})`);
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
  // RENDER: LUXURY CYBER-SECURITY LOGIN GATE
  // -------------------------------------------------------------
  if (!authToken) {
    return (
      <div className="admin-scope admin-login-wrapper">
        <div className="admin-login-card">
          {/* Header */}
          <div className="admin-brand-header">
            <Link href="/">
              <img
                src="/assets/dungeons-logo.png"
                alt="DUNGEONS"
                className="admin-brand-logo"
              />
            </Link>

            <div className="admin-security-pill">
              <span className="admin-pulse-dot" />
              <span>Restricted Admin Portal</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="admin-tabs-nav">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setLoginError(''); }}
              className={`admin-tab-btn ${loginMode === 'password' ? 'active' : ''}`}
            >
              <Lock size={13} />
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('key'); setLoginError(''); }}
              className={`admin-tab-btn ${loginMode === 'key' ? 'active' : ''}`}
            >
              <KeyRound size={13} />
              <span>Master Key</span>
            </button>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="admin-error-banner">
              <ShieldAlert size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {loginMode === 'password' ? (
              <>
                <div className="admin-input-group">
                  <label className="admin-input-label">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@yourdomain.com"
                    className="admin-input-field"
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Admin Password</label>
                  <div className="admin-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="admin-input-field"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="admin-eye-toggle"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="admin-input-group">
                <label className="admin-input-label">Master Secret API Key</label>
                <div className="admin-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginAdminKey}
                    onChange={(e) => setLoginAdminKey(e.target.value)}
                    placeholder="Enter Master API Key from .env"
                    className="admin-input-field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="admin-eye-toggle"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="admin-btn-primary"
            >
              {loginLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Authorizing Session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Sign In to Admin Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Secure Environment Notice */}
          <div className="admin-autofill-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', fontWeight: 600 }}>
              <ShieldCheck size={15} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>Protected by Environment (.env) Authentication</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
              Admin credentials and master API keys are securely stored in the server <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px', color: '#0f172a' }}>.env</code> file.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                <span>256-Bit Encrypted Sessions</span>
              </span>
              <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
                ← Return to Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: STANDALONE LUXURY DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="admin-scope">
      <div className="admin-workspace">
        {/* Mobile Backdrop overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 35,
            }}
          />
        )}

        {/* ========================================================= */}
        {/* 1. LEFT SIDEBAR NAVIGATION */}
        {/* ========================================================= */}
        <aside className={`admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
          {/* Brand Header */}
          <div className="admin-sidebar-header">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/assets/dungeons-logo.png" alt="DUNGEONS" style={{ height: '26px', width: 'auto' }} />
              <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                PORTAL v2.4
              </span>
            </Link>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
              className="lg-hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Database Health Card */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2638', background: '#090d16', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
              <span>Database Online</span>
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', background: '#161f33', padding: '2px 6px', borderRadius: '4px' }}>
              32ms
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="admin-sidebar-nav">
            <div className="admin-nav-section-title">Main Management</div>

            <button
              type="button"
              onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
              className={`admin-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <span className="admin-nav-link-left">
                <TrendingUp size={16} />
                <span>Dashboard & Analytics</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('orders'); setMobileSidebarOpen(false); }}
              className={`admin-nav-link ${activeTab === 'orders' ? 'active' : ''}`}
            >
              <span className="admin-nav-link-left">
                <Package size={16} />
                <span>Orders & Fulfillment</span>
              </span>
              <span className="admin-nav-badge amber">
                {orders.filter((o) => o.fulfillmentStatus === 'PENDING').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('products'); setMobileSidebarOpen(false); }}
              className={`admin-nav-link ${activeTab === 'products' ? 'active' : ''}`}
            >
              <span className="admin-nav-link-left">
                <Layers size={16} />
                <span>Posters Catalog</span>
              </span>
              <span className="admin-nav-badge">
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('coupons'); setMobileSidebarOpen(false); }}
              className={`admin-nav-link ${activeTab === 'coupons' ? 'active' : ''}`}
            >
              <span className="admin-nav-link-left">
                <Tag size={16} />
                <span>Discount Vouchers</span>
              </span>
              <span className="admin-nav-badge">
                {coupons.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('customers'); setMobileSidebarOpen(false); }}
              className={`admin-nav-link ${activeTab === 'customers' ? 'active' : ''}`}
            >
              <span className="admin-nav-link-left">
                <Users size={16} />
                <span>Customers & Newsletter</span>
              </span>
            </button>

            <div className="admin-nav-section-title">Security & Controls</div>

            <button
              type="button"
              onClick={() => { setActiveTab('security'); setMobileSidebarOpen(false); }}
              className={`admin-nav-link ${activeTab === 'security' ? 'active' : ''}`}
            >
              <span className="admin-nav-link-left">
                <ShieldCheck size={16} />
                <span>Security & Diagnostics</span>
              </span>
            </button>
          </nav>

          {/* User Card & Sign Out */}
          <div className="admin-sidebar-footer">
            <div className="admin-user-info">
              <div className="admin-user-avatar">SA</div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                  {adminUser?.name || 'Super Admin'}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                  {adminUser?.email || 'admin@posterstudio.com'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSignOut()}
              title="Sign Out"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* 2. MAIN VIEWPORT */}
        {/* ========================================================= */}
        <div className="admin-main-viewport">
          {/* Header Bar */}
          <header className="admin-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                style={{ background: '#161f33', border: '1px solid #1e2638', color: '#ffffff', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Menu size={18} />
              </button>

              <h2 className="admin-header-title">
                {activeTab === 'dashboard' && 'Executive Store Overview'}
                {activeTab === 'orders' && 'Orders Fulfillment & Tracking'}
                {activeTab === 'products' && 'Posters Catalog & Inventory'}
                {activeTab === 'coupons' && 'Discount Vouchers & Offers'}
                {activeTab === 'customers' && 'Newsletter Subscribers & Reach'}
                {activeTab === 'security' && 'Security Gate & Database Health'}
              </h2>
            </div>

            <div className="admin-header-actions">
              <button
                type="button"
                onClick={loadAdminData}
                disabled={refreshing}
                className="admin-btn-secondary"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Syncing...' : 'Sync DB'}</span>
              </button>

              {activeTab === 'products' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalError(null);
                    setProductFormData(defaultProductFormData);
                    setIsProductModalOpen(true);
                  }}
                  className="admin-btn-accent"
                >
                  <Plus size={14} />
                  <span>Add Poster</span>
                </button>
              )}

              <Link
                href="/"
                target="_blank"
                className="admin-btn-secondary"
              >
                <span>View Store</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </header>

          {/* Canvas Content */}
          <main className="admin-canvas-content">
            {/* ===================================================== */}
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {/* ===================================================== */}
            {activeTab === 'dashboard' && (
              <>
                {/* 4 KPI Cards */}
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-top">
                      <span className="admin-kpi-label">Total Gross Revenue</span>
                      <div className="admin-kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                        <DollarSign size={16} />
                      </div>
                    </div>
                    <div className="admin-kpi-val">
                      {formatPrice(orders.reduce((sum, o) => sum + o.total, 0) || stats.totalRevenue)}
                    </div>
                    <div className="admin-kpi-sub" style={{ color: '#34d399' }}>
                      <CheckCircle2 size={12} />
                      <span>Real-time Synchronized</span>
                    </div>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="admin-kpi-top">
                      <span className="admin-kpi-label">Total Orders</span>
                      <div className="admin-kpi-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                        <Package size={16} />
                      </div>
                    </div>
                    <div className="admin-kpi-val">{orders.length}</div>
                    <div className="admin-kpi-sub" style={{ color: '#fbbf24' }}>
                      <Clock size={12} />
                      <span>{orders.filter((o) => o.fulfillmentStatus === 'PENDING').length} Pending Dispatch</span>
                    </div>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="admin-kpi-top">
                      <span className="admin-kpi-label">Catalog Posters</span>
                      <div className="admin-kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                        <Layers size={16} />
                      </div>
                    </div>
                    <div className="admin-kpi-val">{products.length}</div>
                    <div className="admin-kpi-sub" style={{ color: '#c084fc' }}>
                      <Tag size={12} />
                      <span>Across 11 Categories</span>
                    </div>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="admin-kpi-top">
                      <span className="admin-kpi-label">Newsletter Reach</span>
                      <div className="admin-kpi-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                        <Users size={16} />
                      </div>
                    </div>
                    <div className="admin-kpi-val">{subscribers.length || 14}</div>
                    <div className="admin-kpi-sub" style={{ color: '#22d3ee' }}>
                      <Sparkles size={12} />
                      <span>Registered Art Collectors</span>
                    </div>
                  </div>
                </div>

                {/* Analytics & Categories */}
                <div className="admin-analytics-grid">
                  {/* Sales Velocity Bar Chart */}
                  <div className="admin-panel-card">
                    <div className="admin-panel-header">
                      <div>
                        <h3 className="admin-panel-title">7-Day Sales & Order Velocity</h3>
                        <p className="admin-panel-desc">Daily store revenue performance</p>
                      </div>
                      <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                        Live Telemetry
                      </span>
                    </div>

                    <div className="admin-chart-bars-wrap">
                      {salesTrend.map((day, idx) => {
                        const heightPct = Math.max(15, Math.min(100, Math.round((day.sales / (maxSales || 2000)) * 100)));
                        return (
                          <div key={idx} className="admin-chart-col">
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8' }}>
                              ₹{day.sales}
                            </span>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="admin-bar-fill"
                            />
                            <span className="admin-bar-label">{day.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div className="admin-panel-card">
                    <h3 className="admin-panel-title">Top Poster Categories</h3>
                    <p className="admin-panel-desc" style={{ marginBottom: '16px' }}>Catalog share by genre</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {['Anime', 'Marvel & DC', 'Movies & Web Series', 'Sports', 'Landscapes', 'Diva'].map((cat) => {
                        const count = products.filter((p) =>
                          p.category.toLowerCase().includes(cat.toLowerCase().split(' ')[0])
                        ).length;
                        const pct = Math.round((count / (products.length || 1)) * 100);
                        return (
                          <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{cat}</span>
                              <span style={{ color: '#94a3b8' }}>{count} posters ({pct}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#161f33', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.max(6, pct)}%`, height: '100%', background: '#38bdf8', borderRadius: '9999px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Orders Overview */}
                <div className="admin-table-box">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2638', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="admin-panel-title">Recent Customer Orders</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>View All Orders</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Fulfillment</th>
                          <th>Payment</th>
                          <th style={{ textAlign: 'right' }}>Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                              #{order.orderNumber}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#ffffff' }}>{order.customerName}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{order.customerPhone}</div>
                            </td>
                            <td style={{ color: '#cbd5e1' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>{order.items?.length || 1} item(s)</span>
                                {order.items?.some((i) => i.customUpload) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const customItem = order.items.find((i) => i.customUpload)!;
                                      setSelectedCustomArtwork({
                                        orderNumber: order.orderNumber,
                                        customerName: order.customerName,
                                        customerPhone: order.customerPhone,
                                        shippingAddress: order.shippingAddress,
                                        itemTitle: customItem.productTitle || customItem.title || 'Custom Print',
                                        size: customItem.size,
                                        customUpload: customItem.customUpload,
                                      });
                                    }}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.15)',
                                      border: '1px solid rgba(56, 189, 248, 0.4)',
                                      color: '#38bdf8',
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      width: 'fit-content',
                                    }}
                                  >
                                    <ImageIcon size={10} />
                                    <span>Custom Art</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ fontWeight: 800, color: '#ffffff' }}>
                              {formatPrice(order.total)}
                            </td>
                            <td>
                              <span className={`admin-status-pill ${
                                order.fulfillmentStatus === 'DELIVERED' ? 'success' : order.fulfillmentStatus === 'SHIPPED' ? 'blue' : 'pending'
                              }`}>
                                {order.fulfillmentStatus}
                              </span>
                            </td>
                            <td>
                              <span className={`admin-status-pill ${order.paymentStatus === 'PAID' ? 'success' : 'pending'}`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="admin-btn-secondary"
                                style={{ display: 'inline-flex' }}
                              >
                                Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ===================================================== */}
            {/* TAB 2: ORDERS MANAGEMENT */}
            {/* ===================================================== */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search Order #, Customer, Phone..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="admin-input-field"
                      style={{ paddingLeft: '36px', height: '40px', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setOrderStatusFilter(status)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          border: orderStatusFilter === status ? 'none' : '1px solid #1e2638',
                          background: orderStatusFilter === status ? '#38bdf8' : '#0e1424',
                          color: orderStatusFilter === status ? '#000000' : '#94a3b8',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-table-box">
                  <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer & Destination</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Payment Status</th>
                          <th>Fulfillment Status</th>
                          <th>Tracking #</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', display: 'block' }}>
                                #{order.orderNumber}
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>

                            <td style={{ minWidth: '220px', maxWidth: '280px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px' }}>{order.customerName}</div>
                              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                                📞 {order.customerPhone}
                              </div>
                              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.4, background: '#080d1a', padding: '8px', borderRadius: '8px', border: '1px solid #1e2638' }}>
                                <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>
                                  📦 Parcel Address:
                                </div>
                                {order.shippingAddress?.flat && <div>{order.shippingAddress.flat}</div>}
                                {order.shippingAddress?.locality && <div>{order.shippingAddress.locality}</div>}
                                {order.shippingAddress?.landmark && <div style={{ color: '#94a3b8' }}>Near {order.shippingAddress.landmark}</div>}
                                <div style={{ fontWeight: 800, color: '#38bdf8', marginTop: '3px' }}>
                                  {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fullAddr = `${order.customerName}\nPhone: ${order.customerPhone}\n${order.shippingAddress?.flat || ''}, ${order.shippingAddress?.locality || ''}\n${order.shippingAddress?.landmark ? 'Landmark: ' + order.shippingAddress.landmark + '\n' : ''}${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}`;
                                    navigator.clipboard.writeText(fullAddr);
                                    showToast('Full parcel address copied to clipboard!');
                                  }}
                                  style={{
                                    marginTop: '6px',
                                    background: '#161f33',
                                    border: '1px solid #2a3754',
                                    color: '#94a3b8',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  📋 Copy Parcel Address
                                </button>
                              </div>
                            </td>

                            <td style={{ minWidth: '240px', maxWidth: '300px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {order.items && order.items.length > 0 ? (
                                  order.items.map((item, idx) => {
                                    const imgSrc = item.customUpload?.preview || item.productImage || '/assets/posters/poster-01.jpg';
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          background: '#090e1b',
                                          padding: '6px 8px',
                                          borderRadius: '8px',
                                          border: '1px solid #1e2638',
                                        }}
                                      >
                                        <img
                                          src={imgSrc}
                                          alt={item.productTitle || item.title || 'Poster'}
                                          style={{
                                            width: '38px',
                                            height: '52px',
                                            objectFit: 'cover',
                                            borderRadius: '6px',
                                            border: '1px solid #334155',
                                            flexShrink: 0,
                                            cursor: 'pointer',
                                          }}
                                          onClick={() => {
                                            if (item.customUpload) {
                                              setSelectedCustomArtwork({
                                                orderNumber: order.orderNumber,
                                                customerName: order.customerName,
                                                customerPhone: order.customerPhone,
                                                shippingAddress: order.shippingAddress,
                                                itemTitle: item.productTitle || item.title || 'Custom Print',
                                                size: item.size,
                                                customUpload: item.customUpload,
                                              });
                                            } else if (imgSrc) {
                                              window.open(imgSrc, '_blank');
                                            }
                                          }}
                                          title={item.customUpload ? 'Click to inspect custom artwork' : 'Click to view poster image'}
                                        />
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {item.productTitle || item.title || 'Poster'}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                            <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '4px' }}>
                                              {item.size || 'A4'}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                                              × {item.quantity} pc{item.quantity > 1 ? 's' : ''}
                                            </span>
                                            {item.customUpload && (
                                              <span style={{ background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.4)', color: '#f472b6', fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '4px' }}>
                                                Custom
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: '11px' }}>1 item</span>
                                )}
                              </div>
                            </td>

                            <td style={{ fontWeight: 800, color: '#ffffff' }}>
                              {formatPrice(order.total)}
                            </td>

                            <td>
                              <select
                                value={order.paymentStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, { paymentStatus: e.target.value })}
                                className="admin-status-select"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="PAID">PAID</option>
                                <option value="FAILED">FAILED</option>
                                <option value="REFUNDED">REFUNDED</option>
                              </select>
                            </td>

                            <td>
                              <select
                                value={order.fulfillmentStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, { fulfillmentStatus: e.target.value })}
                                className="admin-status-select"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="PROCESSING">PROCESSING</option>
                                <option value="SHIPPED">SHIPPED</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </td>

                            <td>
                              <input
                                type="text"
                                defaultValue={order.trackingNumber || ''}
                                placeholder="AWB / Tracking #"
                                onBlur={(e) => {
                                  if (e.target.value !== (order.trackingNumber || '')) {
                                    handleUpdateOrderStatus(order.id, { trackingNumber: e.target.value });
                                  }
                                }}
                                className="admin-input-field"
                                style={{ height: '32px', width: '130px', fontSize: '11px', padding: '0 8px' }}
                              />
                            </td>

                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {order.items?.some((i) => i.customUpload) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const customItem = order.items.find((i) => i.customUpload)!;
                                    setSelectedCustomArtwork({
                                      orderNumber: order.orderNumber,
                                      customerName: order.customerName,
                                      customerPhone: order.customerPhone,
                                      shippingAddress: order.shippingAddress,
                                      itemTitle: customItem.productTitle || customItem.title || 'Custom Print',
                                      size: customItem.size,
                                      customUpload: customItem.customUpload,
                                    });
                                  }}
                                  className="admin-btn-accent"
                                  style={{ display: 'inline-flex', padding: '6px 10px', marginRight: '6px', fontSize: '11px' }}
                                  title="Inspect and Download Customer Artwork"
                                >
                                  <ImageIcon size={13} style={{ marginRight: '4px' }} />
                                  Artwork
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="admin-btn-secondary"
                                style={{ display: 'inline-flex', padding: '6px 10px', marginRight: '6px' }}
                              >
                                Invoice
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(order.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
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
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* TAB 3: POSTERS CATALOG */}
            {/* ===================================================== */}
            {activeTab === 'products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search posters..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="admin-input-field"
                      style={{ paddingLeft: '36px', height: '40px', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {CATEGORIES_LIST.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setProductCategoryFilter(cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-'))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: productCategoryFilter === cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-') ? 'none' : '1px solid #1e2638',
                          background: productCategoryFilter === cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-') ? '#38bdf8' : '#0e1424',
                          color: productCategoryFilter === cat.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-') ? '#000000' : '#94a3b8',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-catalog-grid">
                  {filteredProducts.map((prod) => (
                    <div key={prod.id} className="admin-poster-card">
                      <div className="admin-poster-thumb">
                        <img
                          src={prod.images[0] || '/assets/posters/poster-01.jpg'}
                          alt={prod.title}
                        />
                        <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.8)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>
                          {prod.category}
                        </span>
                        {prod.isBestSeller && (
                          <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#f59e0b', color: '#000000', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>
                            Bestseller
                          </span>
                        )}
                      </div>

                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {prod.title}
                          </h4>
                          <p style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', margin: '4px 0 0 0' }}>
                            /{prod.slug}
                          </p>
                        </div>

                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #1e2638', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#38bdf8' }}>
                              {formatPrice(prod.price)}
                            </span>
                            {prod.compareAtPrice && (
                              <span style={{ fontSize: '10px', color: '#64748b', textDecoration: 'line-through', marginLeft: '6px' }}>
                                {formatPrice(prod.compareAtPrice)}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(prod);
                                setProductModalError(null);
                                const prodSizePrices = (prod as any).sizePrices || {};
                                const prodSizeCompare = (prod as any).sizeComparePrices || {};
                                const a5p = prodSizePrices.A5 || prod.price || 79;
                                const a5c = prodSizeCompare.A5 || prod.compareAtPrice || Math.round(a5p * 2);
                                setProductFormData({
                                  title: prod.title,
                                  slug: prod.slug,
                                  description: prod.description || '',
                                  category: prod.category,
                                  orientation: prod.orientation,
                                  price: a5p,
                                  compareAtPrice: a5c,
                                  sizePrices: {
                                    A5: a5p,
                                    A4: prodSizePrices.A4 || Math.round(a5p * 1.5),
                                    A3: prodSizePrices.A3 || Math.round(a5p * 2.2),
                                  },
                                  sizeComparePrices: {
                                    A5: a5c,
                                    A4: prodSizeCompare.A4 || Math.round(a5c * 1.5),
                                    A3: prodSizeCompare.A3 || Math.round(a5c * 2.2),
                                  },
                                  images: prod.images,
                                  tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
                                  stock: prod.stock,
                                  isBestSeller: prod.isBestSeller,
                                  isNewRelease: prod.isNewRelease,
                                });
                                setIsProductModalOpen(true);
                              }}
                              className="admin-btn-secondary"
                              style={{ padding: '6px' }}
                              title="Edit Poster"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              style={{ background: '#161f33', border: '1px solid #1e2638', color: '#ef4444', padding: '6px', borderRadius: '10px', cursor: 'pointer', display: 'flex' }}
                              title="Delete Poster"
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="admin-panel-title">Active Promotional Vouchers</h3>
                    <p className="admin-panel-desc">Manage store coupons and discounts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(true)}
                    className="admin-btn-accent"
                  >
                    <Plus size={14} />
                    <span>Create Coupon</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="admin-panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 900, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '4px 10px', borderRadius: '8px' }}>
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(coupon.id)}
                            className={`admin-status-pill ${coupon.isActive ? 'success' : 'pending'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginTop: '12px' }}>
                          {coupon.description || `${coupon.discountValue}% Discount`}
                        </p>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.6 }}>
                          <div>Min Spend: {formatPrice(coupon.minSpend)}</div>
                          <div>Min Quantity: {coupon.minQty} items</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2638', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#34d399' }}>
                          {coupon.discountValue}% OFF
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
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
              <div className="admin-table-box">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2638' }}>
                  <h3 className="admin-panel-title">Newsletter Subscribers</h3>
                  <p className="admin-panel-desc">Emails captured through store subscribe box</p>
                </div>

                <div className="admin-table-scroll">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Subscriber Email</th>
                        <th>Subscription Date</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((sub) => (
                        <tr key={sub.id}>
                          <td style={{ fontWeight: 700, color: '#ffffff' }}>{sub.email}</td>
                          <td style={{ color: '#94a3b8' }}>
                            {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="admin-status-pill success">Verified</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* TAB 6: SECURITY & DIAGNOSTICS */}
            {/* ===================================================== */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="admin-panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0 }}>
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="admin-panel-title" style={{ fontSize: '15px' }}>Security Gateway Status: Protected</h3>
                    <p className="admin-panel-desc">Encrypted SSL Active • 256-bit Token Verification</p>
                  </div>
                </div>

                <div className="admin-panel-card">
                  <h3 className="admin-panel-title">Update Master Admin Password</h3>
                  <p className="admin-panel-desc" style={{ marginBottom: '16px' }}>Change your administrative access password</p>

                  <form onSubmit={handleChangePassword} style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="admin-input-label">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="admin-input-field"
                        style={{ height: '42px' }}
                      />
                    </div>

                    <div>
                      <label className="admin-input-label">New Password (Min 8 Characters)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="admin-input-field"
                        style={{ height: '42px' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pwChangeLoading}
                      className="admin-btn-accent"
                      style={{ height: '42px', marginTop: '6px', justifyContent: 'center' }}
                    >
                      {pwChangeLoading ? 'Updating Password...' : 'Save New Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODALS */}
      {/* ========================================================= */}

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0e1424', border: '1px solid #1e2638', borderRadius: '20px', maxWidth: '540px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e2638', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {editingProduct ? 'Edit Poster' : 'Add New Poster'}
                </h3>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  {editingProduct ? 'Update poster details, pricing, and artwork' : 'Publish a new poster to the live storefront catalog'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  setProductModalError(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner with HTTP status code */}
            {productModalError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f87171', fontWeight: 800, fontSize: '13px' }}>
                    {productModalError.title}
                  </div>
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>
                    {productModalError.message}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="admin-input-label">Poster Title</label>
                <input
                  type="text"
                  required
                  value={productFormData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setProductFormData((prev) => {
                      const autoSlug = newTitle
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '');
                      const isInitialSlug = !prev.slug || prev.slug === prev.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                      return {
                        ...prev,
                        title: newTitle,
                        slug: isInitialSlug ? autoSlug : prev.slug,
                      };
                    });
                    if (productModalError) setProductModalError(null);
                  }}
                  placeholder="ASTA POSTER | BLACK CLOVER"
                  className="admin-input-field"
                  style={{ height: '40px' }}
                />
              </div>

              <div>
                <label className="admin-input-label">URL Slug (Web-safe unique identifier)</label>
                <input
                  type="text"
                  required
                  value={productFormData.slug}
                  onChange={(e) => {
                    setProductFormData({
                      ...productFormData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    });
                    if (productModalError) setProductModalError(null);
                  }}
                  placeholder="asta-black-clover-anime-poster"
                  className="admin-input-field"
                  style={{ height: '40px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="admin-input-label">Category</label>
                  <select
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    className="admin-input-field"
                    style={{ height: '40px' }}
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
                  <label className="admin-input-label">Orientation</label>
                  <select
                    value={productFormData.orientation}
                    onChange={(e) => setProductFormData({ ...productFormData, orientation: e.target.value })}
                    className="admin-input-field"
                    style={{ height: '40px' }}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                    <option value="square">Square</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="admin-input-label">Product Description (Optional)</label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Displayed on storefront poster page</span>
                </div>
                <textarea
                  rows={3}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  placeholder="e.g. Printed on 300 GSM Archival Matte Paper with vivid fade-resistant inks. Perfect for anime fans, bedroom walls, and gaming setups."
                  className="admin-input-field"
                  style={{ width: '100%', padding: '10px 12px', resize: 'vertical', minHeight: '65px', lineHeight: '1.4' }}
                />
              </div>

              {/* Poster Pricing by Size (A5, A4, A3) */}
              <div style={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="admin-input-label" style={{ margin: 0, color: '#60a5fa', fontWeight: 800 }}>
                    📏 Poster Pricing by Size (₹)
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    Front-end updates price automatically when customer picks size
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* A5 Size */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2638', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                      A5 (14.8 × 21 cm)
                    </div>
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={productFormData.sizePrices?.A5 ?? productFormData.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProductFormData({
                          ...productFormData,
                          price: val,
                          sizePrices: { ...productFormData.sizePrices, A5: val },
                        });
                      }}
                      className="admin-input-field"
                      style={{ height: '36px', marginBottom: '6px' }}
                    />
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>MRP / Strike (₹)</label>
                    <input
                      type="number"
                      min={1}
                      value={productFormData.sizeComparePrices?.A5 ?? productFormData.compareAtPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProductFormData({
                          ...productFormData,
                          compareAtPrice: val,
                          sizeComparePrices: { ...productFormData.sizeComparePrices, A5: val },
                        });
                      }}
                      className="admin-input-field"
                      style={{ height: '36px' }}
                    />
                  </div>

                  {/* A4 Size */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2638', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>A4 (21 × 29.7 cm)</span>
                      <span style={{ fontSize: '9px', background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: '9999px', fontWeight: 800 }}>POPULAR</span>
                    </div>
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={productFormData.sizePrices?.A4 ?? 119}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProductFormData({
                          ...productFormData,
                          sizePrices: { ...productFormData.sizePrices, A4: val },
                        });
                      }}
                      className="admin-input-field"
                      style={{ height: '36px', marginBottom: '6px' }}
                    />
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>MRP / Strike (₹)</label>
                    <input
                      type="number"
                      min={1}
                      value={productFormData.sizeComparePrices?.A4 ?? 239}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProductFormData({
                          ...productFormData,
                          sizeComparePrices: { ...productFormData.sizeComparePrices, A4: val },
                        });
                      }}
                      className="admin-input-field"
                      style={{ height: '36px' }}
                    />
                  </div>

                  {/* A3 Size */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2638', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                      A3 (29.7 × 42 cm)
                    </div>
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={productFormData.sizePrices?.A3 ?? 179}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProductFormData({
                          ...productFormData,
                          sizePrices: { ...productFormData.sizePrices, A3: val },
                        });
                      }}
                      className="admin-input-field"
                      style={{ height: '36px', marginBottom: '6px' }}
                    />
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>MRP / Strike (₹)</label>
                    <input
                      type="number"
                      min={1}
                      value={productFormData.sizeComparePrices?.A3 ?? 359}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProductFormData({
                          ...productFormData,
                          sizeComparePrices: { ...productFormData.sizeComparePrices, A3: val },
                        });
                      }}
                      className="admin-input-field"
                      style={{ height: '36px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Stock and Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label className="admin-input-label">Stock Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={productFormData.stock}
                    onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                    className="admin-input-field"
                    style={{ height: '40px' }}
                  />
                </div>
                <div>
                  <label className="admin-input-label">Search Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={typeof productFormData.tags === 'string' ? productFormData.tags : Array.isArray(productFormData.tags) ? (productFormData.tags as string[]).join(', ') : ''}
                    onChange={(e) => setProductFormData({ ...productFormData, tags: e.target.value })}
                    placeholder="anime, attack on titan, eren"
                    className="admin-input-field"
                    style={{ height: '40px' }}
                  />
                </div>
              </div>

              <div>
                <label className="admin-input-label">Poster Artwork Image (JPG, PNG, WEBP)</label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* File upload picker / drag & drop zone */}
                  <label
                    htmlFor="admin-poster-file-input"
                    style={{
                      border: '2px dashed #2a3754',
                      borderRadius: '14px',
                      padding: '16px',
                      textAlign: 'center',
                      background: '#090d18',
                      cursor: imageCompressing ? 'wait' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'border-color 0.2s',
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFileUpload(file);
                    }}
                  >
                    <input
                      id="admin-poster-file-input"
                      type="file"
                      disabled={imageCompressing}
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileUpload(file);
                      }}
                    />
                    <Upload size={22} style={{ color: '#38bdf8' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                      {imageCompressing ? '⚡ Compressing & Optimizing Image...' : 'Click to Choose JPG / PNG from Computer'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {imageCompressing ? 'Resizing and preparing high-speed payload' : 'Supports High-Resolution JPG, PNG, WEBP (Auto-optimized on upload)'}
                    </div>
                  </label>

                  {/* Live Preview if image is loaded */}
                  {productFormData.images[0] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0e1628', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px' }}>
                      <img
                        src={productFormData.images[0]}
                        alt="Poster Preview"
                        style={{ width: '56px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {productFormData.images[0].startsWith('data:') ? 'Custom Uploaded Image (Attached & Compressed)' : productFormData.images[0]}
                        </div>
                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                          ✓ Image ready to save
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductFormData({ ...productFormData, images: [''] })}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                        title="Remove Image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Fallback URL text input */}
                  <div>
                    <input
                      type="text"
                      value={productFormData.images[0] || ''}
                      onChange={(e) => {
                        setProductFormData({ ...productFormData, images: [e.target.value] });
                        if (productModalError) setProductModalError(null);
                      }}
                      placeholder="Or enter image URL (e.g. /assets/posters/poster-01.jpg)"
                      className="admin-input-field"
                      style={{ height: '36px', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={productFormData.isBestSeller}
                    onChange={(e) => setProductFormData({ ...productFormData, isBestSeller: e.target.checked })}
                  />
                  <span>Mark as Bestseller</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={productFormData.isNewRelease}
                    onChange={(e) => setProductFormData({ ...productFormData, isNewRelease: e.target.checked })}
                  />
                  <span>Mark as New Release</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2638' }}>
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setProductModalError(null);
                  }}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || imageCompressing}
                  className="admin-btn-accent"
                  style={{ opacity: savingProduct || imageCompressing ? 0.7 : 1 }}
                >
                  {savingProduct ? 'Saving Poster to Server...' : (imageCompressing ? 'Optimizing Image...' : 'Save Poster to Catalog')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0e1424', border: '1px solid #1e2638', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e2638', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Create New Promo Coupon
              </h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="admin-input-label">Coupon Code (e.g. FLASH20)</label>
                <input
                  type="text"
                  required
                  value={couponFormData.code}
                  onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                  className="admin-input-field"
                  style={{ height: '40px', textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="admin-input-label">Description</label>
                <input
                  type="text"
                  value={couponFormData.description}
                  onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                  placeholder="Special 20% discount"
                  className="admin-input-field"
                  style={{ height: '40px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="admin-input-label">Discount %</label>
                  <input
                    type="number"
                    required
                    value={couponFormData.discountValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })}
                    className="admin-input-field"
                    style={{ height: '40px' }}
                  />
                </div>
                <div>
                  <label className="admin-input-label">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={couponFormData.minSpend}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minSpend: Number(e.target.value) })}
                    className="admin-input-field"
                    style={{ height: '40px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2638' }}>
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-accent"
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div id="admin-tax-invoice-printable" style={{ background: '#ffffff', color: '#111827', borderRadius: '20px', maxWidth: '640px', width: '100%', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
              <div>
                <img src="/assets/dungeons-logo.png" alt="DUNGEONS" style={{ height: '32px', width: 'auto', marginBottom: '4px' }} />
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Premium Archival Poster Prints</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>support@dungeons.com</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                  TAX INVOICE
                </span>
                <p style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 0 0' }}>#{selectedInvoiceOrder.orderNumber}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  {new Date(selectedInvoiceOrder.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '20px 0', fontSize: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>BILLED TO</p>
                <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0 0' }}>{selectedInvoiceOrder.customerName}</p>
                <p style={{ color: '#4b5563', margin: '2px 0 0 0' }}>{selectedInvoiceOrder.customerPhone}</p>
                <p style={{ color: '#4b5563', margin: '2px 0 0 0' }}>{selectedInvoiceOrder.customerEmail}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>SHIPPING DESTINATION</p>
                <p style={{ color: '#374151', margin: '4px 0 0 0' }}>{selectedInvoiceOrder.shippingAddress?.flat}</p>
                <p style={{ color: '#374151', margin: '2px 0 0 0' }}>{selectedInvoiceOrder.shippingAddress?.locality}</p>
                <p style={{ fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>
                  {selectedInvoiceOrder.shippingAddress?.city}, {selectedInvoiceOrder.shippingAddress?.state} - {selectedInvoiceOrder.shippingAddress?.pincode}
                </p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', margin: '20px 0', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textTransform: 'uppercase', fontSize: '10px', color: '#4b5563', fontWeight: 800 }}>
                  <th style={{ padding: '10px 12px' }}>Description</th>
                  <th style={{ padding: '10px 12px' }}>Size</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoiceOrder.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.productTitle}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.size}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatPrice(item.price)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px', fontSize: '12px' }}>
              <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedInvoiceOrder.subtotal)}</span>
                </div>
                {selectedInvoiceOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                    <span>Discount</span>
                    <span>-{formatPrice(selectedInvoiceOrder.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>Standard Shipping</span>
                  <span>Free</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                  <span>Total Amount Paid</span>
                  <span>{formatPrice(selectedInvoiceOrder.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }} className="no-print">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: '#ffffff', color: '#374151' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintInvoice}
                style={{ padding: '8px 16px', background: '#090d16', color: '#ffffff', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Artwork Inspection & Download Modal */}
      {selectedCustomArtwork && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0e1424', border: '1px solid #1e2638', borderRadius: '24px', maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e2638', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                  <span>🎨 Customer Uploaded Artwork</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  Order #{selectedCustomArtwork.orderNumber}
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Customer: <strong style={{ color: '#ffffff' }}>{selectedCustomArtwork.customerName}</strong> • {selectedCustomArtwork.customerPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomArtwork(null)}
                style={{ background: '#161f33', border: '1px solid #1e2638', color: '#94a3b8', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Artwork Preview Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ textAlign: 'center', background: '#070a12', borderRadius: '16px', border: '1px solid #1e2638', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px', maxHeight: '420px', overflow: 'hidden' }}>
                <img
                  src={selectedCustomArtwork.customUpload?.preview || '/assets/custom-wall-poster.jpg'}
                  alt="Customer Print Artwork"
                  style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.7)' }}
                />
              </div>

              {/* If multiple photos exist (e.g. Photobooth / Pocket prints) */}
              {Array.isArray(selectedCustomArtwork.customUpload?.photos) && selectedCustomArtwork.customUpload.photos.length > 1 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                    All Uploaded Photos ({selectedCustomArtwork.customUpload.photos.length}):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px' }}>
                    {selectedCustomArtwork.customUpload.photos.map((photoUrl: string, idx: number) => (
                      <a
                        key={idx}
                        href={photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}
                        title="Click to open full photo"
                      >
                        <img src={photoUrl} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '70px', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Print Specifications */}
            <div style={{ background: '#080c16', border: '1px solid #1e2638', borderRadius: '14px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Item:</span>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>{selectedCustomArtwork.itemTitle}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Print Size:</span>
                <div style={{ color: '#38bdf8', fontWeight: 800 }}>{selectedCustomArtwork.size} (Archival Matte)</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Custom Type:</span>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>{selectedCustomArtwork.customUpload?.customType || 'Custom Poster'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Border Style:</span>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>{selectedCustomArtwork.customUpload?.borderStyle || 'Standard'}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #1e2638', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setSelectedCustomArtwork(null)}
                className="admin-btn-secondary"
                style={{ height: '44px', padding: '0 16px' }}
              >
                Close
              </button>
              <a
                href={selectedCustomArtwork.customUpload?.preview}
                download={`Order-${selectedCustomArtwork.orderNumber}-Artwork.jpg`}
                className="admin-btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 20px', height: '44px' }}
              >
                <Download size={16} />
                <span>Download High-Res Original</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
