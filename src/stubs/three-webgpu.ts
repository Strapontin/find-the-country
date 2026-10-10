// The globe library imports three.js's WebGPU build (~1 MB) for its heatmap
// layer and an optional WebGPU renderer. This game uses neither: it renders
// with WebGL. vite.config.ts points 'three/webgpu' and 'three/tsl' here.
class Unavailable {
  constructor() {
    throw new Error('three/webgpu is stubbed out in this build');
  }
}
export class WebGPURenderer extends Unavailable {}
export class StorageInstancedBufferAttribute extends Unavailable {}
