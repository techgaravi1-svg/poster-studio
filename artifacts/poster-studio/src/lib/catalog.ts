import { useState, useEffect } from 'react';

export type PosterSize = 'A5' | 'A4' | 'A3' | '50×70' | '70×100';
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
  { title: 'Delivery Timeline', desc: 'Once dispatched, orders are typically delivered within 7 working days. Delivery times may vary depending on your location and courier partner.' },
];

export const defaultCatalogProducts: Product[] = [
  {
    id: 'prod-asta-black-clover',
    slug: 'asta-black-clover-anime-poster',
    title: 'ASTA POSTER | BLACK CLOVER ANIME POSTER',
    description: 'Fierce, vibrant yellow background Asta artwork from Black Clover, printed on 350 GSM premium archival matte paper.',
    category: 'ANIME',
    collection: 'anime',
    images: ['/assets/posters/poster-01.jpg'],
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
    images: ['/assets/posters/poster-02.jpg'],
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
    images: ['/assets/posters/poster-03.jpg'],
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
    description: 'Breathtaking upside-down skyline dive from Spider-Man: Into the Spider-Verse on 350 GSM matte finish archival paper.',
    category: 'MARVEL & DC',
    collection: 'marvel-dc',
    images: ['/assets/posters/poster-04.jpg'],
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
    images: ['/assets/posters/poster-05.jpg'],
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
    images: ['/assets/posters/poster-06.jpg'],
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
    images: ['/assets/posters/poster-07.jpg'],
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
    images: ['/assets/posters/poster-08.jpg'],
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
    images: ['/assets/posters/poster-09.jpg'],
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
    images: ['/assets/posters/poster-10.jpg'],
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
    images: ['/assets/posters/poster-11.jpg'],
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
    images: ['/assets/posters/poster-12.jpg'],
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
    images: ['/assets/posters/poster-13.jpg'],
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
    images: ['/assets/posters/poster-14.jpg'],
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
    images: ['/assets/posters/poster-15.jpg'],
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
    images: ['/assets/posters/poster-16.jpg'],
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
    images: ['/assets/posters/poster-17.jpg'],
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
    images: ['/assets/posters/poster-18.jpg'],
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
    images: ['/assets/posters/poster-19.jpg'],
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
    images: ['/assets/posters/poster-20.jpg'],
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
    images: ['/assets/posters/poster-21.jpg'],
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
    images: ['/assets/posters/poster-22.jpg'],
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
    images: ['/assets/posters/poster-23.jpg'],
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
    images: ['/assets/posters/poster-24.jpg'],
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
    images: ['/assets/posters/poster-25.jpg'],
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
    description: 'Devastating Rinnegan leader Pain (Nagato) of Akatsuki wanted dead or alive poster on 350 GSM archival paper.',
    category: 'ANIME',
    collection: 'anime',
    images: ['/assets/posters/poster-26.jpg'],
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
    images: ['/assets/posters/poster-27.jpg'],
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
    images: ['/assets/posters/poster-28.jpg'],
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
    images: ['/assets/posters/poster-29.jpg'],
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
    images: ['/assets/posters/poster-30.jpg'],
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

// 8 Official Coming Soon Categories
export const comingSoonCategories = [
  { id: 'cat-flags', name: 'Flags', slug: 'flags', image: '/assets/cat-flags.jpg', description: 'Vintage pop-culture, motorsport, and aesthetic wall tapestry flags.' },
  { id: 'cat-wallart', name: 'Wall Art', slug: 'wall-art', image: '/assets/cat-paintings.jpg', description: 'Handcrafted gallery canvas art and modern wall decor.' },
  { id: 'cat-wallmounts', name: 'Wall Mounts', slug: 'wall-mounts', image: '/assets/cat-wallmounts.jpg', description: 'Floating oak shelves, display brackets, and gallery mounts.' },
  { id: 'cat-beanbags', name: 'Bean Bags', slug: 'bean-bags', image: '/assets/cat-beanbags.jpg', description: 'Ultra-comfortable luxury corduroy and velvet lounger bean bags.' },
  { id: 'cat-mirrors', name: 'Mirrors', slug: 'mirrors', image: '/assets/cat-mirror.jpg', description: 'Chic wavy and arched statement aesthetic vanity wall mirrors.' },
  { id: 'cat-tables', name: 'Tables', slug: 'tables', image: '/assets/cat-tables.jpg', description: 'Minimalist designer side tables and accent coffee tables.' },
  { id: 'cat-rugs', name: 'Rugs & Carpets', slug: 'rugs-carpets', image: '/assets/cat-rugs.jpg', description: 'Hand-tufted Berber wool area rugs and modern floor tapestries.' },
  { id: 'cat-curtains', name: 'Curtains', slug: 'curtains', image: '/assets/cat-curtains.jpg', description: 'Sun-drenched natural linen and sheer drapery for modern rooms.' },
];

export const storeCategories: StoreCategory[] = [
  { id: 'cat-posters', name: 'Posters', slug: 'posters', available: true, image: '/assets/posters/poster-01.jpg', description: 'Museum-grade archival 350 GSM matte posters.' },
  ...comingSoonCategories.map((c) => ({ ...c, available: false })),
];

// 11 Official Poster Categories
export const posterCategories = [
  { id: 'cat-marvel-dc', slug: 'marvel-dc', title: 'Marvel & DC', name: 'Marvel & DC', description: 'Cinematic superheroes, comic art, and collector editions.' },
  { id: 'cat-anime', slug: 'anime', title: 'Anime', name: 'Anime', description: 'Legendary anime heroes, wanted bounty posters, and epic fights.' },
  { id: 'cat-diva', slug: 'diva', title: 'Diva', name: 'Diva', description: 'Aesthetic icons, pop idols, and trendsetting style portraits.' },
  { id: 'cat-landscapes', slug: 'landscapes', title: 'Landscapes', name: 'Landscapes', description: 'Breathtaking scenic vistas, nature escapes, and wanderlust photography.' },
  { id: 'cat-automative', slug: 'automative', title: 'Automative', name: 'Automative', description: 'Supercars, hypercars, drift icons, and motorsport speed art.' },
  { id: 'cat-movies-web-series', slug: 'movies-web-series', title: 'Movies & Web Series', name: 'Movies & Web Series', description: 'Cult classics, blockbuster cinema, and binge-worthy drama posters.' },
  { id: 'cat-music-artists', slug: 'music-artists', title: 'Music Artists', name: 'Music Artists', description: 'Rap titans, rock legends, pop sensation album covers and portraits.' },
  { id: 'cat-video-games', slug: 'video-games', title: 'Video Games', name: 'Video Games', description: 'Gaming icons, retro arcade, esports glory, and pixel art.' },
  { id: 'cat-sports', slug: 'sports', title: 'Sports', name: 'Sports', description: 'Pitch legends, football, basketball, cricket, and UFC championship glory.' },
  { id: 'cat-motivational', slug: 'motivational', title: 'Motivational', name: 'Motivational', description: 'Hustle mindset, gym ambition, discipline, and daily inspiration.' },
  { id: 'cat-devotional', slug: 'devotional', title: 'Devotional', name: 'Devotional', description: 'Serene spiritual deities, divine vibes, and eternal blessings.' },
];

export const collections = [
  { slug: 'all', title: 'ALL POSTERS', description: 'Complete collection of 350 GSM premium archival matte posters.', treatment: 'art-aurora' },
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
  const compareAt = p.compareAtPrice ?? (p.price * 2 - 1);
  const discount = compareAt > p.price ? Math.round(((compareAt - p.price) / compareAt) * 100) : 0;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description || '',
    category: (p.category || 'POSTERS').toUpperCase(),
    collection: (p.category || 'posters').toLowerCase(),
    images: Array.isArray(p.images) && p.images.some((img: any) => typeof img === 'string' && img.trim().length > 0)
      ? p.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
      : ['/assets/posters/poster-01.jpg'],
    artTreatment: 'art-signal',
    price: Number(p.price),
    compareAtPrice: Number(compareAt),
    discount,
    sizes: ['A5', 'A4', 'A3', '50×70', '70×100'],
    orientation: (p.orientation as Orientation) || 'portrait',
    stock: p.stock ?? 50,
    featured: Boolean(p.isStaffPick || p.isBestSeller),
    bestseller: Boolean(p.isBestSeller),
    newArrival: Boolean(p.isNewRelease),
    tags: Array.isArray(p.tags) ? p.tags : [],
    rating: 4.9,
    subtitle: `${(p.category || 'PREMIUM').toUpperCase()} 350 GSM ARCHIVAL POSTER`,
    features: defaultFeatures,
    notes: defaultNotes,
    shipping: defaultShipping,
  };
}

const STORAGE_KEY = 'dungeons_catalog_products';

export function loadCatalogFromStorage(): Product[] {
  if (typeof window === 'undefined') return defaultCatalogProducts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
            : fallback?.images || ['/assets/posters/poster-01.jpg'];

          return {
            ...fallback,
            ...item,
            images: validImages,
          };
        });
      }
    }
  } catch (e) {
    console.warn('[Catalog] Error loading catalog from localStorage:', e);
  }
  return defaultCatalogProducts;
}

export const products: Product[] = typeof window !== 'undefined'
  ? loadCatalogFromStorage()
  : [...defaultCatalogProducts];

export function saveCatalogToStorage(newList: Product[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    products.length = 0;
    products.push(...newList);
    window.dispatchEvent(new CustomEvent('dungeons:products-updated', { detail: newList }));
  } catch (e) {
    console.warn('[Catalog] Error saving catalog to localStorage:', e);
  }
}

export function saveSingleProduct(productData: Partial<Product> & { id: string }): Product[] {
  const current = loadCatalogFromStorage();
  const index = current.findIndex(
    (p) => p.id === productData.id || (productData.slug && p.slug === productData.slug)
  );

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
      price,
      compareAtPrice: compareAt,
      discount,
      stock: productData.stock !== undefined ? Number(productData.stock) : existing.stock,
      images: Array.isArray(productData.images) && productData.images.length > 0
        ? productData.images
        : existing.images,
      tags: Array.isArray(productData.tags) ? productData.tags : existing.tags,
    };
    updatedList = [...current];
    updatedList[index] = updated;
  } else {
    const newProd = transformDbProductToFrontend({
      ...productData,
      price: Number(productData.price || 79),
    });
    updatedList = [newProd, ...current];
  }

  saveCatalogToStorage(updatedList);
  return updatedList;
}

export function deleteSingleProduct(productId: string): Product[] {
  const current = loadCatalogFromStorage();
  const updatedList = current.filter((p) => p.id !== productId && p.slug !== productId);
  saveCatalogToStorage(updatedList);
  return updatedList;
}

export async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`/api/products?limit=250&_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return loadCatalogFromStorage();
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
      const transformed = data.products.map(transformDbProductToFrontend);
      saveCatalogToStorage(transformed);
      return transformed;
    }
  } catch (err) {
    console.warn('[Catalog] Database fetch fallback to local storage:', err);
  }
  return loadCatalogFromStorage();
}

export function useLiveProducts(): Product[] {
  const [list, setList] = useState<Product[]>(() => {
    return typeof window !== 'undefined' ? loadCatalogFromStorage() : [...products];
  });

  useEffect(() => {
    let isMounted = true;

    // Immediately sync with localStorage in case it updated
    const localCurrent = loadCatalogFromStorage();
    if (localCurrent && localCurrent.length > 0) {
      setList([...localCurrent]);
    }

    // Try fetching live from Prisma PostgreSQL
    fetchLiveProducts().then((dbList) => {
      if (isMounted && dbList && dbList.length > 0) {
        setList([...dbList]);
      }
    });

    const onUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setList([...e.detail]);
      } else {
        setList([...loadCatalogFromStorage()]);
      }
    };

    window.addEventListener('dungeons:products-updated', onUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('dungeons:products-updated', onUpdate);
    };
  }, []);

  return list;
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