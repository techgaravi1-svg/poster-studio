import { prisma } from '@workspace/db';

// ==============================================================================
// SERVER-SIDE PRICING — the single source of truth for what a customer pays.
// Mirrors the storefront rules in poster-studio/src/lib/catalog.ts & store.ts,
// but never trusts a price, title or total sent by the browser.
// ==============================================================================

/** Non-poster ("circle") categories sold as a single Standard size. */
export const NON_POSTER_CATEGORY_SLUGS = [
  'mirrors',
  'wall-art',
  'wall-mounts',
  'bean-bags',
  'flags',
  'couches',
  'tables-chairs',
  'curtains',
  'rugs-carpets',
];

export const POSTER_SIZES = ['A5', 'A4', 'A3'] as const;

export function normalizeCategory(cat?: string | null): string {
  return (cat || '').toLowerCase().trim().replace(/&/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export function isPosterCategory(cat?: string | null): boolean {
  if (!cat) return true;
  const norm = normalizeCategory(cat);
  if (norm === 'posters') return true;
  return !NON_POSTER_CATEGORY_SLUGS.includes(norm);
}

/** Fixed prices for the custom-print builder (CustomPage in store-pages.tsx). */
const CUSTOM_PRODUCT_PRICES: Record<string, Record<string, number>> = {
  'custom-photobooth': { '3-strip': 149, '4-strip': 199 },
  'custom-mini-pocket': { '5-pack': 129, '7-pack': 169 },
  'custom-wall-poster': { A5: 90, A4: 130, A3: 160 },
};

export function isCustomProductId(productId: string): boolean {
  return productId in CUSTOM_PRODUCT_PRICES;
}

export function customUnitPrice(productId: string, format: string | undefined, size: string): number | null {
  const table = CUSTOM_PRODUCT_PRICES[productId];
  if (!table) return null;
  if (productId === 'custom-wall-poster') return table[size] ?? table[format || ''] ?? null;
  return table[format || ''] ?? null;
}

type PricedProduct = {
  price: number;
  category: string;
  tags: string[];
  sizePrices: unknown;
};

/** Unit price for a catalog product in a given size (same rules as getProductSizePrice). */
export function catalogUnitPrice(product: PricedProduct, size: string): number | null {
  const base = Number(product.price) || 0;
  if (!isPosterCategory(product.category)) {
    return base > 0 ? base : null; // non-poster items have a single Standard price
  }
  if (!(POSTER_SIZES as readonly string[]).includes(size)) return null;

  const explicit: Record<string, number> = {};
  if (product.sizePrices && typeof product.sizePrices === 'object') {
    for (const [k, v] of Object.entries(product.sizePrices as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) explicit[k] = n;
    }
  }
  for (const tag of product.tags || []) {
    if (typeof tag === 'string' && tag.startsWith('sizeprice:')) {
      const [, sz, val] = tag.split(':');
      const n = Number(val);
      if (sz && Number.isFinite(n) && n > 0) explicit[sz] = n;
    }
  }
  if (explicit[size]) return explicit[size];
  if (base <= 0) return null;
  if (size === 'A5') return base;
  if (size === 'A4') return Math.round(base * 1.5);
  if (size === 'A3') return Math.round(base * 2.2);
  return null;
}

// ------------------------------------------------------------------------------
// Cart resolution
// ------------------------------------------------------------------------------

export interface CartLineInput {
  productId: string;
  slug?: string;
  size: string;
  quantity: number;
  orientation?: string;
  title?: string;
  customUpload?: Record<string, unknown> | null;
}

export interface ResolvedLine {
  productId: string;
  dbProductId: string | null;
  title: string;
  slug: string | null;
  size: string;
  quantity: number;
  unitPrice: number;
  orientation: string;
  customUpload: Record<string, unknown> | null;
  sellerId: string | null;
  commissionRate: number | null;
  stock: number | null;
}

export class PricingError extends Error {
  status = 400;
}

/** Looks up every line in the database and prices it server-side. Throws PricingError on bad input. */
export async function resolveCart(lines: CartLineInput[]): Promise<ResolvedLine[]> {
  const resolved: ResolvedLine[] = [];

  for (const line of lines) {
    if (isCustomProductId(line.productId)) {
      const format = typeof line.customUpload?.format === 'string' ? (line.customUpload.format as string) : undefined;
      const unit = customUnitPrice(line.productId, format, line.size);
      if (!unit || !line.customUpload) {
        throw new PricingError('A custom print in your bag has an invalid size or format. Please re-add it.');
      }
      resolved.push({
        productId: line.productId,
        dbProductId: null,
        title: String(line.title || 'Custom Print').slice(0, 200),
        slug: line.slug || line.productId,
        size: line.size,
        quantity: line.quantity,
        unitPrice: unit,
        orientation: line.orientation || 'portrait',
        customUpload: line.customUpload,
        sellerId: null,
        commissionRate: null,
        stock: null,
      });
      continue;
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: line.productId }, ...(line.slug ? [{ slug: line.slug }] : [])],
        isActive: true,
        approvalStatus: 'APPROVED',
      },
      include: { seller: { select: { id: true, status: true, commissionRate: true } } },
    });

    if (!product || (product.seller && product.seller.status !== 'APPROVED')) {
      throw new PricingError(`"${line.title || line.slug || 'An item'}" is no longer available. Please remove it from your bag.`);
    }

    const unit = catalogUnitPrice(product, line.size);
    if (!unit) {
      throw new PricingError(`Size "${line.size}" is not available for "${product.title}".`);
    }

    resolved.push({
      productId: product.id,
      dbProductId: product.id,
      title: product.title,
      slug: product.slug,
      size: line.size,
      quantity: line.quantity,
      unitPrice: unit,
      orientation: line.orientation || product.orientation || 'portrait',
      customUpload: null,
      sellerId: product.sellerId,
      commissionRate: product.seller ? product.seller.commissionRate : null,
      stock: product.stock,
    });
  }

  // Aggregate stock check per product (the same product may appear in several sizes)
  const qtyByProduct = new Map<string, { qty: number; stock: number; title: string }>();
  for (const l of resolved) {
    if (!l.dbProductId || l.stock === null) continue;
    const cur = qtyByProduct.get(l.dbProductId) || { qty: 0, stock: l.stock, title: l.title };
    cur.qty += l.quantity;
    qtyByProduct.set(l.dbProductId, cur);
  }
  for (const { qty, stock, title } of qtyByProduct.values()) {
    if (stock < qty) {
      throw new PricingError(`Only ${Math.max(0, stock)} unit(s) of "${title}" are available in stock. Please adjust your bag quantity.`);
    }
  }

  return resolved;
}

// ------------------------------------------------------------------------------
// Totals
// ------------------------------------------------------------------------------

export const MIN_ORDER_AMOUNT = 300;
export const PLATFORM_FEE = 10;
export const FREE_SHIPPING_THRESHOLD = 299;
export const SHIPPING_FEE = 49;

export interface OrderTotals {
  subtotal: number;
  shippingFee: number;
  platformFee: number;
  discount: number;
  total: number;
  couponApplied: string | null;
}

export async function computeTotals(lines: ResolvedLine[], couponCode?: string): Promise<OrderTotals> {
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const totalQty = lines.reduce((acc, l) => acc + l.quantity, 0);
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const platformFee = subtotal > 0 ? PLATFORM_FEE : 0;

  let discount = 0;
  let couponApplied: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    const notExpired = !coupon?.expiresAt || coupon.expiresAt > new Date();
    if (coupon && coupon.isActive && notExpired && totalQty >= coupon.minQty && subtotal >= coupon.minSpend) {
      if (coupon.discountType === 'percentage') {
        discount = Math.round((subtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
      } else {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, subtotal);
      couponApplied = coupon.code;
    }
  }

  const total = Math.max(0, Math.round((subtotal + shippingFee + platformFee - discount) * 100) / 100);
  return { subtotal, shippingFee, platformFee, discount, total, couponApplied };
}
