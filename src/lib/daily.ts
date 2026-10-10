import { COUNTRIES } from './countries';

/** Puzzle #1 is the launch day. */
const EPOCH = Date.UTC(2026, 9, 10);
const DAY_MS = 86_400_000;

/** Daily puzzle number for the player's local calendar date. */
export function puzzleNumber(now: Date = new Date()): number {
  const localMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((localMidnight - EPOCH) / DAY_MS) + 1;
}

// Small seeded PRNG (mulberry32): same seed, same sequence, on every browser.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const codes = COUNTRIES.map((c) => c.code).sort();

/**
 * Country for a given puzzle. Every country comes up once before any repeats:
 * each cycle of N days walks a different seeded shuffle.
 */
export function dailyCountry(puzzle: number): string {
  const n = Math.max(1, puzzle) - 1;
  const cycle = Math.floor(n / codes.length);
  return shuffled(codes, 0x5eed + cycle)[n % codes.length];
}

export function randomCountry(exclude?: string): string {
  const pool = exclude ? codes.filter((c) => c !== exclude) : codes;
  return pool[Math.floor(Math.random() * pool.length)];
}
