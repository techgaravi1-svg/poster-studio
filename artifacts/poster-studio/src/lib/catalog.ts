export type PosterSize = 'A4' | 'A3' | '50×70' | '70×100';
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
};

const treatments = ['art-aurora', 'art-mono', 'art-dive', 'art-signal', 'art-pulse', 'art-night'];

const productSeed: Array<Omit<Product, 'images' | 'artTreatment'>> = [
  { id: 'p-01', slug: 'moonlit-arcade', title: 'Moonlit Arcade', description: 'A neon-free midnight study of cabinets, rain and the last token in your pocket.', category: 'Gaming', collection: 'gaming', price: 28, compareAtPrice: 34, discount: 18, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 18, featured: true, bestseller: true, newArrival: false, tags: ['arcade', 'retro', 'night'], rating: 4.9 },
  { id: 'p-02', slug: 'parallel-quests', title: 'Parallel Quests', description: 'Four paths, one controller. A graphic map for players who never choose the obvious route.', category: 'Gaming', collection: 'gaming', price: 31, compareAtPrice: 38, discount: 18, sizes: ['A3', '50×70', '70×100'], orientation: 'landscape', stock: 12, featured: true, bestseller: true, newArrival: true, tags: ['gaming', 'map', 'graphic'], rating: 4.8 },
  { id: 'p-03', slug: 'soft-signal', title: 'Soft Signal', description: 'A warm transmission from somewhere between a loading screen and a dream.', category: 'Abstract', collection: 'wall-packs', price: 26, compareAtPrice: 30, discount: 13, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 21, featured: true, bestseller: false, newArrival: true, tags: ['abstract', 'colour', 'minimal'], rating: 4.7 },
  { id: 'p-04', slug: 'after-hours-tokyo', title: 'After Hours, Tokyo', description: 'Compressed city light and quiet streets for the corner of the room that stays awake.', category: 'Movies', collection: 'movies', price: 32, compareAtPrice: 40, discount: 20, sizes: ['A3', '50×70', '70×100'], orientation: 'portrait', stock: 8, featured: true, bestseller: true, newArrival: false, tags: ['cinema', 'city', 'japan'], rating: 4.9 },
  { id: 'p-05', slug: 'quiet-forms-no-02', title: 'Quiet Forms No. 02', description: 'A restrained colour field with enough tension to keep a wall interesting.', category: 'Abstract', collection: 'wall-packs', price: 29, compareAtPrice: 35, discount: 17, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 30, featured: true, bestseller: false, newArrival: true, tags: ['shape', 'colour', 'studio'], rating: 4.6 },
  { id: 'p-06', slug: 'orbit-01', title: 'Orbit 01', description: 'A speculative travel poster for the first quiet morning beyond the atmosphere.', category: 'Anime', collection: 'anime', price: 34, compareAtPrice: 42, discount: 19, sizes: ['A3', '50×70', '70×100'], orientation: 'landscape', stock: 14, featured: true, bestseller: true, newArrival: true, tags: ['space', 'anime', 'future'], rating: 4.8 },
  { id: 'p-07', slug: 'sunday-driver', title: 'Sunday Driver', description: 'Fast lines, soft sky and the feeling of taking the long way home.', category: 'Movies', collection: 'movies', price: 27, compareAtPrice: 32, discount: 16, sizes: ['A4', 'A3', '50×70'], orientation: 'landscape', stock: 24, featured: false, bestseller: true, newArrival: false, tags: ['road', 'film', 'warm'], rating: 4.7 },
  { id: 'p-08', slug: 'critical-hit', title: 'Critical Hit', description: 'A sharp, typographic celebration of improbable wins.', category: 'Gaming', collection: 'gaming', price: 25, compareAtPrice: 29, discount: 14, sizes: ['A4', 'A3'], orientation: 'portrait', stock: 5, featured: false, bestseller: true, newArrival: false, tags: ['gaming', 'type', 'energy'], rating: 4.8 },
  { id: 'p-09', slug: 'blue-hour-hero', title: 'Blue Hour Hero', description: 'A cinematic character study in cobalt, coral and an oversized moon.', category: 'Anime', collection: 'anime', price: 30, compareAtPrice: 36, discount: 17, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 16, featured: false, bestseller: false, newArrival: true, tags: ['character', 'anime', 'blue'], rating: 4.6 },
  { id: 'p-10', slug: 'market-open', title: 'Market Open', description: 'Candlesticks become architecture in this optimistic print for patient thinkers.', category: 'Trading', collection: 'trading', price: 33, compareAtPrice: 39, discount: 15, sizes: ['A3', '50×70'], orientation: 'landscape', stock: 11, featured: true, bestseller: false, newArrival: true, tags: ['trading', 'finance', 'abstract'], rating: 4.5 },
  { id: 'p-11', slug: 'bull-runner', title: 'Bull Runner', description: 'A playful, kinetic chart for desks that need a little momentum.', category: 'Trading', collection: 'trading', price: 24, compareAtPrice: 28, discount: 14, sizes: ['A4', 'A3'], orientation: 'portrait', stock: 19, featured: false, bestseller: false, newArrival: false, tags: ['trading', 'desk', 'graphic'], rating: 4.4 },
  { id: 'p-12', slug: 'last-safe-zone', title: 'Last Safe Zone', description: 'A field guide to the place where every good match begins.', category: 'Free Fire', collection: 'free-fire', price: 29, compareAtPrice: 36, discount: 19, sizes: ['A3', '50×70'], orientation: 'portrait', stock: 9, featured: true, bestseller: true, newArrival: false, tags: ['free fire', 'battle', 'map'], rating: 4.9 },
  { id: 'p-13', slug: 'drop-point', title: 'Drop Point', description: 'Aerial geometry and a little danger, composed for a statement wall.', category: 'Free Fire', collection: 'free-fire', price: 27, compareAtPrice: 32, discount: 16, sizes: ['A4', 'A3', '50×70'], orientation: 'landscape', stock: 17, featured: false, bestseller: false, newArrival: true, tags: ['free fire', 'map', 'aerial'], rating: 4.6 },
  { id: 'p-14', slug: 'the-long-cut', title: 'The Long Cut', description: 'Film grain, a hard crop and the title card of a story you write yourself.', category: 'Movies', collection: 'movies', price: 35, compareAtPrice: 44, discount: 20, sizes: ['A3', '50×70', '70×100'], orientation: 'portrait', stock: 7, featured: true, bestseller: false, newArrival: false, tags: ['cinema', 'editorial', 'black'], rating: 4.8 },
  { id: 'p-15', slug: 'wall-pack-vol-01', title: 'Wall Pack / Vol. 01', description: 'Three small studies designed to talk to each other across a shelf or hallway.', category: 'Wall Packs', collection: 'wall-packs', price: 48, compareAtPrice: 60, discount: 20, sizes: ['A4', 'A3'], orientation: 'portrait', stock: 13, featured: true, bestseller: true, newArrival: false, tags: ['set', 'wall pack', 'bundle'], rating: 4.9 },
  { id: 'p-16', slug: 'wall-pack-rush', title: 'Wall Pack / Rush', description: 'A bright trio of rhythm, colour and clipped type.', category: 'Wall Packs', collection: 'wall-packs', price: 52, compareAtPrice: 65, discount: 20, sizes: ['A4', 'A3'], orientation: 'landscape', stock: 6, featured: false, bestseller: true, newArrival: true, tags: ['set', 'wall pack', 'colour'], rating: 4.7 },
  { id: 'p-17', slug: 'mecha-garden', title: 'Mecha Garden', description: 'Organic shapes meet engineered lines in a poster for gentle futurists.', category: 'Anime', collection: 'anime', price: 31, compareAtPrice: 37, discount: 16, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 22, featured: true, bestseller: false, newArrival: true, tags: ['anime', 'mecha', 'garden'], rating: 4.7 },
  { id: 'p-18', slug: 'controller-study', title: 'Controller Study', description: 'A tactile still life of buttons, hands and the pause before the next level.', category: 'Gaming', collection: 'gaming', price: 28, compareAtPrice: 33, discount: 15, sizes: ['A4', 'A3'], orientation: 'portrait', stock: 20, featured: false, bestseller: false, newArrival: false, tags: ['gaming', 'still life', 'type'], rating: 4.5 },
  { id: 'p-19', slug: 'night-shift', title: 'Night Shift', description: 'A dark, electric composition for people who do their best work after midnight.', category: 'Abstract', collection: 'wall-packs', price: 30, compareAtPrice: 36, discount: 17, sizes: ['A3', '50×70', '70×100'], orientation: 'landscape', stock: 10, featured: false, bestseller: false, newArrival: true, tags: ['night', 'abstract', 'dark'], rating: 4.6 },
  { id: 'p-20', slug: 'candles-and-clouds', title: 'Candles & Clouds', description: 'A soft market chart that feels more like weather than finance.', category: 'Trading', collection: 'trading', price: 26, compareAtPrice: 31, discount: 16, sizes: ['A4', 'A3'], orientation: 'portrait', stock: 15, featured: false, bestseller: false, newArrival: true, tags: ['trading', 'soft', 'cloud'], rating: 4.4 },
  { id: 'p-21', slug: 'squad-symbol', title: 'Squad Symbol', description: 'A bold emblem for the friends who make every lobby feel like home.', category: 'Free Fire', collection: 'free-fire', price: 29, compareAtPrice: 35, discount: 17, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 26, featured: false, bestseller: false, newArrival: false, tags: ['free fire', 'squad', 'symbol'], rating: 4.5 },
  { id: 'p-22', slug: 'still-life-electric', title: 'Still Life, Electric', description: 'A colour study with the exact amount of chaos for a white wall.', category: 'Abstract', collection: 'wall-packs', price: 28, compareAtPrice: 34, discount: 18, sizes: ['A4', 'A3', '50×70'], orientation: 'portrait', stock: 18, featured: false, bestseller: false, newArrival: true, tags: ['colour', 'still life', 'new'], rating: 4.6 },
  { id: 'p-23', slug: 'opening-credits', title: 'Opening Credits', description: 'A clean title sequence in print: spare, dramatic and ready for the frame.', category: 'Movies', collection: 'movies', price: 25, compareAtPrice: 30, discount: 17, sizes: ['A4', 'A3'], orientation: 'landscape', stock: 31, featured: false, bestseller: false, newArrival: true, tags: ['movie', 'type', 'credits'], rating: 4.5 },
  { id: 'p-24', slug: 'save-point', title: 'Save Point', description: 'A small reminder to pause, look up and keep the good bits.', category: 'Gaming', collection: 'gaming', price: 23, compareAtPrice: 28, discount: 18, sizes: ['A4', 'A3'], orientation: 'portrait', stock: 28, featured: false, bestseller: false, newArrival: false, tags: ['gaming', 'soft', 'quote'], rating: 4.8 },
];

export const products: Product[] = productSeed.map((product, index) => ({
  ...product,
  artTreatment: treatments[index % treatments.length],
  images: [treatments[index % treatments.length], treatments[(index + 2) % treatments.length], treatments[(index + 4) % treatments.length]],
}));

export const collections = [
  { slug: 'anime', title: 'Anime studies', description: 'Original character energy, speculative worlds and frames from stories that stay with you.', treatment: 'art-mono' },
  { slug: 'movies', title: 'Movies & cinema', description: 'Poster-sized moods for film people, title-sequence obsessives and late-night viewers.', treatment: 'art-night' },
  { slug: 'gaming', title: 'Gaming worlds', description: 'For players, builders and anyone who knows the exact feeling of a save point.', treatment: 'art-signal' },
  { slug: 'trading', title: 'Trading floor', description: 'Graphic studies for desks, charts and patient thinkers.', treatment: 'art-pulse' },
  { slug: 'free-fire', title: 'Free Fire', description: 'Squad symbols, drop points and original battle-ready graphics.', treatment: 'art-aurora' },
  { slug: 'wall-packs', title: 'Wall packs', description: 'Small-batch sets made to work together across a real wall.', treatment: 'art-dive' },
];

export function getProduct(slug?: string) {
  return products.find((product) => product.slug === slug);
}

export function searchProducts(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return products.filter((product) => [product.title, product.category, product.collection, product.description, ...product.tags].join(' ').toLowerCase().includes(needle));
}

export function formatPrice(value: number) {
  return `€${value.toFixed(0)}`;
}