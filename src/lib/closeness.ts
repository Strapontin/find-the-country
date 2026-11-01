// Colours for guesses: red = very far, orange = far, yellow = close,
// green = the answer. Log scale: going from 8,000 to 4,000 km feels like as
// much progress as going from 800 to 400 km.

const NEAR_KM = 150;
const FAR_KM = 15_000;

export const FOUND_COLOR = '#2fa36b';

/** Colour stops by distance, far to near. */
const STOPS_KM: [km: number, color: string][] = [
  [15_000, '#b52a20'], // dark red: other side of the planet
  [5_000, '#e2412b'], // red: very far
  [2_500, '#f07f22'], // orange: far
  [1_000, '#f5c228'], // golden yellow
  [NEAR_KM, '#f3d71f'], // yellow: close
];

/** 0 = far away, 1 = right next to the target. */
export function closeness(km: number): number {
  if (km <= NEAR_KM) return 1;
  if (km >= FAR_KM) return 0;
  return 1 - Math.log(km / NEAR_KM) / Math.log(FAR_KM / NEAR_KM);
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const STOPS = STOPS_KM.map(([km, hex]) => ({ t: closeness(km), rgb: hexToRgb(hex) }));

export function closenessColor(km: number): string {
  if (km === 0) return FOUND_COLOR;
  const t = closeness(km);
  for (let i = 1; i < STOPS.length; i++) {
    const hi = STOPS[i];
    if (t <= hi.t) {
      const lo = STOPS[i - 1];
      const k = (t - lo.t) / (hi.t - lo.t);
      const [r, g, b] = lo.rgb.map((v, j) => Math.round(v + (hi.rgb[j] - v) * k));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1].rgb.join(', ')})`;
}

/** Emoji for the shared daily result, matching the colours above. */
export function shareSquare(km: number): string {
  if (km === 0) return '🟩';
  if (km < 1500) return '🟨';
  if (km < 4000) return '🟧';
  return '🟥';
}
