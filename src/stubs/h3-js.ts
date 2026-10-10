// The globe library bundles h3-js (~400 KB) for its hexagon layers, which this
// game never uses. vite.config.ts points imports of h3-js here instead.
const unused = (): never => {
  throw new Error('h3-js is stubbed out: hexagon layers are not available');
};
export const latLngToCell = unused;
export const cellToLatLng = unused;
export const cellToBoundary = unused;
export const polygonToCells = unused;
