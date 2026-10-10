import data from '../data/countries.json';
import { distanceKm } from './geo';

export type Lang = 'en' | 'fr';

export interface Country {
  code: string;
  name: Record<Lang, string>;
  aliases: string[];
  capital: { en: string; fr: string; lat: number; lng: number };
  view: { lat: number; lng: number; altitude: number };
}

export const COUNTRIES: readonly Country[] = data as Country[];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country {
  const c = byCode.get(code);
  if (!c) throw new Error(`Unknown country code: ${code}`);
  return c;
}

export const isPlayable = (code: string) => byCode.has(code);

/** Flying distance between the capitals of two countries, km. */
export function capitalDistanceKm(from: string, to: string): number {
  return distanceKm(getCountry(from).capital, getCountry(to).capital);
}
