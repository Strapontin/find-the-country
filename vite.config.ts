/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const stub = (file: string) => fileURLToPath(new URL(`./src/stubs/${file}`, import.meta.url));

export default defineConfig({
  // GitHub Pages serves the site from /find-the-country/ (dev server too, to match).
  base: '/find-the-country/',
  plugins: [react()],
  resolve: {
    // Drop globe.gl dependencies this game never calls (~1.3 MB minified):
    // hexagon layers (h3-js), heatmaps and the WebGPU renderer (three/webgpu, three/tsl).
    alias: {
      'h3-js': stub('h3-js.ts'),
      'three/webgpu': stub('three-webgpu.ts'),
      'three/tsl': stub('three-tsl.ts'),
    },
  },
  // three.js alone is ~700 KB minified; the globe chunk is loaded lazily.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
  },
});
