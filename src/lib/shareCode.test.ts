import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries';
import { decodeShareCode, encodeShareCode, freshShareCode, normalizeShareCode } from './shareCode';

// Deterministic stand-in for crypto randomness.
function nonces(seed = 1) {
  let x = seed;
  return () => {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    return x % 2 ** 20;
  };
}

describe('share codes', () => {
  it('round-trips every playable country', () => {
    const next = nonces();
    for (const c of COUNTRIES) {
      for (let i = 0; i < 20; i++) expect(decodeShareCode(encodeShareCode(c.code, next())), c.code).toBe(c.code);
    }
  });

  it('looks like XXXX-XXXX with no ambiguous letters', () => {
    const next = nonces(7);
    for (let i = 0; i < 500; i++)
      expect(encodeShareCode('FR', next())).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it('gives a different code for every nonce', () => {
    const next = nonces(9); // no repeats within 2^20 draws
    const codes = Array.from({ length: 20000 }, () => encodeShareCode('FR', next()));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('uses fresh randomness on each share', () => {
    const codes = Array.from({ length: 1000 }, () => encodeShareCode('FR'));
    expect(new Set(codes).size).toBeGreaterThanOrEqual(995); // ~0.5 repeats expected by chance
  });

  it('never hands out a code already given for this game', () => {
    const given = new Set<string>();
    let calls = 0;
    const stuck = () => (calls++ < 3 ? 42 : 43); // same nonce three times, then a new one
    const a = freshShareCode('FR', given, stuck);
    const b = freshShareCode('FR', given, stuck);
    expect(b).not.toBe(a);
    expect(given).toEqual(new Set([a, b]));
  });

  // If some character stayed the same for a given country, a friend could spot it.
  it('has no character position tied to the country', () => {
    const next = nonces(3);
    for (const country of ['FR', 'US', 'JP']) {
      const codes = Array.from({ length: 3000 }, () => encodeShareCode(country, next()).replace('-', ''));
      for (let pos = 0; pos < 8; pos++) {
        const seen = new Set(codes.map((c) => c[pos]));
        expect(seen.size, `${country} position ${pos}`).toBe(32);
      }
    }
  });

  it('accepts lower case, spaces, a missing dash and O/I/L for 0/1', () => {
    const code = encodeShareCode('JP', 0x01010); // contains 0s and 1s
    const loose = code.toLowerCase().replace('-', ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect(normalizeShareCode(loose)).toBe(code);
    expect(decodeShareCode(loose)).toBe('JP');
    expect(decodeShareCode(code.replace('-', ''))).toBe('JP');
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'ABC', 'ABCD-EFGH-J', 'ABCD-EFG!', 'UUUU-UUUU']) expect(decodeShareCode(bad)).toBeNull();
  });

  it('rejects almost every one-character typo', () => {
    const next = nonces(11);
    let tried = 0;
    let accepted = 0;
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let k = 0; k < 40; k++) {
      const code = encodeShareCode(COUNTRIES[k * 4].code, next()).replace('-', '');
      for (let pos = 0; pos < 8; pos++) {
        for (const ch of alphabet) {
          if (ch === code[pos]) continue;
          tried++;
          if (decodeShareCode(code.slice(0, pos) + ch + code.slice(pos + 1))) accepted++;
        }
      }
    }
    expect(accepted / tried).toBeLessThan(0.002);
  });

  it('rejects random codes', () => {
    const next = nonces(5);
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let accepted = 0;
    for (let i = 0; i < 20000; i++) {
      let s = '';
      for (let j = 0; j < 8; j++) s += alphabet[next() % 32];
      if (decodeShareCode(s)) accepted++;
    }
    expect(accepted / 20000).toBeLessThan(0.002);
  });
});
