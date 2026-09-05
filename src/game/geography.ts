import { WORLD_LIMIT, distance } from './content';
import type { ItemKind, ToolKind } from './schema';

export type Biome = 'meadow' | 'forest' | 'desert' | 'wetland' | 'highland' | 'snow';
export const BIOMES: Record<Biome, { name: string; color: string; description: string }> = {
  meadow: { name: 'Sunlit meadows', color: '#a6b978', description: 'Oranges, seeds, wood and stone. Fertile soil for crops.' },
  forest: { name: 'Whispering woods', color: '#739667', description: 'Abundant wood and fiber. Copper hides among the roots.' },
  desert: { name: 'Amber dunes', color: '#d9bd83', description: 'Rolling sand, copper deposits and scattered stone.' },
  wetland: { name: 'Willow wetlands', color: '#829e87', description: 'Clay banks, tall reeds and river fishing.' },
  highland: { name: 'Cascading highlands', color: '#a5aaa0', description: 'Iron, crystal and waterfalls. Bring a pickaxe.' },
  snow: { name: 'Frostpine peaks', color: '#d5dfdb', description: 'Snowy ridges, iron seams and cold-water trout.' },
};
export interface WorldItem { id: string; kind: ItemKind; x: number; z: number; respawn: number; requires?: ToolKind }
export interface GeneratedWorld { seed: number; items: readonly WorldItem[] }
export function randomGenerator(seed: number): () => number {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash(x: number, z: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967295;
}
function noise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, seed) * (1 - u) + hash(ix + 1, iz, seed) * u;
  const b = hash(ix, iz + 1, seed) * (1 - u) + hash(ix + 1, iz + 1, seed) * u;
  return a * (1 - v) + b * v;
}
const biomeOrder: Biome[] = ['meadow', 'forest', 'desert', 'wetland', 'highland', 'snow'];
/** Warped Voronoi regions guarantee all six biomes while changing their edges and local terrain per seed. */
export function biomeAt(x: number, z: number, seed = 7241): Biome {
  if (Math.hypot(x, z) < 23) return 'meadow';
  const wx = x + (noise(x / 31, z / 31, seed) - 0.5) * 30;
  const wz = z + (noise(x / 31, z / 31, seed + 99) - 0.5) * 30;
  const centers = [[0, 0], [-65, 0], [72, 24], [8, 77], [8, -63], [-79, -86], [92, -82], [-78, 88]];
  const kinds: Biome[] = [...biomeOrder, 'desert', 'forest'];
  let closest = Infinity, result: Biome = 'meadow';
  centers.forEach(([cx, cz], i) => {
    const d = Math.hypot(wx - cx - (hash(i, 0, seed) - 0.5) * 16, wz - cz - (hash(i, 1, seed) - 0.5) * 16);
    if (d < closest) { closest = d; result = kinds[i]; }
  });
  return result;
}
export function riverX(z: number, seed = 7241): number { return 15 + Math.sin(z * 0.043 + seed % 13 * 0.07) * 7 + Math.sin(z * 0.12) * 2; }
export function isWater(x: number, z: number, seed = 7241): boolean { return Math.abs(x - riverX(z, seed)) < 2.8; }
export function nearWater(x: number, z: number, seed: number): boolean { return Math.abs(x - riverX(z, seed)) < 7; }
function baseHeight(x: number, z: number, seed: number): number {
  const beyondSpawn = Math.min(1, Math.max(0, (Math.hypot(x, z) - 17) / 24));
  const hills = noise(x / 30, z / 30, seed + 13) * 3 + noise(x / 12, z / 12, seed + 5) * 0.7;
  const north = Math.max(0, Math.min(1, (-z - 28) / 60));
  const mountain = north * (5 + noise(x / 24, z / 25, seed + 77) * 10);
  const terrace = Math.max(0, Math.min(1, (-z - 54) / 3)) * 3;
  return beyondSpawn * (hills + mountain + terrace);
}
export function waterHeight(z: number, seed = 7241): number { return baseHeight(riverX(z, seed), z, seed) + 0.04; }
function rawHeight(x: number, z: number, seed: number): number {
  const river = riverX(z, seed), bank = Math.max(0, Math.min(1, (Math.abs(x - river) - 2) / 2.5));
  const blend = bank * bank * (3 - 2 * bank);
  return (baseHeight(river, z, seed) - 0.5) * (1 - blend) + baseHeight(x, z, seed) * blend;
}
/** Piecewise interpolation matches the rendered two-unit terrain triangles exactly. */
export function terrainHeight(x: number, z: number, seed = 7241): number {
  const gx = Math.floor(x / 2) * 2, gz = Math.floor(z / 2) * 2, u = (x - gx) / 2, v = (z - gz) / 2;
  const a = rawHeight(gx, gz, seed), b = rawHeight(gx + 2, gz, seed), c = rawHeight(gx, gz + 2, seed), d = rawHeight(gx + 2, gz + 2, seed);
  return u + v < 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
const cache = new Map<number, GeneratedWorld>();
export function generateWorld(seed: number): GeneratedWorld {
  const cached = cache.get(seed); if (cached) return cached;
  const random = randomGenerator(seed);
  const items: WorldItem[] = [];
  const resources: Record<Biome, ItemKind[]> = {
    meadow: ['wood', 'stone', 'seed', 'orange', 'fiber'], forest: ['wood', 'wood', 'fiber', 'copper', 'seed'],
    desert: ['sand', 'sand', 'copper', 'stone'], wetland: ['clay', 'clay', 'fiber', 'wood'],
    highland: ['iron', 'stone', 'crystal', 'iron'], snow: ['iron', 'stone', 'wood', 'crystal'],
  };
  function add(x: number, z: number, kind: ItemKind): void {
    items.push({ id: `node-${items.length}`, kind, x, z, respawn: ['iron', 'copper', 'crystal'].includes(kind) ? 45 : 25,
      ...(['iron', 'copper'].includes(kind) ? { requires: 'pickaxe' as const } : kind === 'crystal' ? { requires: 'ironPickaxe' as const } : {}) });
  }
  // A generous, renewable starting clearing prevents tool or seed soft-locks.
  add(-4, 8, 'orange'); add(-7, 4, 'wood'); add(-2, 1, 'stone'); add(4, 4, 'fiber'); add(4, 10, 'seed'); add(-10, 11, 'wood'); add(-9, -3, 'stone');
  for (let x = -120; x <= 120; x += 8) for (let z = -120; z <= 120; z += 8) {
    const px = x + (random() - 0.5) * 4, pz = z + (random() - 0.5) * 4;
    if (distance({ x: px, z: pz }, { x: 0, z: 5 }) < 15 || isWater(px, pz, seed)) continue;
    const choices = resources[biomeAt(px, pz, seed)]; add(px, pz, choices[Math.floor(random() * choices.length)]);
  }
  const world = { seed, items };
  if (cache.size >= 3) cache.delete(cache.keys().next().value!);
  cache.set(seed, world); return world;
}
export function insideWorld(x: number, z: number, margin = 0): boolean { return Math.abs(x) <= WORLD_LIMIT - margin && Math.abs(z) <= WORLD_LIMIT - margin; }
