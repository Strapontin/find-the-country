// Hot/cold colours for guesses. Log scale: going from 8,000 to 4,000 km
// feels like as much progress as going from 800 to 400 km.

const NEAR_KM = 150;
const FAR_KM = 15_000;

export const FOUND_COLOR = '#2fa36b';

// Pale sand (far) -> amber -> orange -> red -> deep crimson (near).
const STOPS: [number, [number, number, number]][] = [
  [0, [250, 238, 196]],
  [0.35, [247, 193, 99]],
  [0.6, [238, 118, 52]],
  [0.82, [204, 44, 38]],
  [1, [122, 8, 24]],
];

/** 0 = far away, 1 = right next to the target. */
export function closeness(km: number): number {
  if (km <= NEAR_KM) return 1;
  if (km >= FAR_KM) return 0;
  return 1 - Math.log(km / NEAR_KM) / Math.log(FAR_KM / NEAR_KM);
}

export function closenessColor(km: number): string {
  if (km === 0) return FOUND_COLOR;
  const t = closeness(km);
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    if (t <= t1) {
      const [t0, c0] = STOPS[i - 1];
      const k = (t - t0) / (t1 - t0);
      const [r, g, b] = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1][1].join(', ')})`;
}

/** Legend ticks, km. */
export const LEGEND_KM = [10_000, 5_000, 2_000, 1_000, 500, 250];

export function shareSquare(km: number): string {
  if (km === 0) return '🟩';
  if (km < 1000) return '🟥';
  if (km < 3000) return '🟧';
  return '🟨';
}
