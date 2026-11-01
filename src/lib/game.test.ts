import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries';
import { dailyCountry, puzzleNumber } from './daily';
import { closestGuess, giveUp, makeGuess, newDailyGame, replay, shareText, type GameState } from './game';
import { searchCountries } from './search';
import { closeness, closenessColor, FOUND_COLOR, shareSquare } from './closeness';

const game = (target: string): GameState => ({ mode: 'free', target, guesses: [], status: 'playing' });

describe('game', () => {
  it('records distance for a wrong guess and keeps playing', () => {
    const s = makeGuess(game('FR'), 'GB');
    expect(s.status).toBe('playing');
    expect(s.guesses[0].km).toBeGreaterThan(300);
  });

  it('wins on the target with distance 0', () => {
    const s = makeGuess(makeGuess(game('FR'), 'GB'), 'FR');
    expect(s.status).toBe('won');
    expect(s.guesses.at(-1)).toEqual({ code: 'FR', km: 0 });
  });

  it('ignores repeated, unknown and post-game guesses', () => {
    let s = makeGuess(game('FR'), 'GB');
    expect(makeGuess(s, 'GB')).toBe(s);
    expect(makeGuess(s, 'ZZ')).toBe(s);
    s = giveUp(s);
    expect(s.status).toBe('gaveUp');
    expect(makeGuess(s, 'FR')).toBe(s);
  });

  it('finds the closest guess', () => {
    const s = ['BR', 'BE', 'ES'].reduce(makeGuess, game('FR'));
    expect(closestGuess(s)?.code).toBe('BE');
  });

  it('replays stored guesses', () => {
    const s = replay(game('FR'), ['DE', 'FR'], 'won');
    expect(s.status).toBe('won');
    expect(s.guesses).toHaveLength(2);
  });

  it('builds share text without revealing the country', () => {
    const s = ['BR', 'DE', 'FR'].reduce(makeGuess, newDailyGame(5));
    const target = s.target;
    const text = shareText({ ...s, target }, 'Find the Country');
    expect(text).toMatch(/^Find the Country #5 — /);
    expect(text).not.toContain(target);
  });
});

describe('daily puzzle', () => {
  it('starts at #1 on launch day, in local time', () => {
    expect(puzzleNumber(new Date(2026, 9, 10, 0, 5))).toBe(1);
    expect(puzzleNumber(new Date(2026, 9, 10, 23, 55))).toBe(1);
    expect(puzzleNumber(new Date(2026, 9, 11, 0, 5))).toBe(2);
    expect(puzzleNumber(new Date(2027, 9, 10, 12))).toBe(366);
  });

  it('is deterministic', () => {
    expect(dailyCountry(42)).toBe(dailyCountry(42));
  });

  it('uses every country once before repeating', () => {
    const n = COUNTRIES.length;
    const firstCycle = new Set(Array.from({ length: n }, (_, i) => dailyCountry(i + 1)));
    expect(firstCycle.size).toBe(n);
    const secondCycle = Array.from({ length: n }, (_, i) => dailyCountry(n + i + 1));
    expect(new Set(secondCycle).size).toBe(n);
    expect(secondCycle).not.toEqual([...firstCycle]);
  });
});

describe('search', () => {
  const codes = (q: string, lang: 'en' | 'fr' = 'en', exclude?: Set<string>) =>
    searchCountries(q, lang, exclude).map((r) => r.country.code);

  it('ignores accents and case', () => {
    expect(codes('cote', 'fr')[0]).toBe('CI');
    expect(codes('ETATS', 'fr')[0]).toBe('US');
    expect(codes('equateur', 'fr')[0]).toBe('EC');
  });

  it('matches the other language and common aliases', () => {
    expect(codes('Allemagne', 'en')[0]).toBe('DE');
    expect(codes('UK')[0]).toBe('GB');
    expect(codes('Holland')[0]).toBe('NL');
    expect(codes('RDC', 'fr')[0]).toBe('CD');
  });

  it('ranks an exact name first', () => {
    expect(codes('Niger').slice(0, 2)).toEqual(['NE', 'NG']);
    expect(codes('Guinea')[0]).toBe('GN');
  });

  it('lists both Congos', () => {
    expect(codes('congo')).toEqual(expect.arrayContaining(['CG', 'CD']));
  });

  it('leaves out excluded countries', () => {
    expect(codes('fra', 'en', new Set(['FR']))).not.toContain('FR');
  });

  it('flags results found through an alias', () => {
    const [r] = searchCountries('UK', 'en');
    expect(r.matchedAlias).toBe('UK');
    const [exact] = searchCountries('France', 'en');
    expect(exact.matchedAlias).toBeUndefined();
  });
});

describe('closeness colours', () => {
  it('goes from far to near', () => {
    expect(closeness(20_000)).toBe(0);
    expect(closeness(100)).toBe(1);
    expect(closeness(1000)).toBeGreaterThan(closeness(5000));
  });

  it('uses green for the target', () => {
    expect(closenessColor(0)).toBe(FOUND_COLOR);
    expect(hue(FOUND_COLOR)).toBeGreaterThan(100);
  });

  // Hue in degrees: red ≈ 0–15, orange ≈ 20–40, yellow ≈ 45–60.
  it('is red when very far, orange when far, yellow when close', () => {
    expect(hue(closenessColor(15_000))).toBeLessThan(15);
    expect(hue(closenessColor(6_000))).toBeLessThan(15);
    expect(hue(closenessColor(2_500))).toBeGreaterThan(20);
    expect(hue(closenessColor(2_500))).toBeLessThan(40);
    expect(hue(closenessColor(300))).toBeGreaterThan(45);
    expect(hue(closenessColor(300))).toBeLessThan(60);
  });

  it('warms up steadily as guesses get closer', () => {
    const kms = [20_000, 10_000, 5_000, 3_000, 2_000, 1_000, 500, 200, 100];
    const hues = kms.map((km) => hue(closenessColor(km)));
    hues.slice(1).forEach((h, i) => expect(h).toBeGreaterThanOrEqual(hues[i]));
  });

  it('matches the share squares to the colours', () => {
    expect([0, 300, 1200, 2500, 6000, 12000].map(shareSquare).join('')).toBe('🟩🟨🟨🟧🟥🟥');
  });
});

/** Hue (0–360°) of "rgb(r, g, b)" or "#rrggbb". */
function hue(color: string): number {
  const [r, g, b] = color.startsWith('#')
    ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    : color.match(/\d+/g)!.map((v) => Number(v) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
