import { useSyncExternalStore } from 'react';
import { getProductStock, type Product, type PosterSize, type Orientation } from './catalog';

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
  paymentId?: string;
  paymentMethod?: string;
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  locality: string;
  flat: string;
  landmark?: string;
  type: 'home' | 'office' | 'other';
  isDefault?: boolean;
};

export const defaultSavedAddresses: SavedAddress[] = [];

type StoreState = {
  cart: CartItem[];
  wishlist: string[];
  recentlyViewed: string[];
  orders: DemoOrder[];
  coupon: string;
  demoUser: { name: string; email: string } | null;
  wishlistNotice?: { type: 'added' | 'removed'; id: string; timestamp: number } | null;
  savedAddresses: SavedAddress[];
  selectedAddressId: string;
};

const STORAGE_KEY = 'poster-studio-store-v2';
const LEAKED_IDS = new Set(['addr-1', 'addr-2', 'addr-3', 'addr-4', 'addr-5']);
const LEAKED_PHONES = new Set(['9265964547', '9099702068', '6351082318']);

const emptyState: StoreState = {
  cart: [],
  wishlist: [],
  recentlyViewed: [],
  orders: [],
  coupon: '',
  demoUser: null,
  wishlistNotice: null,
  savedAddresses: [],
  selectedAddressId: '',
};
function clampCartQuantities(cartList: CartItem[]): { cart: CartItem[]; hasChanged: boolean } {
  let hasChanged = false;
  const clamped: CartItem[] = [];

  for (const item of cartList) {
    if (item.customUpload) {
      clamped.push(item);
      continue;
    }
    const maxStock = getProductStock(item.slug || item.productId, item.title);
    if (maxStock <= 0) {
      hasChanged = true;
      continue;
    }
    if (item.quantity > maxStock) {
      hasChanged = true;
      clamped.push({ ...item, quantity: maxStock });
    } else {
      clamped.push(item);
    }
  }

  return { cart: clamped, hasChanged };
}

function load(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    
    // Privacy safeguard: automatically sanitize any previously cached addresses that came from old demo seeds
    const rawAddresses: SavedAddress[] = Array.isArray(parsed.savedAddresses) ? parsed.savedAddresses : [];
    const savedAddresses = rawAddresses.filter(
      (a) => a && a.id && !LEAKED_IDS.has(a.id) && !LEAKED_PHONES.has(String(a.phone || '').trim())
    );

    const rawCart: CartItem[] = Array.isArray(parsed.cart) ? parsed.cart : [];
    const { cart } = clampCartQuantities(rawCart);

    const validSelectedId = savedAddresses.some((a) => a.id === parsed.selectedAddressId)
      ? parsed.selectedAddressId
      : savedAddresses[0]?.id || '';

    return {
      ...emptyState,
      ...parsed,
      cart,
      savedAddresses,
      selectedAddressId: validSelectedId,
    };
  } catch {
    return emptyState;
  }
}

let state: StoreState = load();
const listeners = new Set<() => void>();

function commit(next: StoreState) {
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach((listener) => listener());
}

// Automatically clamp cart quantities when catalog updates in real-time
if (typeof window !== 'undefined') {
  window.addEventListener('dungeons:products-updated', () => {
    const { cart, hasChanged } = clampCartQuantities(state.cart);
    if (hasChanged) {
      commit({ ...state, cart });
    }
  });
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

    const maxStock = item.customUpload ? 999 : getProductStock(item.slug || item.productId, item.title);
    if (maxStock <= 0) {
      return { success: false, maxStock: 0, reason: 'OUT_OF_STOCK' };
    }

    const existing = state.cart.find((cartItem) => cartItem.key === key);
    let cart: CartItem[];
    if (existing) {
      const targetQty = Math.min(existing.quantity + item.quantity, maxStock);
      cart = state.cart.map((cartItem) =>
        cartItem.key === key ? { ...cartItem, quantity: targetQty } : cartItem
      );
    } else {
      const initialQty = Math.min(item.quantity, maxStock);
      cart = [...state.cart, { ...item, key, quantity: initialQty }];
    }
    commit({ ...state, cart });
    return { success: true, maxStock };
  },
  updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      commit({ ...state, cart: state.cart.filter((item) => item.key !== key) });
      return;
    }
    const existing = state.cart.find((item) => item.key === key);
    if (!existing) return;

    const maxStock = existing.customUpload ? 999 : getProductStock(existing.slug || existing.productId, existing.title);
    const clampedQty = Math.min(quantity, maxStock);

    commit({
      ...state,
      cart: state.cart.map((item) => (item.key === key ? { ...item, quantity: clampedQty } : item)),
    });
  },
  updateItemSize(key: string, newSize: PosterSize, newPrice?: number) {
    const item = state.cart.find((i) => i.key === key);
    if (!item) return;
    const priceToSet = typeof newPrice === 'number' && newPrice > 0 ? newPrice : item.price;
    if (item.size === newSize && item.price === priceToSet) return;

    const newKey = item.customUpload ? key : `${item.productId}-${newSize}`;
    const existing = state.cart.find((i) => i.key === newKey && i.key !== key);
    if (existing) {
      commit({
        ...state,
        cart: state.cart
          .filter((i) => i.key !== key)
          .map((i) => (i.key === newKey ? { ...i, quantity: i.quantity + item.quantity, price: priceToSet } : i)),
      });
    } else {
      commit({
        ...state,
        cart: state.cart.map((i) => (i.key === key ? { ...i, size: newSize, key: newKey, price: priceToSet } : i)),
      });
    }
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
  saveAddress(addr: Omit<SavedAddress, 'id'> & { id?: string }) {
    const addresses = Array.isArray(state.savedAddresses) ? [...state.savedAddresses] : [];
    let nextAddresses: SavedAddress[];
    let targetId = addr.id;

    if (addr.id) {
      nextAddresses = addresses.map((a) => {
        if (a.id === addr.id) {
          return { ...a, ...addr } as SavedAddress;
        }
        return addr.isDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      targetId = `addr-${Date.now()}`;
      const newAddr: SavedAddress = {
        ...addr,
        id: targetId,
      };
      if (addr.isDefault || addresses.length === 0) {
        nextAddresses = [newAddr, ...addresses.map((a) => ({ ...a, isDefault: false }))];
      } else {
        nextAddresses = [newAddr, ...addresses];
      }
    }

    commit({
      ...state,
      savedAddresses: nextAddresses,
      selectedAddressId: targetId || state.selectedAddressId || nextAddresses[0]?.id || '',
    });
  },
  deleteAddress(id: string) {
    const addresses = Array.isArray(state.savedAddresses) ? state.savedAddresses : [];
    const nextAddresses = addresses.filter((a) => a.id !== id);
    commit({
      ...state,
      savedAddresses: nextAddresses,
      selectedAddressId: state.selectedAddressId === id ? (nextAddresses[0]?.id || '') : state.selectedAddressId,
    });
  },
  setDefaultAddress(id: string) {
    const addresses = Array.isArray(state.savedAddresses) ? state.savedAddresses : [];
    const nextAddresses = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    commit({
      ...state,
      savedAddresses: nextAddresses,
      selectedAddressId: id,
    });
  },
  selectAddress(id: string) {
    commit({
      ...state,
      selectedAddressId: id,
    });
  },
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