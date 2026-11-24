import { useState, useEffect } from 'react';
import rawDatabaseProducts from './catalog-full-db.json';

// Universal Cloudinary next-gen format, auto-quality, and responsive sizing helper
export function optimizeCloudinary(url?: string, width?: number, quality: number = 80): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/c_')) return url;

  const transforms = ['f_auto', `q_${quality}`];
  if (width) {
    transforms.push(`w_${width}`, 'c_limit');
  }
  return url.replace('/image/upload/', `/image/upload/${transforms.join(',')}/`);
}

export type PosterSize = 'A5' | 'A4' | 'A3' | 'Standard' | 'Small' | 'Medium' | 'Large';

/**
 * Sizes & frame colours are chosen per product by the admin and saved as product tags:
 *   avail-size:A4      (posters: A5/A4/A3, wall art: A3/A4/A5)
 *   frame-color:Black  (wall art only)
 * Products without these tags keep the defaults below, so existing items behave as before.
 * Keep in sync with api-server/src/lib/pricing.ts.
 */
export const WALL_ART_DISPLAY_SIZES = ['A3', 'A4', 'A5'] as const;
export const POSTER_SIZE_KEYS = ['A5', 'A4', 'A3'] as const;
export const DEFAULT_WALL_ART_SIZES: PosterSize[] = ['A4'];
export const WALL_ART_SIZE_DIMS: Record<string, string> = {
  A5: '14.8 × 21 cm',
  A4: '21 × 29.7 cm',
  A3: '29.7 × 42 cm',
};
export const WALL_ART_FRAME_COLORS = ['Black', 'Brown', 'White'] as const;
export type WallArtFrameColor = (typeof WALL_ART_FRAME_COLORS)[number];
export const DEFAULT_WALL_ART_FRAME_COLORS: readonly string[] = ['Black'];
/** Frame colours offered in the Custom Wall Art builder (no admin product behind it). */
export const CUSTOM_WALL_ART_FRAME_COLORS: readonly string[] = ['Black'];
export const AVAILABLE_SIZE_TAG = 'avail-size:';
export const FRAME_COLOR_TAG = 'frame-color:';
export const WALL_ART_CATEGORY_TAG = 'wall-art-cat:';
/** Display name of an admin-added wall art category, stored next to its slug tag. */
export const WALL_ART_CATEGORY_NAME_TAG = 'wall-art-catname:';

/**
 * Wall art themes (like poster categories). Every wall art item keeps category 'wall-art'
 * and stores its theme as a `wall-art-cat:<slug>` tag. Add new themes here.
 */
export const WALL_ART_CATEGORIES: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'automative', name: 'Automative' },
  { slug: 'nature-wildlife', name: 'Nature and Wildlife' },
  { slug: 'wall-cards', name: 'Wall Cards' },
  { slug: 'aesthetic', name: 'Aesthetic' },
  { slug: 'pop-art', name: 'Pop Art' },
];

export function slugifyWallArtCategory(name: string): string {
  return String(name || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 40);
}

/** Clean display name for a new category (no commas, they separate tags in the admin form). */
export function cleanWallArtCategoryName(name: string): string {
  return String(name || '').replace(/[,\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function readTagValue(tags: unknown, prefix: string): string {
  if (!Array.isArray(tags)) return '';
  const tag = tags.find((t): t is string => typeof t === 'string' && t.toLowerCase().startsWith(prefix));
  return tag ? tag.slice(prefix.length).trim() : '';
}

/** Theme slug of a wall art item ('' when none set). Includes categories the admin added. */
export function getWallArtCategory(product: { tags?: unknown }): string {
  return slugifyWallArtCategory(readTagValue(product.tags, WALL_ART_CATEGORY_TAG));
}

function titleFromSlug(slug: string): string {
  return slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Default categories plus every admin-added category found on the given products. */
export function getWallArtCategoryList(productsList?: ReadonlyArray<{ category?: string; tags?: unknown }>): Array<{ slug: string; name: string }> {
  const list: Array<{ slug: string; name: string }> = WALL_ART_CATEGORIES.map((c) => ({ ...c }));
  const seen = new Set(list.map((c) => c.slug));
  for (const p of productsList || []) {
    if (!isWallArtCategory(p.category)) continue;
    const slug = getWallArtCategory(p);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    list.push({ slug, name: cleanWallArtCategoryName(readTagValue(p.tags, WALL_ART_CATEGORY_NAME_TAG)) || titleFromSlug(slug) });
  }
  return list;
}

export function getWallArtCategoryName(slug: string, list: ReadonlyArray<{ slug: string; name: string }> = WALL_ART_CATEGORIES): string {
  if (!slug) return '';
  return list.find((c) => c.slug === slug)?.name || WALL_ART_CATEGORIES.find((c) => c.slug === slug)?.name || titleFromSlug(slug);
}

export function isWallArtCategory(cat?: string | null): boolean {
  return (cat || '').toLowerCase().trim().replace(/&/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-') === 'wall-art';
}

/** Values of `prefix:value` tags, limited to `allowed` and returned in `allowed` order. */
export function readTagList(tags: unknown, prefix: string, allowed: readonly string[]): string[] {
  if (!Array.isArray(tags)) return [];
  const found = new Set(
    tags
      .filter((t): t is string => typeof t === 'string' && t.toLowerCase().startsWith(prefix))
      .map((t) => t.slice(prefix.length).trim().toLowerCase()),
  );
  return allowed.filter((a) => found.has(a.toLowerCase()));
}

/** Sizes customers can buy for this product. Posters default to all three; wall art defaults to A4. */
export function getAvailableSizes(product: { category?: string; tags?: unknown }): PosterSize[] {
  if (isWallArtCategory(product.category)) {
    const list = readTagList(product.tags, AVAILABLE_SIZE_TAG, WALL_ART_DISPLAY_SIZES) as PosterSize[];
    return list.length ? list : [...DEFAULT_WALL_ART_SIZES];
  }
  if (isPosterCategory(product.category)) {
    const list = readTagList(product.tags, AVAILABLE_SIZE_TAG, POSTER_SIZE_KEYS) as PosterSize[];
    return list.length ? list : ['A5', 'A4', 'A3'];
  }
  return [];
}

/** Frame colours customers can choose for a wall art item (defaults to Black). */
export function getFrameColors(product: { category?: string; tags?: unknown }): string[] {
  if (!isWallArtCategory(product.category)) return [];
  const list = readTagList(product.tags, FRAME_COLOR_TAG, WALL_ART_FRAME_COLORS);
  return list.length ? list : [...DEFAULT_WALL_ART_FRAME_COLORS];
}

/** Photo of the wall art in a given frame colour, stored as `frame-image:Black:https://...`. */
export const FRAME_IMAGE_TAG = 'frame-image:';

/** Admin-uploaded image per frame colour. Older wall art has none and keeps its main image. */
export function getFrameImages(product: { category?: string; tags?: unknown }): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  if (!isWallArtCategory(product.category) || !Array.isArray(product.tags)) return out;
  for (const tag of product.tags) {
    if (typeof tag !== 'string' || !tag.toLowerCase().startsWith(FRAME_IMAGE_TAG)) continue;
    const rest = tag.slice(FRAME_IMAGE_TAG.length);
    const cut = rest.indexOf(':');
    if (cut < 0) continue;
    const color = WALL_ART_FRAME_COLORS.find((c) => c.toLowerCase() === rest.slice(0, cut).trim().toLowerCase());
    const url = rest.slice(cut + 1).trim();
    if (color && !out[color] && /^https:\/\/\S+$/i.test(url)) out[color] = url;
  }
  return out;
}

export function getFrameImage(product: { category?: string; tags?: unknown }, color?: string | null): string {
  if (!color) return '';
  return getFrameImages(product)[color] || '';
}

/**
 * Fallback price for wall art sizes without their own price. Uses older pricing
 * (A4, then A3, then Small, then the base price) so existing wall art keeps its price.
 */
export function wallArtSalePrice(sizePrices: Partial<Record<string, number>> | null | undefined, base: number): number {
  const sp = sizePrices || {};
  const pick = [sp.A4, sp.A3, sp.Small, base].find((v) => typeof v === 'number' && v > 0);
  return (pick as number) || 0;
}

/** Sizes a wall-art product can be bought in, or [] for every other product. */
export function getWallArtSizes(product: { category?: string; tags?: unknown }): PosterSize[] {
  return isWallArtCategory(product.category) ? getAvailableSizes(product) : [];
}

/** Size to pre-select / use for quick "add to bag" (posters prefer A5 when available). */
export function getDefaultSize(product: { category?: string; tags?: unknown }): PosterSize {
  const sizes = getAvailableSizes(product);
  if (isWallArtCategory(product.category)) return sizes[0] || 'A4';
  if (sizes.length) return sizes.includes('A5') ? 'A5' : sizes[0];
  return 'A5';
}
export type Orientation = 'portrait' | 'landscape' | 'square';

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  collection: string;
  images: string[];
  artTreatment: string;
  price: number;
  compareAtPrice: number;
  discount: number;
  sizes: PosterSize[];
  sizePrices?: Partial<Record<PosterSize, number>>;
  sizeComparePrices?: Partial<Record<PosterSize, number>>;
  orientation: Orientation;
  stock: number;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  trending?: boolean;
  tags: string[];
  rating: number;
  reviewsCount?: number;
  subtitle?: string;
  features?: Array<{ title: string; desc: string }>;
  notes?: Array<{ title: string; desc: string }>;
  shipping?: Array<{ title: string; desc: string }>;
  /** Marketplace seller, when the item is not sold by the store itself */
  soldBy?: { name: string; slug: string };
};

const defaultFeatures = [
  { title: 'Premium Matte Finish', desc: 'Sharp, vibrant, and stunning under any light, perfect for showcasing every detail.' },
  { title: 'Archival Matte Paper', desc: 'Extra-thick, durable, and premium-grade for a high-quality, luxury feel.' },
  { title: 'Vivid Colors', desc: 'High-quality printing ensures rich tones, crisp details, and long-lasting vibrancy.' },
  { title: 'Made to Last', desc: 'Designed for luxury, style, and durability so your poster stays looking new for years.' },
  { title: 'Ready for Framing', desc: 'Sized to fit standard frames perfectly, giving you a clean, professional display.' },
];

const defaultNotes = [
  { title: 'No Adhesive Included', desc: 'Posters do not come with stickers or glue. Please use your own double-sided tape, poster glue, or wall-safe mounting solution.' },
  { title: 'Frames Not Included', desc: 'Posters are sold unframed, but they are fully ready for framing for a polished, gallery-style finish.' },
];

const defaultShipping = [
  { title: 'Order Dispatchment', desc: 'Orders are processed within 1-2 business days after order confirmation.' },
  { title: 'Delivery Timeline', desc: 'Once dispatched, orders are typically delivered within 7 working days. Delivery times may vary depending on your location and courier partner.' },
];

export const seedFallbackProducts: Product[] = [
  {
    id: 'prod-asta-black-clover',
    slug: 'asta-black-clover-anime-poster',
    title: 'ASTA POSTER | BLACK CLOVER ANIME POSTER',
    description: 'Fierce, vibrant yellow background Asta artwork from Black Clover, printed on premium archival matte paper.',
    category: 'ANIME',
    collection: 'anime',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/poster-01_24409e.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 35,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['anime', 'black clover', 'asta', 'manga', 'shonen'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-bateman-focus',
    slug: 'patrick-bateman-focus-poster',
    title: 'PATRICK BATEMAN FOCUS POSTER | AMERICAN PSYCHO',
    description: 'Iconic cinematic landscape artwork featuring Christian Bale as Patrick Bateman with bold red FOCUS typography.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/poster-02_2a2855.jpg'],
    artTreatment: 'art-night',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'landscape',
    stock: 42,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['american psycho', 'patrick bateman', 'focus', 'cinema', 'aesthetic', 'motivational'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-spiderman-andrew',
    slug: 'andrew-garfield-spiderman-poster',
    title: 'SPIDERMAN POSTER - ANDREW GARFIELD | MARVEL POSTERS',
    description: 'Emotional and striking Andrew Garfield Spider-Man tribute poster featuring the iconic quote "I lost Gwen, she was my MJ".',
    category: 'MARVEL & DC',
    collection: 'marvel-dc',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349699/dungeons_store_assets/poster-03_a9d962.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 28,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['spiderman', 'marvel', 'andrew garfield', 'superhero', 'comic', 'peter parker'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-miles-morales',
    slug: 'miles-morales-leap-of-faith-poster',
    title: 'MILES MORALES LEAP OF FAITH POSTER | SPIDER-VERSE',
    description: 'Breathtaking upside-down skyline dive from Spider-Man: Into the Spider-Verse on matte finish archival paper.',
    category: 'MARVEL & DC',
    collection: 'marvel-dc',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349699/dungeons_store_assets/poster-04_289e1c.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 32,
    featured: true,
    bestseller: true,
    newArrival: true,
    tags: ['spider-verse', 'miles morales', 'marvel', 'leap of faith', 'superhero', 'aesthetic'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-messi-argentina',
    slug: 'lionel-messi-argentina-10-poster',
    title: 'LIONEL MESSI POSTER - 10 | ARGENTINA FOOTBALL POSTERS',
    description: 'Tribute poster celebrating Lionel Messi with Argentina national team kit, career statistics, and iconic quote.',
    category: 'FOOTBALL',
    collection: 'football',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349701/dungeons_store_assets/poster-05_7098a8.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 45,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['football', 'messi', 'argentina', 'la pulga', 'sports', 'goat'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-vogue-pink-leopard',
    slug: 'vogue-pink-leopard-poster',
    title: 'VOGUE PINK LEOPARD POSTER | AESTHETIC POSTER',
    description: 'High-fashion roaring cheetah monochrome print featuring bold hot-pink VOGUE typography.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349711/dungeons_store_assets/poster-06_5c7fbd.jpg'],
    artTreatment: 'art-aurora',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 30,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['vogue', 'aesthetic', 'leopard', 'pink', 'fashion', 'chic'],
    rating: 4.8,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-blah-blah-blah',
    slug: 'blah-blah-blah-lips-poster',
    title: 'BLAH BLAH BLAH POSTER | POP ART LIPS POSTER',
    description: 'Bold pop-art red lips with high-contrast monochrome "BLAH BLAH BLAH" backdrop on premium matte card.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349701/dungeons_store_assets/poster-07_9947b3.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 26,
    featured: false,
    bestseller: true,
    newArrival: false,
    tags: ['pop art', 'lips', 'blah', 'aesthetic', 'retro', 'modern'],
    rating: 4.8,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-diamond-grillz-tiger',
    slug: 'diamond-grillz-tiger-poster',
    title: 'DIAMOND GRILLZ TIGER POSTER | LUXURY STREETWEAR',
    description: 'Fierce roaring tiger with iced-out diamond grillz on deep black background. Dark luxury aesthetic print.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349707/dungeons_store_assets/poster-08_9f52fc.jpg'],
    artTreatment: 'art-night',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 38,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['tiger', 'diamond', 'grillz', 'streetwear', 'luxury', 'dark aesthetic'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-bateman-psycho',
    slug: 'patrick-bateman-psycho-poster',
    title: 'PATRICK BATEMAN PSYCHO POSTER | RED NEON CINEMA',
    description: 'Intense red ambient portrait of Patrick Bateman with glowing yellow neon cursive typography.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349702/dungeons_store_assets/poster-09_918aa1.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 34,
    featured: true,
    bestseller: true,
    newArrival: true,
    tags: ['american psycho', 'patrick bateman', 'neon', 'red', 'cinema', 'cult classic'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-ronaldo-legacy-7',
    slug: 'cristiano-ronaldo-legacy-7-poster',
    title: 'CRISTIANO RONALDO POSTER - 7 | FOOTBALL LEGENDS',
    description: 'Legendary CR7 tribute poster highlighting historic career trophies, Manchester United & Real Madrid moments.',
    category: 'FOOTBALL',
    collection: 'football',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349702/dungeons_store_assets/poster-10_ee3c92.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 48,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['football', 'ronaldo', 'cr7', 'manchester united', 'real madrid', 'sports'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-john-wick',
    slug: 'john-wick-mustang-poster',
    title: 'JOHN WICK POSTER | BABA YAGA CINEMA POSTER',
    description: 'Keanu Reeves as John Wick standing in clean tailored suit beside 1969 Mustang Mach 1 and trusty pitbull.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349703/dungeons_store_assets/poster-11_30cc1e.jpg'],
    artTreatment: 'art-night',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 29,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['john wick', 'keanu reeves', 'cinema', 'mustang', 'action', 'movie'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-vogue-leopard-kiss',
    slug: 'vogue-leopard-kiss-poster',
    title: 'VOGUE LEOPARD KISS POSTER | B&W EDITORIAL',
    description: 'Monochrome editorial fashion poster with roaring leopard and cheetah pattern kiss prints.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349703/dungeons_store_assets/poster-12_529cb4.jpg'],
    artTreatment: 'art-aurora',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 25,
    featured: false,
    bestseller: false,
    newArrival: true,
    tags: ['vogue', 'editorial', 'leopard', 'black and white', 'fashion'],
    rating: 4.7,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-mr-bean',
    slug: 'mr-bean-iconic-poster',
    title: 'MR. BEAN ICONIC POSTER | VINTAGE COMEDY POSTER',
    description: 'Hilarious high-contrast black & white close-up expression of Rowan Atkinson as Mr. Bean.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349704/dungeons_store_assets/poster-13_ae7620.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 31,
    featured: true,
    bestseller: false,
    newArrival: true,
    tags: ['mr bean', 'comedy', 'rowan atkinson', 'cinema', 'humor', 'retro'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-messi-world-cup',
    slug: 'messi-world-cup-greatest-poster',
    title: 'LIONEL MESSI WORLD CUP POSTER | BE THE GREATEST',
    description: 'Historic Qatar 2022 World Cup glory moment with Lionel Messi lifting the golden FIFA World Cup trophy.',
    category: 'FOOTBALL',
    collection: 'football',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349705/dungeons_store_assets/poster-14_7715d2.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 50,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['messi', 'world cup', 'argentina', 'football', 'fifa', 'champion'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-megan-fox-supreme',
    slug: 'megan-fox-supreme-poster',
    title: 'MEGAN FOX SUPREME POSTER | STREETWEAR AESTHETIC',
    description: 'Cult classic streetwear editorial portrait of Megan Fox with iconic red Supreme box logo banner.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349705/dungeons_store_assets/poster-15_51f810.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 36,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['supreme', 'megan fox', 'streetwear', 'fashion', 'aesthetic', 'pop culture'],
    rating: 4.8,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-messi-crown',
    slug: 'messi-crown-greatest-of-all-time-poster',
    title: 'LIONEL MESSI CROWN POSTER | THE GREATEST OF ALL TIME',
    description: 'King of Football artwork featuring Lionel Messi being crowned with ornate royal gold crown.',
    category: 'FOOTBALL',
    collection: 'football',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349710/dungeons_store_assets/poster-16_6238a3.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 44,
    featured: false,
    bestseller: true,
    newArrival: true,
    tags: ['messi', 'crown', 'goat', 'football', 'king', 'legend'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-what-if-works-out',
    slug: 'new-york-times-what-if-it-all-works-out-poster',
    title: 'NEW YORK TIMES POSTER | WHAT IF IT ALL WORKS OUT?',
    description: 'Iconic vintage NY Times newspaper print overlaid with dripping street graffiti bold motivational lettering.',
    category: 'DEVOTIONAL',
    collection: 'devotional',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349710/dungeons_store_assets/poster-17_3afc5d.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 40,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['new york times', 'motivational', 'graffiti', 'quote', 'typography', 'newspaper'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-thoroughbred-horse',
    slug: 'thoroughbred-horse-equestrian-poster',
    title: 'THOROUGHBRED HORSE POSTER | EQUESTRIAN ART',
    description: 'Museum-quality fine art monochrome photography of a majestic thoroughbred horse in leather bridle.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349707/dungeons_store_assets/poster-18_7f0aa8.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 22,
    featured: false,
    bestseller: false,
    newArrival: true,
    tags: ['horse', 'equestrian', 'black and white', 'minimalist', 'nature', 'luxury'],
    rating: 4.8,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-tony-soprano',
    slug: 'tony-soprano-cigar-poster',
    title: 'TONY SOPRANO POSTER | THE SOPRANOS MOB LEGEND',
    description: 'Iconic black and white portrait of James Gandolfini as Tony Soprano puffing a classic cigar.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349707/dungeons_store_assets/poster-19_b2c1e3.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 33,
    featured: true,
    bestseller: false,
    newArrival: true,
    tags: ['tony soprano', 'the sopranos', 'hbo', 'mafia', 'cigar', 'cinema'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-michael-corleone',
    slug: 'michael-corleone-godfather-poster',
    title: 'MICHAEL CORLEONE POSTER | THE GODFATHER PART II',
    description: 'Al Pacino seated in his commanding leather armchair in The Godfather Part II. Masterpiece mob artwork.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349708/dungeons_store_assets/poster-20_d8d434.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 37,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['godfather', 'michael corleone', 'al pacino', 'mafia', 'cinema', 'classic'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-mercedes-g-class',
    slug: 'mercedes-benz-g-class-poster',
    title: 'MERCEDES-BENZ G 63 AMG POSTER | G-CLASS LUXURY SUV',
    description: 'Sleek all-black Mercedes-AMG G 63 G-Wagon poster with technical specifications on textured parchment.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349710/dungeons_store_assets/poster-21_2bef8c.jpg'],
    artTreatment: 'art-night',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 35,
    featured: false,
    bestseller: true,
    newArrival: true,
    tags: ['mercedes', 'g-wagon', 'amg', 'g63', 'supercar', 'luxury car'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-salman-khan-90s',
    slug: 'salman-khan-90s-retro-poster',
    title: 'SALMAN KHAN 90S POSTER | RETRO BOLLYWOOD POSTER',
    description: 'Vintage Bollywood retro poster featuring young Salman Khan with classic 90s bold aesthetic red typography.',
    category: 'CINEMA',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349709/dungeons_store_assets/poster-22_2921bc.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 45,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['salman khan', 'bollywood', '90s', 'retro', 'cinema', 'bhai'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-summit-climber',
    slug: 'summit-peak-climber-poster',
    title: 'SUMMIT PEAK CLIMBER POSTER | MOUNTAIN EXPEDITION',
    description: 'Inspiring silhouette of a mountaineer standing with ice axe on snowy peak looking out over the clouds.',
    category: 'DEVOTIONAL',
    collection: 'devotional',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349710/dungeons_store_assets/poster-23_8f1b56.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 27,
    featured: false,
    bestseller: false,
    newArrival: true,
    tags: ['mountain', 'climber', 'adventure', 'motivational', 'monochrome', 'peak'],
    rating: 4.8,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-nate-diaz',
    slug: 'nate-diaz-be-real-ufc-poster',
    title: 'NATE DIAZ BE REAL POSTER | UFC COMBAT SPORTS',
    description: 'Raw fight night photo of Stockton legend Nate Diaz showing his BE REAL mouthguard in the Octagon.',
    category: 'CRICKET',
    collection: 'cricket',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349710/dungeons_store_assets/poster-24_10a1f4.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 36,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['ufc', 'nate diaz', 'mma', 'be real', 'sports', 'combat'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-nami-one-piece',
    slug: 'nami-wanted-bounty-one-piece-poster',
    title: 'NAMI WANTED BOUNTY POSTER | ONE PIECE ANIME POSTER',
    description: 'Official parchment style Marine Wanted bounty poster for Straw Hat pirate Cat Burglar Nami (366,000,000 Berries).',
    category: 'ANIME',
    collection: 'anime',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349711/dungeons_store_assets/poster-25_2f6870.jpg'],
    artTreatment: 'art-aurora',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 42,
    featured: true,
    bestseller: true,
    newArrival: true,
    tags: ['one piece', 'nami', 'wanted', 'bounty', 'anime', 'straw hat'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-pain-naruto',
    slug: 'pain-akatsuki-naruto-wanted-poster',
    title: 'PAIN AKATSUKI WANTED POSTER | NARUTO SHIPPUDEN',
    description: 'Devastating Rinnegan leader Pain (Nagato) of Akatsuki wanted dead or alive poster on archival matte paper.',
    category: 'ANIME',
    collection: 'anime',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349712/dungeons_store_assets/poster-26_ac80e9.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 40,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['naruto', 'pain', 'akatsuki', 'rinnegan', 'anime', 'shippuden'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-khabib-mcgregor',
    slug: 'khabib-mcgregor-no-risk-no-story-poster',
    title: 'KHABIB VS MCGREGOR POSTER | NO RISK NO STORY UFC 229',
    description: 'Historic UFC 229 championship showdown artwork between Khabib Nurmagomedov and Conor McGregor with "NO RISK NO STORY" lettering.',
    category: 'CRICKET',
    collection: 'cricket',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349711/dungeons_store_assets/poster-27_93fb0c.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 38,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['khabib', 'mcgregor', 'ufc', 'mma', 'no risk no story', 'sports'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-ferrari-helmet',
    slug: 'ferrari-racing-helmet-poster',
    title: 'FERRARI RACING HELMET POSTER | MOTORSPORT AESTHETIC',
    description: 'High-fashion glossy red Scuderia Ferrari helmet model with diamond necklace. Stunning modern wall art.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349712/dungeons_store_assets/poster-28_2c6c19.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 34,
    featured: false,
    bestseller: true,
    newArrival: true,
    tags: ['ferrari', 'f1', 'motorsport', 'fashion', 'aesthetic', 'racing'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-bruce-wayne',
    slug: 'bruce-wayne-batman-poster',
    title: 'BRUCE WAYNE POSTER | THE DARK KNIGHT DC POSTERS',
    description: 'Christian Bale in pinstripe three-piece suit as billionaire Bruce Wayne on bold crimson red backdrop.',
    category: 'MARVEL & DC',
    collection: 'marvel-dc',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349712/dungeons_store_assets/poster-29_5a33a3.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 46,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['batman', 'bruce wayne', 'dc', 'dark knight', 'christian bale', 'superhero'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-formula-1-car',
    slug: 'formula-1-minimalist-car-poster',
    title: 'FORMULA 1 CAR POSTER | MINIMALIST F1 STUDIO ART',
    description: 'Ultra-clean studio shot of black modern Formula 1 single-seater race car with pure white backdrop and official F1 logo.',
    category: 'AESTHETIC',
    collection: 'aesthetic',
    images: ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349712/dungeons_store_assets/poster-30_ad1370.jpg'],
    artTreatment: 'art-mono',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 50,
    featured: true,
    bestseller: true,
    newArrival: true,
    tags: ['formula 1', 'f1', 'race car', 'motorsport', 'minimalist', 'white'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
];

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  available: boolean;
  image: string;
  description?: string;
};

// 9 Official Coming Soon Categories
export const comingSoonCategories = [
  { id: 'cat-wallart', name: 'Wall Art', slug: 'wall-art', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349694/dungeons_store_assets/circle-2_3df893.jpg', 200, 80), description: 'Handcrafted gallery canvas art and modern wall decor.' },
  { id: 'cat-wallmounts', name: 'Wall Mounts', slug: 'wall-mounts', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349692/dungeons_store_assets/circle-3_c756da.jpg', 200, 80), description: 'Floating oak shelves, display brackets, and gallery mounts.' },
  { id: 'cat-beanbags', name: 'Bean Bags', slug: 'bean-bags', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349693/dungeons_store_assets/circle-4_4f8dd6.jpg', 200, 80), description: 'Ultra-comfortable luxury corduroy and velvet lounger bean bags.' },
  { id: 'cat-flags', name: 'Flags', slug: 'flags', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349694/dungeons_store_assets/circle-5_e14394.jpg', 200, 80), description: 'Vintage pop-culture, motorsport, and aesthetic wall tapestry flags.' },
  { id: 'cat-mirrors', name: 'Mirrors', slug: 'mirrors', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349694/dungeons_store_assets/circle-6_71a8b7.jpg', 200, 80), description: 'Chic wavy and arched statement aesthetic vanity wall mirrors.' },
  { id: 'cat-couches', name: 'Couches', slug: 'couches', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349694/dungeons_store_assets/circle-7_cac42e.jpg', 200, 80), description: 'Plush velvet, aesthetic woven, and statement designer luxury couches.' },
  { id: 'cat-tables-chairs', name: 'Tables & Chairs', slug: 'tables-chairs', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349694/dungeons_store_assets/circle-8_851b08.jpg', 200, 80), description: 'Minimalist designer dining tables, side tables and accent chairs.' },
  { id: 'cat-curtains', name: 'Curtains', slug: 'curtains', image: '/assets/cat-curtains.jpg', description: 'Designer floral sheer drapes and luxury blackout window curtains.' },
  { id: 'cat-rugs', name: 'Rugs & Carpets', slug: 'rugs-carpets', image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/circle-9_d755df.jpg', 200, 80), description: 'Hand-tufted Berber wool area rugs and modern floor tapestries.' },
];

export const storeCategories: StoreCategory[] = [
  { id: 'cat-posters', name: 'Posters', slug: 'posters', available: true, image: optimizeCloudinary('https://res.cloudinary.com/pyjyrmry/image/upload/v1793349692/dungeons_store_assets/circle-1_15823b.jpg', 200, 80), description: 'Museum-grade archival matte posters.' },
  ...comingSoonCategories.map((c) => ({ ...c, available: false })),
];

export interface CircleProductMeta {
  id: string;
  name: string;
  slug: string;
  icon: string;
  defaultPrice: number;
  defaultCompare: number;
  placeholderTitle: string;
  defaultDescription: string;
}

export const CIRCLE_PRODUCT_CATEGORIES: CircleProductMeta[] = [
  {
    id: 'cat-mirrors',
    name: 'Mirrors',
    slug: 'mirrors',
    icon: '🪞',
    defaultPrice: 1499,
    defaultCompare: 2999,
    placeholderTitle: 'Aesthetic Wavy Vanity Wall Mirror | Full Length',
    defaultDescription: 'Premium high-definition silver float glass with a modern curved wavy frame. Includes dual heavy-duty wall anchors.',
  },
  {
    id: 'cat-wallart',
    name: 'Wall Art',
    slug: 'wall-art',
    icon: '🖼️',
    defaultPrice: 999,
    defaultCompare: 1999,
    placeholderTitle: 'Textured Canvas Wall Art | Golden Horizon Landscape',
    defaultDescription: 'Handcrafted gallery-wrapped canvas with rich textured acrylic accents. UV-resistant fade-proof finish.',
  },
  {
    id: 'cat-wallmounts',
    name: 'Wall Mounts',
    slug: 'wall-mounts',
    icon: '🪵',
    defaultPrice: 799,
    defaultCompare: 1599,
    placeholderTitle: 'Solid Oak Floating Display Bracket & Wall Shelf',
    defaultDescription: 'Precision-crafted solid seasoned oak wood. Pre-drilled hidden mounting brackets with wall anchors included.',
  },
  {
    id: 'cat-beanbags',
    name: 'Bean Bags',
    slug: 'bean-bags',
    icon: '🛋️',
    defaultPrice: 1999,
    defaultCompare: 3999,
    placeholderTitle: 'Luxury Corduroy Lounger Bean Bag (XL)',
    defaultDescription: 'Plush ribbed corduroy fabric with reinforced double-stitched seams. Dual child-safety zipper closure.',
  },
  {
    id: 'cat-flags',
    name: 'Flags',
    slug: 'flags',
    icon: '🚩',
    defaultPrice: 499,
    defaultCompare: 999,
    placeholderTitle: 'Vintage Motorsport Wall Tapestry Flag | 5ft x 3ft',
    defaultDescription: 'High-density 100D polyester with brass grommets on all four corners. Vivid double-sided print, wrinkle-resistant.',
  },
  {
    id: 'cat-couches',
    name: 'Couches',
    slug: 'couches',
    icon: '🛋️',
    defaultPrice: 14999,
    defaultCompare: 24999,
    placeholderTitle: 'Curved Bouclé Modern Statement 2-Seater Couch',
    defaultDescription: 'Ultra-soft textured bouclé upholstery over high-resilience foam and a solid hardwood frame.',
  },
  {
    id: 'cat-tables-chairs',
    name: 'Tables & Chairs',
    slug: 'tables-chairs',
    icon: '🪑',
    defaultPrice: 4999,
    defaultCompare: 8999,
    placeholderTitle: 'Minimalist Walnut Coffee Table & Accent Chair Set',
    defaultDescription: 'Solid natural walnut veneer with powder-coated matte black steel legs. Scratch-resistant matte lacquer finish.',
  },
  {
    id: 'cat-curtains',
    name: 'Curtains',
    slug: 'curtains',
    icon: '🪟',
    defaultPrice: 899,
    defaultCompare: 1799,
    placeholderTitle: 'Luxury Linen Sheer Blackout Window Drapes (Set of 2)',
    defaultDescription: 'Premium textured linen-blend fabric with 85% thermal blackout lining. Rust-proof stainless steel eyelets.',
  },
  {
    id: 'cat-rugs',
    name: 'Rugs & Carpets',
    slug: 'rugs-carpets',
    icon: '🧶',
    defaultPrice: 2499,
    defaultCompare: 4999,
    placeholderTitle: 'Hand-Tufted Berber Wool Geometric Floor Rug (4x6 ft)',
    defaultDescription: '100% natural wool pile hand-tufted by master artisans. Non-slip cotton canvas backing with reinforced edges.',
  },
];

export function isPosterCategory(cat?: string): boolean {
  if (!cat) return true;
  const norm = cat.toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (norm === 'posters') return true;
  const isCircleProduct = CIRCLE_PRODUCT_CATEGORIES.some((c) => c.slug === norm);
  return !isCircleProduct;
}

export const ACTIVE_CATEGORIES_KEY = 'dungeons_active_circle_categories_v2';

export function getActiveCategorySlugs(): Set<string> {
  const set = new Set<string>(['posters']);
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(ACTIVE_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((s) => typeof s === 'string' && set.add(s.toLowerCase().trim()));
      }
    }
  } catch (e) {}
  return set;
}

export function setActiveCategorySlug(slug: string, active = true): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getActiveCategorySlugs();
    const cleanSlug = slug.toLowerCase().trim().replace(/[\s_]+/g, '-');
    if (active) set.add(cleanSlug);
    else if (cleanSlug !== 'posters') set.delete(cleanSlug);
    localStorage.setItem(ACTIVE_CATEGORIES_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent('dungeons:categories-updated'));
  } catch (e) {}
}

export function getStoreCategories(liveProducts: Product[] = []): StoreCategory[] {
  const activeSlugs = getActiveCategorySlugs();
  const prodList = liveProducts.length > 0 ? liveProducts : products;

  return storeCategories.map((cat) => {
    if (cat.slug === 'posters') {
      return { ...cat, available: true };
    }

    const catSlug = cat.slug.toLowerCase().trim();
    const catName = cat.name.toLowerCase().trim();
    const normSlug = catSlug.replace(/[\s_]+/g, '-');
    const normName = catName.replace(/[\s_]+/g, '-');

    // Check if any product in catalog matches this category
    const hasProduct = prodList.some((p) => {
      const pCat = (p.category || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
      const pCol = (p.collection || '').toLowerCase().trim().replace(/[\s_]+/g, '-');

      if (pCat === normSlug || pCat === normName) return true;
      if (pCol === normSlug || pCol === normName) return true;
      if (Array.isArray(p.tags) && p.tags.some((t) => {
        const normT = (t || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
        return normT === normSlug || normT === normName;
      })) {
        return true;
      }
      return false;
    });

    const isAvailable = hasProduct || activeSlugs.has(normSlug) || activeSlugs.has(normName);

    return {
      ...cat,
      available: isAvailable,
    };
  });
}

export function useStoreCategories() {
  const { products: liveProducts, isLoading } = useLiveProductsWithStatus();
  const [categories, setCategories] = useState<StoreCategory[]>(() => getStoreCategories(liveProducts));

  useEffect(() => {
    setCategories(getStoreCategories(liveProducts));
  }, [liveProducts]);

  useEffect(() => {
    const handler = () => {
      setCategories(getStoreCategories(liveProducts));
    };
    window.addEventListener('dungeons:categories-updated', handler);
    window.addEventListener('dungeons:products-updated', handler);
    return () => {
      window.removeEventListener('dungeons:categories-updated', handler);
      window.removeEventListener('dungeons:products-updated', handler);
    };
  }, [liveProducts]);

  return { categories, liveProducts, isLoading };
}

// 11 Official Poster Categories
export const posterCategories = [
  { id: 'cat-marvel-dc', slug: 'marvel-dc', title: 'Marvel & DC', name: 'Marvel & DC', description: 'Cinematic superheroes, comic art, and collector editions.' },
  { id: 'cat-anime', slug: 'anime', title: 'Anime', name: 'Anime', description: 'Legendary anime heroes, wanted bounty posters, and epic fights.' },
  { id: 'cat-movies-web-series', slug: 'movies-web-series', title: 'Movies & Web Series', name: 'Movies & Web Series', description: 'Cult classics, blockbuster cinema, and binge-worthy drama posters.' },
  { id: 'cat-music-artists', slug: 'music-artists', title: 'Music Artists', name: 'Music Artists', description: 'Rap titans, rock legends, pop sensation album covers and portraits.' },
  { id: 'cat-video-games', slug: 'video-games', title: 'Video Games', name: 'Video Games', description: 'Gaming icons, retro arcade, esports glory, and pixel art.' },
  { id: 'cat-sports', slug: 'sports', title: 'Sports', name: 'Sports', description: 'Pitch legends, football, basketball, cricket, and UFC championship glory.' },
  { id: 'cat-landscapes', slug: 'landscapes', title: 'Landscapes', name: 'Landscapes', description: 'Breathtaking scenic vistas, nature escapes, and wanderlust photography.' },
  { id: 'cat-diva', slug: 'diva', title: 'Diva', name: 'Diva', description: 'Aesthetic icons, pop idols, and trendsetting style portraits.' },
  { id: 'cat-automative', slug: 'automative', title: 'Automative', name: 'Automative', description: 'Supercars, hypercars, drift icons, and motorsport speed art.' },
  { id: 'cat-motivational', slug: 'motivational', title: 'Motivational', name: 'Motivational', description: 'Hustle mindset, gym ambition, discipline, and daily inspiration.' },
  { id: 'cat-devotional', slug: 'devotional', title: 'Devotional', name: 'Devotional', description: 'Serene spiritual deities, divine vibes, and eternal blessings.' },
];

export const DYNAMIC_CATEGORIES_KEY = 'dungeons_dynamic_poster_categories_v2';

export interface DynamicPosterCategory {
  id?: string;
  slug: string;
  title: string;
  name?: string;
  description?: string;
}

export function getDynamicPosterCategories(): DynamicPosterCategory[] {
  const baseList: DynamicPosterCategory[] = [...posterCategories];
  if (typeof window === 'undefined') return baseList;
  try {
    const raw = localStorage.getItem(DYNAMIC_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seen = new Set(baseList.map((c) => c.slug));
        parsed.forEach((item) => {
          if (item && item.slug && !seen.has(item.slug)) {
            baseList.push(item);
            seen.add(item.slug);
          }
        });
      }
    }
  } catch (e) {}
  return baseList;
}

export function addDynamicPosterCategory(name: string): DynamicPosterCategory {
  const trimmed = name.trim();
  const slug = trimmed
    .toLowerCase()
    .replace(/ & /g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const title = trimmed.toUpperCase();
  const newCat: DynamicPosterCategory = {
    id: `cat-${slug}`,
    slug,
    title,
    name: trimmed,
    description: `Curated ${trimmed} poster prints and artwork.`,
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = getDynamicPosterCategories();
      if (!existing.some((c) => c.slug === slug)) {
        existing.push(newCat);
        localStorage.setItem(DYNAMIC_CATEGORIES_KEY, JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent('dungeons:categories-updated', { detail: existing }));
      }
    } catch (e) {}
  }
  return newCat;
}

export function deleteDynamicPosterCategory(slug: string): DynamicPosterCategory[] {
  if (typeof window !== 'undefined') {
    try {
      const existing = getDynamicPosterCategories().filter((c) => c.slug !== slug);
      localStorage.setItem(DYNAMIC_CATEGORIES_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('dungeons:categories-updated', { detail: existing }));
      return existing;
    } catch (e) {}
  }
  return [];
}

export const collections = [
  { slug: 'all', title: 'ALL POSTERS', description: 'Complete collection of premium archival matte posters.', treatment: 'art-aurora' },
  { slug: 'marvel-dc', title: 'MARVEL & DC', description: 'Cinematic superheroes, comic art, and collector editions.', treatment: 'art-signal' },
  { slug: 'anime', title: 'ANIME', description: 'Legendary anime heroes, wanted bounty posters, and epic fights.', treatment: 'art-signal' },
  { slug: 'diva', title: 'DIVA', description: 'Aesthetic icons, pop idols, and trendsetting style portraits.', treatment: 'art-aurora' },
  { slug: 'landscapes', title: 'LANDSCAPES', description: 'Breathtaking scenic vistas, nature escapes, and wanderlust photography.', treatment: 'art-dive' },
  { slug: 'automative', title: 'AUTOMATIVE', description: 'Supercars, hypercars, drift icons, and motorsport speed art.', treatment: 'art-night' },
  { slug: 'movies-web-series', title: 'MOVIES & WEB SERIES', description: 'Cult classics, blockbuster cinema, and binge-worthy drama posters.', treatment: 'art-signal' },
  { slug: 'music-artists', title: 'MUSIC ARTISTS', description: 'Rap titans, rock legends, pop sensation album covers and portraits.', treatment: 'art-pulse' },
  { slug: 'video-games', title: 'VIDEO GAMES', description: 'Gaming icons, retro arcade, esports glory, and pixel art.', treatment: 'art-night' },
  { slug: 'sports', title: 'SPORTS', description: 'Pitch legends, football, basketball, cricket, and UFC championship glory.', treatment: 'art-pulse' },
  { slug: 'motivational', title: 'MOTIVATIONAL', description: 'Hustle mindset, gym ambition, discipline, and daily inspiration.', treatment: 'art-aurora' },
  { slug: 'devotional', title: 'DEVOTIONAL', description: 'Serene spiritual deities, divine vibes, and eternal blessings.', treatment: 'art-aurora' },
  { slug: 'wall-packs', title: 'WALL PACKS', description: 'Curated multi-piece sets crafted to transform any wall.', treatment: 'art-dive' },
  // Backward compatibility aliases
  { slug: 'football', title: 'SPORTS', description: 'Football pitch legends and match-winning art.', treatment: 'art-night' },
  { slug: 'cricket', title: 'SPORTS', description: 'Cricket legends and championship moments.', treatment: 'art-pulse' },
  { slug: 'aesthetic', title: 'MOVIES & WEB SERIES', description: 'Editorial fashion and cinema classics.', treatment: 'art-dive' },
];

export function transformDbProductToFrontend(p: any): Product {
  const compareAt = p.compareAtPrice ?? (p.price ? Math.round(Number(p.price) * 1.8) : 159);
  const discount = compareAt > p.price ? Math.round(((compareAt - p.price) / compareAt) * 100) : 0;

  // Extract sizePrices if present or parse from tags (e.g. sizeprice:A5:79)
  const sizePrices: Partial<Record<PosterSize, number>> = { ...(p.sizePrices || {}) };
  const sizeComparePrices: Partial<Record<PosterSize, number>> = { ...(p.sizeComparePrices || {}) };

  if (Array.isArray(p.tags)) {
    for (const tag of p.tags) {
      if (typeof tag === 'string' && tag.startsWith('sizeprice:')) {
        const parts = tag.split(':');
        if (parts.length >= 3) {
          const sz = parts[1] as PosterSize;
          const val = Number(parts[2]);
          if (!isNaN(val) && val > 0) sizePrices[sz] = val;
        }
      }
      if (typeof tag === 'string' && tag.startsWith('sizecompare:')) {
        const parts = tag.split(':');
        if (parts.length >= 3) {
          const sz = parts[1] as PosterSize;
          const val = Number(parts[2]);
          if (!isNaN(val) && val > 0) sizeComparePrices[sz] = val;
        }
      }
    }
  }

  let rating = 4.9;
  let reviewsCount = 148;
  if (Array.isArray(p.tags)) {
    for (const tag of p.tags) {
      if (typeof tag === 'string') {
        if (tag.startsWith('rating:')) {
          const val = parseFloat(tag.split(':')[1]);
          if (!isNaN(val) && val > 0 && val <= 5) rating = val;
        } else if (tag.startsWith('reviews:')) {
          const val = parseInt(tag.split(':')[1], 10);
          if (!isNaN(val) && val >= 0) reviewsCount = val;
        }
      }
    }
  }
  if (typeof p.rating === 'number' && !isNaN(p.rating) && p.rating > 0) rating = p.rating;
  if (typeof p.reviewsCount === 'number' && !isNaN(p.reviewsCount) && p.reviewsCount >= 0) reviewsCount = p.reviewsCount;

  const isPoster = isPosterCategory(p.category);
  const basePrice = Number(p.price) || (isPoster ? 79 : 999);
  const baseCompare = Number(compareAt) || Math.round(basePrice * 2);

  if (isPoster) {
    if (!sizePrices.A5) sizePrices.A5 = basePrice;
    if (!sizePrices.A4) sizePrices.A4 = Math.round(basePrice * 1.5);
    if (!sizePrices.A3) sizePrices.A3 = Math.round(basePrice * 2.2);

    if (!sizeComparePrices.A5) sizeComparePrices.A5 = baseCompare;
    if (!sizeComparePrices.A4) sizeComparePrices.A4 = Math.round(baseCompare * 1.5);
    if (!sizeComparePrices.A3) sizeComparePrices.A3 = Math.round(baseCompare * 2.2);
  } else {
    sizePrices.Standard = basePrice;
    sizeComparePrices.Standard = baseCompare;
  }

  // Wall art: every size the admin offers gets a price (older items reuse their existing price)
  if (!isPoster && isWallArtCategory(p.category)) {
    const sale = wallArtSalePrice(sizePrices, basePrice);
    const saleCompare = wallArtSalePrice(sizeComparePrices, baseCompare) || Math.round(sale * 2);
    for (const sz of getAvailableSizes({ category: p.category, tags: p.tags })) {
      if (!((sizePrices[sz] as number) > 0) && sale > 0) sizePrices[sz] = sale;
      if (!((sizeComparePrices[sz] as number) > 0) && saleCompare > 0) sizeComparePrices[sz] = saleCompare;
    }
  }
  const wallArtSizes = isPoster ? [] : getWallArtSizes({ category: p.category, tags: p.tags });
  // Posters: the card price is A5, or the first size the admin offers if A5 is switched off
  const posterSizesOn = isPoster ? getAvailableSizes({ category: p.category, tags: p.tags }) : [];
  const posterFromSize = posterSizesOn.includes('A5') ? 'A5' : posterSizesOn[0] || 'A5';
  const wallArtFrom = wallArtSizes.length ? (sizePrices[wallArtSizes[0]] as number) : 0;
  const wallArtFromCompare = wallArtSizes.length ? ((sizeComparePrices[wallArtSizes[0]] as number) || Math.round(wallArtFrom * 2)) : 0;

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description || '',
    category: (p.category || (isPoster ? 'POSTERS' : 'PRODUCTS')).toUpperCase(),
    collection: (p.category || (isPoster ? 'posters' : 'products')).toLowerCase(),
    images: Array.isArray(p.images) && p.images.some((img: any) => typeof img === 'string' && img.trim().length > 0)
      ? p.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
      : ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/poster-01_24409e.jpg'],
    artTreatment: 'art-signal',
    price: isPoster ? (sizePrices[posterFromSize] || sizePrices.A5 || basePrice) : wallArtSizes.length ? wallArtFrom : basePrice,
    compareAtPrice: isPoster ? (sizeComparePrices[posterFromSize] || sizeComparePrices.A5 || baseCompare) : wallArtSizes.length ? wallArtFromCompare : baseCompare,
    discount,
    sizes: isPoster ? (['A5', 'A4', 'A3'] as PosterSize[]) : wallArtSizes.length ? wallArtSizes : (['Standard'] as PosterSize[]),
    sizePrices,
    sizeComparePrices,
    orientation: (p.orientation as Orientation) || 'portrait',
    stock: p.stock ?? 50,
    featured: Boolean(p.isStaffPick || p.isBestSeller),
    bestseller: Boolean(p.isBestSeller),
    newArrival: Boolean(p.isNewRelease),
    trending: Boolean(
      (p as any).isTrending ||
      (p.isStaffPick && !p.isBestSeller && !p.isNewRelease) ||
      (Array.isArray(p.tags) && p.tags.some((t: any) => typeof t === 'string' && (t.toLowerCase().includes('trending') || t.toLowerCase().includes('popular') || t.toLowerCase().includes('hot'))))
    ),
    tags: Array.isArray(p.tags) ? p.tags : [],
    rating,
    reviewsCount,
    subtitle: isPoster ? `${(p.category || 'PREMIUM').toUpperCase()} ARCHIVAL POSTER` : `${(p.category || 'PREMIUM').toUpperCase()} COLLECTION`,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
    soldBy: p.seller?.businessName && p.seller?.storeSlug ? { name: String(p.seller.businessName), slug: String(p.seller.storeSlug) } : undefined,
  };
}

export const defaultCatalogProducts: Product[] = Array.isArray(rawDatabaseProducts) && rawDatabaseProducts.length > 0
  ? (rawDatabaseProducts as any[]).map(transformDbProductToFrontend)
  : seedFallbackProducts;

export function getProductSizePrice(product: Product, size: PosterSize = 'A5'): number {
  if (product.sizePrices && typeof product.sizePrices[size] === 'number' && product.sizePrices[size]! > 0) {
    return product.sizePrices[size]!;
  }
  if (isWallArtCategory(product.category)) {
    return wallArtSalePrice(product.sizePrices, product.price) || product.price || 999;
  }
  const isPoster = isPosterCategory(product.category);
  if (!isPoster) {
    return product.price || 999;
  }
  const base = product.price || 79;
  if (size === 'A5') return base;
  if (size === 'A4') return Math.round(base * 1.5);
  if (size === 'A3') return Math.round(base * 2.2);
  return base;
}

export function getProductSizeComparePrice(product: Product, size: PosterSize = 'A5'): number {
  if (product.sizeComparePrices && typeof product.sizeComparePrices[size] === 'number' && product.sizeComparePrices[size]! > 0) {
    return product.sizeComparePrices[size]!;
  }
  if (isWallArtCategory(product.category)) {
    return wallArtSalePrice(product.sizeComparePrices, product.compareAtPrice) || Math.round((product.price || 999) * 2);
  }
  const isPoster = isPosterCategory(product.category);
  if (!isPoster) {
    return product.compareAtPrice || Math.round((product.price || 999) * 2);
  }
  const baseCompare = product.compareAtPrice || Math.round((product.price || 79) * 2);
  if (size === 'A5') return baseCompare;
  if (size === 'A4') return Math.round(baseCompare * 1.5);
  if (size === 'A3') return Math.round(baseCompare * 2.2);
  return baseCompare;
}

export function getProductTierRank(p: Product): number {
  // 1. BEST SELLER
  if (
    p.bestseller ||
    (Array.isArray(p.tags) && p.tags.some((t) => typeof t === 'string' && (t.toLowerCase().includes('bestseller') || t.toLowerCase().includes('best seller'))))
  ) {
    return 1;
  }
  // 2. NEW ARRIVALS
  if (
    p.newArrival ||
    (Array.isArray(p.tags) && p.tags.some((t) => typeof t === 'string' && (t.toLowerCase().includes('new arrival') || t.toLowerCase() === 'new' || t.toLowerCase().includes('new release'))))
  ) {
    return 2;
  }
  // 3. TRENDING
  if (
    p.trending ||
    p.featured ||
    (Array.isArray(p.tags) && p.tags.some((t) => typeof t === 'string' && (t.toLowerCase().includes('trending') || t.toLowerCase().includes('popular') || t.toLowerCase().includes('hot'))))
  ) {
    return 3;
  }
  // 4. OTHER
  return 4;
}

const STORAGE_KEY = 'dungeons_catalog_products_v4';

/** Set once the stored catalog came from the server, so stale local copies can never re-add deleted items. */
const SERVER_SYNC_KEY = 'dungeons_catalog_server_synced_v1';

function markServerSynced(version: string) {
  try {
    localStorage.setItem(SERVER_SYNC_KEY, version || '1');
  } catch { /* private mode */ }
}

function isServerSynced(): boolean {
  try {
    return Boolean(localStorage.getItem(SERVER_SYNC_KEY));
  } catch {
    return false;
  }
}

const IDB_NAME = 'dungeons_store_db';
const IDB_STORE = 'catalog_products';

function openCatalogDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function saveCatalogToIndexedDB(list: Product[]) {
  if (typeof window === 'undefined') return;
  openCatalogDB().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      for (const item of list) {
        store.put(item);
      }
    } catch (e) {
      console.warn('[Catalog] IndexedDB sync notice:', e);
    }
  }).catch(() => {});
}

export function loadCatalogFromStorage(): Product[] {
  if (typeof window === 'undefined') return [...defaultCatalogProducts];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // A server-synced catalog is authoritative even when smaller than the bundled list (items were deleted)
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed.length >= defaultCatalogProducts.length || isServerSynced())) {
        return parsed.map((item: any, idx: number) => {
          const fallback = defaultCatalogProducts.find(
            (d) => d.id === item.id || (item.slug && d.slug === item.slug)
          ) || defaultCatalogProducts[idx % defaultCatalogProducts.length];

          const hasValidImages =
            Array.isArray(item.images) &&
            item.images.length > 0 &&
            item.images.some((img: any) => typeof img === 'string' && img.trim().length > 0);

          const validImages = hasValidImages
            ? item.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
            : fallback?.images || ['https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/poster-01_24409e.jpg'];

          return {
            ...fallback,
            ...item,
            images: validImages,
          };
        });
      }
      // If cached catalog has fewer products than full database (e.g. stale 20 items from old dev session),
      // preserve any user-uploaded custom posters and merge with full defaultCatalogProducts (732 posters)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customItems = parsed.filter((p: any) => p && (String(p.id).startsWith('cust') || p.customUpload));
        const merged = [...defaultCatalogProducts, ...customItems];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (e) {
    console.warn('[Catalog] Error loading catalog from localStorage:', e);
  }
  return [...defaultCatalogProducts];
}

export const products: Product[] = typeof window !== 'undefined'
  ? loadCatalogFromStorage()
  : [...defaultCatalogProducts];

// Auto-restore from IndexedDB if localStorage was wiped or truncated
if (typeof window !== 'undefined') {
  openCatalogDB().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        if (!isServerSynced() && Array.isArray(req.result) && req.result.length > products.length) {
          products.length = 0;
          products.push(...req.result);
          window.dispatchEvent(new CustomEvent('dungeons:products-updated', { detail: req.result }));
        }
      };
    } catch {}
  }).catch(() => {});
}

export function saveCatalogToStorage(newList: Product[]) {
  if (typeof window === 'undefined') return;

  // 1. Always update memory and notify listeners first so UI never drops data
  products.length = 0;
  products.push(...newList);
  window.dispatchEvent(new CustomEvent('dungeons:products-updated', { detail: newList }));

  // 2. Persist to IndexedDB (virtually unlimited quota for high-res images)
  saveCatalogToIndexedDB(newList);

  // 3. Persist to localStorage safely handling quota limits
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  } catch (e: any) {
    console.warn('[Catalog] localStorage quota exceeded, trimming payload safely:', e);
    try {
      // If quota exceeded, keep first 250000 characters of data URLs or replace with placeholder
      const sanitized = newList.map((item) => {
        const hasHeavyImages = item.images?.some((img) => img.startsWith('data:') && img.length > 150000);
        if (hasHeavyImages) {
          return {
            ...item,
            images: item.images.map((img) => (img.startsWith('data:') && img.length > 150000 ? 'https://res.cloudinary.com/pyjyrmry/image/upload/v1793349698/dungeons_store_assets/poster-01_24409e.jpg' : img)),
          };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Memory state and IndexedDB maintain all custom posters safely
    }
  }
}

export function saveSingleProduct(productData: Partial<Product> & { id: string }): Product[] {
  const current = loadCatalogFromStorage();

  const isExisting = current.some((p) => p.id === productData.id);
  const productId = productData.id || `prod-custom-${Date.now()}`;

  let safeSlug = (productData.slug || productData.title || productId)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (!isExisting) {
    // If slug is taken by another product, ensure uniqueness so it NEVER overwrites existing posters!
    const slugTaken = current.some((p) => p.slug === safeSlug);
    if (slugTaken) {
      safeSlug = `${safeSlug}-${Date.now().toString().slice(-4)}`;
    }
  }

  // Ensure size prices and rating/reviews are stored in tags too for backend compatibility
  const sizePrices = productData.sizePrices || {};
  const sizeComparePrices = productData.sizeComparePrices || {};
  const cleanTags = (Array.isArray(productData.tags) ? productData.tags : [])
    .filter((t) => !t.startsWith('sizeprice:') && !t.startsWith('sizecompare:') && !t.startsWith('rating:') && !t.startsWith('reviews:'));

  if (sizePrices.A5) cleanTags.push(`sizeprice:A5:${sizePrices.A5}`);
  if (sizePrices.A4) cleanTags.push(`sizeprice:A4:${sizePrices.A4}`);
  if (sizePrices.A3) cleanTags.push(`sizeprice:A3:${sizePrices.A3}`);
  if (sizeComparePrices.A5) cleanTags.push(`sizecompare:A5:${sizeComparePrices.A5}`);
  if (sizeComparePrices.A4) cleanTags.push(`sizecompare:A4:${sizeComparePrices.A4}`);
  if (sizeComparePrices.A3) cleanTags.push(`sizecompare:A3:${sizeComparePrices.A3}`);
  if (productData.rating !== undefined) cleanTags.push(`rating:${productData.rating}`);
  if (productData.reviewsCount !== undefined) cleanTags.push(`reviews:${productData.reviewsCount}`);

  const index = isExisting
    ? current.findIndex((p) => p.id === productId)
    : -1;

  let updatedList: Product[];
  if (index >= 0) {
    const existing = current[index];
    const compareAt = productData.compareAtPrice !== undefined
      ? Number(productData.compareAtPrice)
      : existing.compareAtPrice;
    const price = productData.price !== undefined
      ? Number(productData.price)
      : existing.price;
    const discount = compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : 0;

    const updated: Product = {
      ...existing,
      ...productData,
      id: productId,
      slug: safeSlug,
      description: productData.description !== undefined ? productData.description : existing.description,
      price,
      compareAtPrice: compareAt,
      discount,
      sizePrices: { ...existing.sizePrices, ...sizePrices },
      sizeComparePrices: { ...existing.sizeComparePrices, ...sizeComparePrices },
      stock: productData.stock !== undefined ? Number(productData.stock) : existing.stock,
      rating: productData.rating !== undefined ? Number(productData.rating) : existing.rating,
      reviewsCount: productData.reviewsCount !== undefined ? Number(productData.reviewsCount) : existing.reviewsCount,
      images: Array.isArray(productData.images) && productData.images.length > 0
        ? productData.images
        : existing.images,
      tags: cleanTags,
    };
    updatedList = [...current];
    updatedList[index] = updated;
  } else {
    const newProd = transformDbProductToFrontend({
      ...productData,
      id: productId,
      slug: safeSlug,
      description: productData.description || '',
      price: Number(productData.price || sizePrices.A5 || 79),
      compareAtPrice: Number(productData.compareAtPrice || sizeComparePrices.A5 || 159),
      sizePrices,
      sizeComparePrices,
      tags: cleanTags,
    });
    updatedList = [newProd, ...current];
  }

  saveCatalogToStorage(updatedList);

  if (productData.category) {
    const rawCat = productData.category.toLowerCase().trim().replace(/[\s_]+/g, '-');
    setActiveCategorySlug(rawCat, true);
  }

  return updatedList;
}

export function deleteSingleProduct(productId: string): Product[] {
  const current = loadCatalogFromStorage();
  const updatedList = current.filter((p) => p.id !== productId && p.slug !== productId);
  saveCatalogToStorage(updatedList);
  return updatedList;
}

let activeFetchPromise: Promise<Product[]> | null = null;
let lastFetchTimestamp = 0;
let lastVersionCheck = 0;
let loadedCatalogVersion = '';

/** Tiny never-cached fingerprint that changes whenever the catalog changes ('' if the API does not support it). */
async function fetchCatalogVersion(): Promise<string> {
  try {
    const res = await fetch('/api/catalog-version', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return '';
    const data = await res.json();
    return data?.success && typeof data.version === 'string' ? data.version : '';
  } catch {
    return '';
  }
}

export async function fetchLiveProducts(force = false): Promise<Product[]> {
  const now = Date.now();

  // Deduplicate concurrent calls: return existing in-flight promise
  if (activeFetchPromise && !force) {
    return activeFetchPromise;
  }

  // Recently synced: reuse memory/storage (many components call this on mount)
  if (!force && lastFetchTimestamp > 0 && now - lastVersionCheck < 60 * 1000) {
    const stored = loadCatalogFromStorage();
    if (stored && stored.length > 0) return stored;
  }

  activeFetchPromise = (async () => {
    try {
      lastVersionCheck = Date.now();
      const version = await fetchCatalogVersion();

      // Nothing changed since our last full load: keep the stored catalog (no big download)
      if (!force && version && version === loadedCatalogVersion) {
        const stored = loadCatalogFromStorage();
        if (stored && stored.length > 0) return stored;
      }

      // Versioned URL: the CDN caches each snapshot, and a new version means a new URL,
      // so admin edits/deletes appear immediately. Older APIs without versions fall back to
      // a revalidated request so the browser never reuses a stale copy.
      const res = version
        ? await fetch(`/api/products?limit=2000&v=${encodeURIComponent(version)}`)
        : await fetch('/api/products?limit=2000', { cache: 'no-cache' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        const stored = loadCatalogFromStorage();
        return stored && stored.length > 0 ? stored : [...defaultCatalogProducts];
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        const transformed = data.products.map(transformDbProductToFrontend);
        markServerSynced(version);
        saveCatalogToStorage(transformed);
        lastFetchTimestamp = Date.now();
        loadedCatalogVersion = version;
        return transformed;
      }
    } catch (err) {
      console.warn('[Catalog] Database fetch fallback to local storage:', err);
    } finally {
      activeFetchPromise = null;
    }
    const stored = loadCatalogFromStorage();
    return stored && stored.length > 0 ? stored : [...defaultCatalogProducts];
  })();

  return activeFetchPromise;
}

export function useLiveProductsWithStatus(): { products: Product[]; isLoading: boolean } {
  const [list, setList] = useState<Product[]>(() => {
    const stored = typeof window !== 'undefined' ? loadCatalogFromStorage() : [...products];
    return stored && stored.length > 0 ? stored : [...defaultCatalogProducts];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Immediately sync with localStorage if available
    const localCurrent = loadCatalogFromStorage();
    if (localCurrent && localCurrent.length > 0) {
      setList([...localCurrent]);
      setIsLoading(false);
    }

    // Fetch up to 2000 live posters from Prisma database
    fetchLiveProducts().then((dbList) => {
      if (isMounted) {
        setList([...dbList]);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    const onUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setList([...e.detail]);
        setIsLoading(false);
      } else {
        const stored = loadCatalogFromStorage();
        setList([...stored]);
        if (stored.length > 0) setIsLoading(false);
      }
    };

    window.addEventListener('dungeons:products-updated', onUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('dungeons:products-updated', onUpdate);
    };
  }, []);

  return { products: list, isLoading };
}

export function useLiveProducts(): Product[] {
  const { products } = useLiveProductsWithStatus();
  return products;
}

// Auto-fetch from Prisma database on client startup and listen to other tabs
if (typeof window !== 'undefined') {
  fetchLiveProducts();
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          products.length = 0;
          products.push(...parsed);
          window.dispatchEvent(new CustomEvent('dungeons:products-updated', { detail: parsed }));
        }
      } catch {}
    }
  });
}

export function getProduct(slug?: string) {
  if (!slug) return undefined;
  const current = typeof window !== 'undefined' ? loadCatalogFromStorage() : products;
  return current.find((product) => product.slug === slug || product.id === slug);
}

export function getProductStock(productIdOrSlug?: string, title?: string): number {
  if (!productIdOrSlug && !title) return 999;
  const list = typeof window !== 'undefined' ? loadCatalogFromStorage() : products;
  const match = list.find((p) =>
    (productIdOrSlug && (p.id === productIdOrSlug || p.slug === productIdOrSlug)) ||
    (title && (
      p.title.toLowerCase() === title.toLowerCase() ||
      (p.slug && title.toLowerCase().includes(p.slug.toLowerCase())) ||
      (p.title && title.toLowerCase().includes(p.title.toLowerCase().split('|')[0].trim()))
    ))
  );
  if (match && typeof match.stock === 'number' && !isNaN(match.stock)) {
    return Math.max(0, match.stock);
  }
  return 50;
}

export function searchProducts(query: string, sourceProducts: Product[] = products) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const list = sourceProducts && sourceProducts.length > 0
    ? sourceProducts
    : (typeof window !== 'undefined' ? loadCatalogFromStorage() : defaultCatalogProducts);
  return list.filter((product) =>
    [product.title, product.category, product.collection, product.description, ...product.tags]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  );
}

export function formatPrice(value: number) {
  return `RS. ${value.toFixed(2)}`;
}
