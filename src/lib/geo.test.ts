import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';
import { capitalDistanceKm } from './countries';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it('measures one degree of longitude on the equator', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.2, 1);
  });

  it('measures half the planet for antipodes', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20015.1, 0);
  });

  it('crosses the antimeridian the short way', () => {
    expect(distanceKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 })).toBeCloseTo(222.4, 0);
  });

  it('is symmetric', () => {
    const a = { lat: 48.86, lng: 2.33 };
    const b = { lat: -33.45, lng: -70.67 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });
});

describe('capitalDistanceKm', () => {
  // Published great-circle distances between city centres, ±2%.
  it.each([
    ['FR', 'GB', 344], // Paris – London
    ['ES', 'PT', 503], // Madrid – Lisbon
    ['JP', 'KR', 1158], // Tokyo – Seoul
    ['FR', 'US', 6165], // Paris – Washington
    ['AU', 'NZ', 2326], // Canberra – Wellington
  ])('%s → %s ≈ %i km', (a, b, km) => {
    const d = capitalDistanceKm(a, b);
    expect(Math.abs(d - km) / km).toBeLessThan(0.02);
  });
});
