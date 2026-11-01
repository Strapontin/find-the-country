// Codes for sharing a free-play country without showing which one it is.
//
// A code is 8 characters (40 bits, Crockford base32, shown as XXXX-XXXX):
//   20 bits  random nonce, new for every share
//   10 bits  the country (ISO alpha-2 as a number), masked with a value derived from the nonce
//   10 bits  check value derived from nonce + country, to reject typos
//
// Because the nonce changes every time, sharing the same country twice gives
// two unrelated codes, and no part of a code is tied to a particular country.
//
// This hides the answer from a friend reading the link; it is not encryption.
// The site has no server, so the decoder ships with the page and someone
// reading its source could decode a code.

import { isPlayable } from './countries';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O, U
const LENGTH = 8;
const SALT = 0x5f3c9a17;
const NONCE_BITS = 20;
const FIELD = 1024; // 10-bit fields

/** 32-bit integer hash (murmur3 finaliser). */
function mix(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

const countryNumber = (code: string) => (code.charCodeAt(0) - 65) * 26 + (code.charCodeAt(1) - 65);
const countryCode = (n: number) => String.fromCharCode(65 + Math.floor(n / 26), 65 + (n % 26));

const maskFor = (nonce: number) => mix(nonce ^ SALT);
const low10 = (x: number) => x & (FIELD - 1);
const checkFor = (mask: number, country: number) => mix(mask ^ Math.imul(country + 1, 0x9e3779b1)) % FIELD;

export function randomNonce(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % 2 ** NONCE_BITS;
}

/** A new share code for `country` (ISO alpha-2), random each call (1 in ~1M chance of a repeat). */
export function encodeShareCode(country: string, nonce: number = randomNonce()): string {
  const n = countryNumber(country);
  const mask = maskFor(nonce);
  let value = nonce * FIELD * FIELD + (n ^ low10(mask)) * FIELD + checkFor(mask, n);
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out = ALPHABET[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/** A share code not in `given` (the codes already handed out for this game), which it is added to. */
export function freshShareCode(country: string, given: Set<string>, nonce: () => number = randomNonce): string {
  let code: string;
  do code = encodeShareCode(country, nonce());
  while (given.has(code));
  given.add(code);
  return code;
}

/**
 * Accepts lower case, spaces, a missing dash, and O/I/L typed for 0/1.
 * Returns the code in its display form, or null if it can't be one.
 */
export function normalizeShareCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== LENGTH || [...s].some((ch) => !ALPHABET.includes(ch))) return null;
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** The country a code stands for, or null if the code is invalid. */
export function decodeShareCode(input: string): string | null {
  const code = normalizeShareCode(input);
  if (!code) return null;
  let value = 0;
  for (const ch of code.replace('-', '')) value = value * 32 + ALPHABET.indexOf(ch);
  const nonce = Math.floor(value / (FIELD * FIELD));
  const masked = Math.floor(value / FIELD) % FIELD;
  const check = value % FIELD;
  const mask = maskFor(nonce);
  const n = masked ^ low10(mask);
  if (n >= 26 * 26 || checkFor(mask, n) !== check) return null;
  const country = countryCode(n);
  return isPlayable(country) ? country : null;
}
