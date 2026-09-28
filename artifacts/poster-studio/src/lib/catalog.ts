export type PosterSize = 'A5' | 'A4' | 'A3' | '50×70' | '70×100';
export type Orientation = 'portrait' | 'landscape';

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
  orientation: Orientation;
  stock: number;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  tags: string[];
  rating: number;
  subtitle?: string;
  features?: Array<{ title: string; desc: string }>;
  notes?: Array<{ title: string; desc: string }>;
  shipping?: Array<{ title: string; desc: string }>;
};

const defaultFeatures = [
  { title: 'Premium Matte Finish', desc: 'Sharp, vibrant, and stunning under any light, perfect for showcasing every detail.' },
  { title: '350 GSM Paper', desc: 'Extra-thick, durable, and premium-grade for a high-quality, luxury feel.' },
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
  { title: 'Delivery Timeline', desc: 'Once dispatched, orders are typically delivered within 7 working days. Delivery times may vary depending on your location and courier partner and, in some cases, may take additional days to arrive.' },
];

export const products: Product[] = [
  {
    id: 'prod-spiderman-8',
    slug: 'spiderman-poster-8',
    title: 'SPIDERMAN POSTER - 8 | MARVEL POSTERS',
    description: 'High-energy Spiderman wall art featuring iconic Marvel styling, printed on 350 GSM archival paper with vibrant matte finish.',
    category: 'MARVEL & DC',
    collection: 'marvel-dc',
    images: ['/assets/spiderman-product-hero.jpg', '/assets/poster-spiderman-3piece.jpg'],
    artTreatment: 'art-signal',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 24,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['marvel', 'spiderman', 'superhero', 'comic'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-dont-be-like-them',
    slug: 'dont-be-like-them-poster',
    title: "DON'T BE LIKE THEM POSTER | GIRL BOSS POSTER",
    description: "Bold typographic aesthetic poster featuring Coco Chanel quote 'Don't be like the rest of them darling' for chic, modern rooms.",
    category: 'DEVOTIONAL',
    collection: 'devotional',
    images: ['/assets/poster-dont-be-like-them.jpg'],
    artTreatment: 'art-aurora',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 35,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['girl boss', 'aesthetic', 'quote', 'pink', 'fashion'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-ronaldo-10',
    slug: 'ronaldo-poster-10',
    title: 'RONALDO POSTER - 10 | FOOTBALL POSTERS',
    description: "Legendary Cristiano Ronaldo wall poster featuring iconic motivational quote 'In my mind I'm always the best'.",
    category: 'FOOTBALL',
    collection: 'football',
    images: ['/assets/poster-ronaldo.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 40,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['football', 'ronaldo', 'cr7', 'sports', 'legend'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-neymar-2',
    slug: 'neymar-jr-poster-2',
    title: 'NEYMAR JR. POSTER - 2 | FOOTBALL POSTER | 6 PIECE SET',
    description: 'Dynamic Neymar Jr. collector edition poster with vivid electric background and football motion typography.',
    category: 'FOOTBALL',
    collection: 'football',
    images: ['/assets/poster-neymar-2.jpg'],
    artTreatment: 'art-night',
    price: 349.00,
    compareAtPrice: 549.00,
    discount: 36,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 18,
    featured: false,
    bestseller: false,
    newArrival: true,
    tags: ['football', 'neymar', 'brazil', 'sports', '6 piece set'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-neymar-1',
    slug: 'neymar-jr-poster-1',
    title: 'NEYMAR JR. POSTER - 1 | FOOTBALL POSTER | 6 PIECE SET',
    description: 'Striking red and black graphic Neymar Jr football poster set with high impact match-day energy.',
    category: 'FOOTBALL',
    collection: 'football',
    images: ['/assets/poster-neymar-1.jpg'],
    artTreatment: 'art-mono',
    price: 349.00,
    compareAtPrice: 549.00,
    discount: 36,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 15,
    featured: false,
    bestseller: false,
    newArrival: true,
    tags: ['football', 'neymar', 'red', 'sports', '6 piece set'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-spiderman-5',
    slug: 'spiderman-poster-5',
    title: 'SPIDERMAN POSTER - 5 | MARVEL POSTERS | 3 PIECE SET',
    description: 'Collector 3-piece Spiderman set featuring vintage comic collage backdrop and high saturation web-slinger art.',
    category: 'MARVEL & DC',
    collection: 'marvel-dc',
    images: ['/assets/poster-spiderman-3piece.jpg'],
    artTreatment: 'art-signal',
    price: 299.00,
    compareAtPrice: 549.00,
    discount: 45,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 22,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['marvel', 'spiderman', 'comic', '3 piece set'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-lit',
    slug: 'lit-poster',
    title: 'LIT POSTER | GIRL BOSS POSTER',
    description: 'Moody, cinematographic aesthetic match light art print for contemporary minimalist room walls.',
    category: 'DEVOTIONAL',
    collection: 'devotional',
    images: ['/assets/poster-lit.jpg'],
    artTreatment: 'art-dive',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 28,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['aesthetic', 'moody', 'fire', 'girl boss'],
    rating: 4.8,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-custom-photobooth',
    slug: 'custom-photobooth-strip',
    title: 'Custom Photobooth Strip',
    description: 'Turn your favorite camera roll photos into authentic glossy vintage photobooth strips. Premium custom prints crafted with love.',
    category: 'CUSTOM',
    collection: 'custom',
    images: ['/assets/custom-photobooth.jpg'],
    artTreatment: 'art-aurora',
    price: 149.00,
    compareAtPrice: 299.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 99,
    featured: true,
    bestseller: true,
    newArrival: true,
    tags: ['custom', 'photobooth', 'personal', 'gift'],
    rating: 5.0,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
  {
    id: 'prod-cricket-legends',
    slug: 'cricket-legends-poster',
    title: 'VIRAT KOHLI POSTER - 18 | CRICKET POSTERS',
    description: 'King Kohli celebratory masterclass poster printed in rich tones and crisp details.',
    category: 'CRICKET',
    collection: 'cricket',
    images: ['/assets/poster-ronaldo.jpg'],
    artTreatment: 'art-pulse',
    price: 79.00,
    compareAtPrice: 159.00,
    discount: 50,
    sizes: ['A5', 'A4', 'A3'],
    orientation: 'portrait',
    stock: 30,
    featured: true,
    bestseller: true,
    newArrival: false,
    tags: ['cricket', 'virat kohli', 'sports', 'legend'],
    rating: 4.9,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  },
];

export const collections = [
  { slug: 'devotional', title: 'DEVOTIONAL POSTERS', description: 'Serene spiritual, aesthetic, and motivational editions.', treatment: 'art-aurora' },
  { slug: 'marvel-dc', title: 'MARVEL & DC', description: 'Cinematic superheroes, comic art, and collector editions.', treatment: 'art-signal' },
  { slug: 'cricket', title: 'CRICKET', description: 'Iconic moments, pitch legends, and cricket history.', treatment: 'art-pulse' },
  { slug: 'football', title: 'FOOTBALL', description: 'Pitch gods, Ronaldo, Neymar Jr, and match-winning art.', treatment: 'art-night' },
  { slug: 'wall-packs', title: 'WALL PACKS', description: 'Curated multi-piece sets crafted to transform any wall.', treatment: 'art-dive' },
];

export function getProduct(slug?: string) {
  return products.find((product) => product.slug === slug);
}

export function searchProducts(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return products.filter((product) =>
    [product.title, product.category, product.collection, product.description, ...product.tags]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  );
}

export function formatPrice(value: number) {
  return `RS. ${value.toFixed(2)}`;
}