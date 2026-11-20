import type { Seller } from '@workspace/db';
import { NON_POSTER_CATEGORY_SLUGS } from './pricing';

// ==============================================================================
// MARKETPLACE SHARED HELPERS
// ==============================================================================

export const POSTER_CATEGORY_SLUGS = [
  'marvel-dc',
  'anime',
  'movies-web-series',
  'music-artists',
  'video-games',
  'sports',
  'landscapes',
  'diva',
  'automative',
  'motivational',
  'devotional',
];

/** Every category a marketplace seller may list into. */
export const SELLABLE_CATEGORY_SLUGS = [...POSTER_CATEGORY_SLUGS, ...NON_POSTER_CATEGORY_SLUGS];

export const DEFAULT_COMMISSION_RATE = 15; // % kept by the platform per sale

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

export function maskAccountNumber(value?: string | null): string | null {
  if (!value) return null;
  const tail = value.slice(-4);
  return `${'•'.repeat(Math.max(0, Math.min(8, value.length - 4)))}${tail}`;
}

/** Public-safe seller representation: never includes the password hash or the full bank account number. */
export function serializeSeller(seller: Seller) {
  const { passwordHash: _ph, bankAccountNumber, ...rest } = seller;
  return { ...rest, bankAccountNumber: maskAccountNumber(bankAccountNumber), hasBankAccount: Boolean(bankAccountNumber) };
}

/** Money helpers for seller payouts (rounded to paise). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sellerEarnings(price: number, quantity: number, commissionRate: number | null | undefined) {
  const gross = round2(price * quantity);
  const rate = typeof commissionRate === 'number' ? commissionRate : DEFAULT_COMMISSION_RATE;
  const commission = round2((gross * rate) / 100);
  return { gross, commission, net: round2(gross - commission), rate };
}
