import type { ItemKind } from './schema';

export interface WorldItem { id: string; kind: ItemKind; x: number; z: number }
export interface Quest {
  title: string; description: string; kind: ItemKind; amount: number;
  action: string; station: string; x: number; z: number; reward: string;
}
export const QUESTS: readonly Quest[] = [
  { title: 'A picnic for two', description: 'Find six fallen oranges. Each of you brings something to the picnic table.', kind: 'orange', amount: 6, action: 'Set the picnic', station: 'Picnic meadow', x: -7, z: 4, reward: 'A picnic worth sharing' },
  { title: 'A little room to bloom', description: 'Collect four seed pouches, then both help plant the riverside garden.', kind: 'seed', amount: 4, action: 'Plant the garden', station: 'Riverside garden', x: 8, z: -5, reward: 'A garden full of wildflowers' },
  { title: 'The art of doing nothing', description: 'Find four smooth stones. Meet at the spring and both settle in for a soak.', kind: 'stone', amount: 4, action: 'Warm up the spring', station: 'Pebble hot spring', x: 1, z: -15, reward: 'Your very own happy place' },
];
export const ITEMS: readonly WorldItem[] = [
  ...[[-4, 8], [-9, 9], [-13, 4], [-10, -1], [-4, -3], [1, 5], [4, 9], [-14, 10]].map(([x, z], i) => ({ id: `orange-${i}`, kind: 'orange' as const, x, z })),
  ...[[5, -1], [13, -4], [12, -10], [4, -9], [16, 1], [-1, -7]].map(([x, z], i) => ({ id: `seed-${i}`, kind: 'seed' as const, x, z })),
  ...[[-5, -12], [-3, -18], [5, -18], [7, -12], [-10, -10], [10, -16]].map(([x, z], i) => ({ id: `stone-${i}`, kind: 'stone' as const, x, z })),
];
export const ITEM_LABELS: Record<ItemKind, string> = { orange: 'oranges', seed: 'seed pouches', stone: 'smooth stones' };
export const SPAWNS = { p1: { x: -2, z: 8 }, p2: { x: 0, z: 8 } };
export const ISLAND_RADIUS = 26;
export const INTERACT_RADIUS = 2.5;
export const WALK_SPEED = 5;
export const TICK_RATE = 30;
export const SNAPSHOT_RATE = 10;
export function riverX(z: number): number { return 14 + Math.sin(z * 0.14) * 3; }
export function isWater(x: number, z: number): boolean {
  const bridge = Math.abs(z - 5) < 1.3 || Math.abs(z + 12) < 1.3;
  return Math.abs(x - riverX(z)) < 1.65 && !bridge;
}
export function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
