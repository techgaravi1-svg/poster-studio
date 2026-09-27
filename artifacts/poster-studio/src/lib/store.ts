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
  customUpload?: { name: string; preview: string };
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
  recentlyViewed: string[];
  orders: DemoOrder[];
  coupon: string;
  demoUser: { name: string; email: string } | null;
};

const STORAGE_KEY = 'poster-studio-store-v2';
const emptyState: StoreState = { cart: [], recentlyViewed: [], orders: [], coupon: '', demoUser: null };
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
  addToCart(item: Omit<CartItem, 'key'>) {
    const key = item.customUpload ? `${item.productId}-${item.size}-${item.customUpload.name}` : `${item.productId}-${item.size}`;
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
  setCoupon(coupon: string) { commit({ ...state, coupon }); },
  addRecentlyViewed(productId: string) { commit({ ...state, recentlyViewed: [productId, ...state.recentlyViewed.filter((id) => id !== productId)].slice(0, 8) }); },
  addOrder(order: DemoOrder) { commit({ ...state, orders: [order, ...state.orders], cart: [], coupon: '' }); },
  setDemoUser(demoUser: StoreState['demoUser']) { commit({ ...state, demoUser }); },
  updateOrders(orders: DemoOrder[]) { commit({ ...state, orders }); },
};

export function cartTotals(cart: CartItem[], coupon: string) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 75 ? 0 : 6;
  const discount = coupon.trim().toUpperCase() === 'STUDIO10' ? Math.round(subtotal * 0.1) : 0;
  return { subtotal, shipping, discount, total: subtotal + shipping - discount };
}

export function makeOrder(input: Omit<DemoOrder, 'id' | 'createdAt'>): DemoOrder {
  return { ...input, id: `PS-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString() };
}