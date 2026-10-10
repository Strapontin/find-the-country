import { COUNTRIES, type Country, type Lang } from './countries';

/** Lower-case, strip accents and punctuation: "Côte d'Ivoire" -> "cote d ivoire". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface SearchResult {
  country: Country;
  /** Set when the match came from another name than the displayed one. */
  matchedAlias?: string;
}

interface Entry {
  country: Country;
  text: string;
  norm: string;
  primary: boolean;
}

function buildIndex(lang: Lang): Entry[] {
  const other: Lang = lang === 'en' ? 'fr' : 'en';
  return COUNTRIES.flatMap((country) => [
    { country, text: country.name[lang], primary: true },
    { country, text: country.name[other], primary: false },
    ...country.aliases.map((text) => ({ country, text, primary: false })),
  ]).map((e) => ({ ...e, norm: normalize(e.text) }));
}

const indexes: Partial<Record<Lang, Entry[]>> = {};

/**
 * Countries matching what the player typed, best first.
 * Matches names in both languages and common alternatives ("UK", "Holland"…),
 * ignoring accents and case.
 */
export function searchCountries(
  query: string,
  lang: Lang,
  exclude: ReadonlySet<string> = new Set(),
  limit = 8,
): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];
  const index = (indexes[lang] ??= buildIndex(lang));

  const best = new Map<string, { score: number; entry: Entry }>();
  for (const entry of index) {
    if (exclude.has(entry.country.code)) continue;
    let score: number;
    if (entry.norm === q) score = 0;
    else if (entry.norm.startsWith(q)) score = 1;
    else if (entry.norm.split(' ').some((w) => w.startsWith(q))) score = 2;
    else if (q.length >= 3 && entry.norm.includes(q)) score = 3;
    else continue;
    score = score * 2 + (entry.primary ? 0 : 1);
    const prev = best.get(entry.country.code);
    if (!prev || score < prev.score) best.set(entry.country.code, { score, entry });
  }

  return [...best.values()]
    .sort((a, b) => a.score - b.score || a.entry.country.name[lang].localeCompare(b.entry.country.name[lang], lang))
    .slice(0, limit)
    .map(({ entry }) => ({
      country: entry.country,
      matchedAlias: entry.primary ? undefined : entry.text,
    }));
}
