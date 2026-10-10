import { describe, expect, it } from 'vitest';
import { geoArea, geoContains, type GeoPermissibleObjects } from 'd3-geo';
import world from '../data/world.geo.json';
import { COUNTRIES } from './countries';

type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
const features = (world as { features: { properties: { code: string }; geometry: Geometry }[] }).features;
const geometryByCode = new Map(features.map((f) => [f.properties.code, f.geometry]));

// Rings are stored clockwise (d3-geo's convention, see scripts/build-data.mjs).
const asGeo = (g: Geometry) => g as unknown as GeoPermissibleObjects;

/** Distance from a point to the nearest polygon edge, km (local flat approximation). */
function distanceToEdgeKm(g: Geometry, p: { lat: number; lng: number }): number {
  const rings = g.type === 'Polygon' ? (g.coordinates as number[][][]) : (g.coordinates as number[][][][]).flat();
  const kx = 111.32 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110.57;
  const xy = ([lng, lat]: number[]) => [(lng - p.lng) * kx, (lat - p.lat) * ky];
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = xy(ring[i - 1]);
      const [bx, by] = xy(ring[i]);
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

describe('country data', () => {
  it('has the 193 UN members plus Vatican, Palestine, Kosovo and Taiwan', () => {
    expect(COUNTRIES).toHaveLength(197);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(197);
    for (const code of ['VA', 'PS', 'XK', 'TW', 'FR', 'SS']) {
      expect(COUNTRIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it('names every country and capital in both languages', () => {
    for (const c of COUNTRIES) {
      expect(c.name.en, c.code).toBeTruthy();
      expect(c.name.fr, c.code).toBeTruthy();
      expect(c.capital.en, c.code).toBeTruthy();
      expect(c.capital.fr, c.code).toBeTruthy();
    }
  });

  it('has a polygon for every playable country', () => {
    for (const c of COUNTRIES) expect(geometryByCode.has(c.code), c.code).toBe(true);
  });

  // Counter-clockwise rings would make every country cover the rest of the globe.
  it('winds polygons so each covers less than half the sphere', () => {
    const inverted = features.filter((f) => geoArea(asGeo(f.geometry)) > 2 * Math.PI).map((f) => f.properties.code);
    expect(inverted).toEqual([]);
  });

  // Catches a capital pinned in the wrong place or country. The tolerance
  // covers simplified coastlines and borders (Dakar, Jerusalem…).
  it('places every capital inside its own country (or on its coast)', () => {
    const outside = COUNTRIES.filter((c) => {
      const g = geometryByCode.get(c.code)!;
      const point: [number, number] = [c.capital.lng, c.capital.lat];
      return !geoContains(asGeo(g), point) && distanceToEdgeKm(g, c.capital) > 40;
    }).map((c) => c.code);
    expect(outside).toEqual([]);
  });

  it('keeps these capitals as chosen', () => {
    const capital = (code: string) => COUNTRIES.find((c) => c.code === code)!.capital.en;
    expect(capital('ZA')).toBe('Pretoria');
    expect(capital('BO')).toBe('Sucre');
    expect(capital('NE')).toBe('Niamey');
    expect(capital('KZ')).toBe('Astana');
    expect(capital('BI')).toBe('Gitega');
  });
});
