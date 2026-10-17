import { useSyncExternalStore } from 'react';
import type { Product, PosterSize, Orientation } from './catalog';

export type CartItem = {
  key: string;
  productId: string;
  title: string;
  slug: string;
  price: number;
  size: PosterSize;
  quantity: number;
  orientation: Orientation;
  artTreatment: string;
  customUpload?: {
    name: string;
    preview: string;
    photos?: string[];
    borderStyle?: string;
    customType?: string;
    format?: string;
  };
};

export type DemoOrder = {
  id: string;
  customer: { name: string; email: string; phone: string };
  address: { address: string; city: string; state: string; pincode: string; country: string };
  products: CartItem[];
  customUploads: string[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentStatus: 'pending' | 'paid';
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

type StoreState = {
  cart: CartItem[];
  wishlist: string[];
  recentlyViewed: string[];
  orders: DemoOrder[];
  coupon: string;
  demoUser: { name: string; email: string } | null;
  wishlistNotice?: { type: 'added' | 'removed'; id: string; timestamp: number } | null;
};

const STORAGE_KEY = 'poster-studio-store-v2';
const emptyState: StoreState = { cart: [], wishlist: [], recentlyViewed: [], orders: [], coupon: '', demoUser: null, wishlistNotice: null };
let state: StoreState = load();
const listeners = new Set<() => void>();

function load(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

function commit(next: StoreState) {
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() { return state; }
export function useStore() { return useSyncExternalStore(subscribe, getSnapshot, getSnapshot); }

export const store = {
  addToCart(item: Omit<CartItem, 'key'> & { key?: string }) {
    const key = item.key || (item.customUpload
      ? `custom-${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      : `${item.productId}-${item.size}`);
    const existing = state.cart.find((cartItem) => cartItem.key === key);
    const cart = existing
      ? state.cart.map((cartItem) => cartItem.key === key ? { ...cartItem, quantity: cartItem.quantity + item.quantity } : cartItem)
      : [...state.cart, { ...item, key }];
    commit({ ...state, cart });
  },
  updateQuantity(key: string, quantity: number) {
    commit({ ...state, cart: quantity <= 0 ? state.cart.filter((item) => item.key !== key) : state.cart.map((item) => item.key === key ? { ...item, quantity } : item) });
  },
  removeFromCart(key: string) { commit({ ...state, cart: state.cart.filter((item) => item.key !== key) }); },
  clearCart() { commit({ ...state, cart: [] }); },
  toggleWishlist(productIdOrSlug: string) {
    const exists = state.wishlist?.includes(productIdOrSlug);
    const wishlist = exists
      ? state.wishlist.filter((id) => id !== productIdOrSlug)
      : [...(state.wishlist || []), productIdOrSlug];
    const type = exists ? ('removed' as const) : ('added' as const);
    const wishlistNotice = {
      type,
      id: productIdOrSlug,
      timestamp: Date.now(),
    };
    commit({ ...state, wishlist, wishlistNotice });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wishlist-change', { detail: { type, id: productIdOrSlug } }));
    }
    return !exists;
  },
  clearWishlistNotice() {
    commit({ ...state, wishlistNotice: null });
  },
  setCoupon(coupon: string) { commit({ ...state, coupon }); },
  addRecentlyViewed(productId: string) { commit({ ...state, recentlyViewed: [productId, ...state.recentlyViewed.filter((id) => id !== productId)].slice(0, 8) }); },
  addOrder(order: DemoOrder) { commit({ ...state, orders: [order, ...state.orders], cart: [], coupon: '' }); },
  setDemoUser(demoUser: StoreState['demoUser']) { commit({ ...state, demoUser }); },
  updateOrders(orders: DemoOrder[]) { commit({ ...state, orders }); },
};

export function cartTotals(cart: CartItem[], coupon: string) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 299 ? 0 : 49;

  const code = coupon.trim().toUpperCase();
  let discount = 0;
  if (code === 'STUDIO10' || code === 'FIRST10') {
    discount = Math.round(subtotal * 0.1);
  } else if ((code === 'DUNGEONS3' || code === 'POSTER3') && totalItemCount >= 3) {
    // Buy 2 Get 1 Free: discount cheapest 1 item
    const prices = cart.flatMap((item) => Array(item.quantity).fill(item.price)).sort((a, b) => a - b);
    discount = prices[0] || 0;
  } else if ((code === 'DUNGEONS5' || code === 'POSTER5') && totalItemCount >= 5) {
    // Buy 3 Get 2 Free: discount cheapest 2 items
    const prices = cart.flatMap((item) => Array(item.quantity).fill(item.price)).sort((a, b) => a - b);
    discount = (prices[0] || 0) + (prices[1] || 0);
  }

  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, shipping, discount, total, totalItemCount };
}

export function makeOrder(input: Omit<DemoOrder, 'id' | 'createdAt'>): DemoOrder {
  return { ...input, id: `PS-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString() };
}