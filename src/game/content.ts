import type { BuildingKind, ConstellationId, CropKind, ItemKind, RecipeId, Rotation, ToolKind } from './schema';

export const WORLD_LIMIT = 126;
export const INTERACT_RADIUS = 2.5;
export const WALK_SPEED = 7;
export const TICK_RATE = 30;
export const SNAPSHOT_RATE = 10;
export const SPAWNS = { p1: { x: -2, z: 8 }, p2: { x: 0, z: 8 } };
export const CROP_SECONDS = 45;
export const DAY_SECONDS = 600;
export const NIGHT_START = 0.65;
export const DAWN = 0.2;
export const OBSERVE_SECONDS = 2;
export const OBSERVE_RADIUS = .025;
export const BAG_CAPACITY = 9999;
export const FISHING_SERVICE_INTERVAL = 12;
export type Cost = Partial<Record<ItemKind, number>>;
export const ITEM_LABELS: Record<ItemKind, string> = {
  orange: 'Oranges', seed: 'Seeds', stone: 'Stone', wood: 'Wood', fiber: 'Fiber', clay: 'Clay', sand: 'Sand',
  copper: 'Copper', iron: 'Iron', crystal: 'Crystal', wheat: 'Wheat', carrot: 'Carrots', fish: 'River fish', trout: 'Mountain trout', pearl: 'Pearls',
  copperBar: 'Copper bars', ironBar: 'Iron bars', copperHead: 'Axe heads', ironHead: 'Pickaxe heads', copperBlank: 'Unfinished axes', ironBlank: 'Unfinished pickaxes', hook: 'Fishing hooks', net: 'Fishing nets',
};
export const ITEM_COLORS: Record<ItemKind, string> = {
  orange: '#eda33c', seed: '#bdad65', stone: '#8c9a9c', wood: '#a0784e', fiber: '#71945c', clay: '#bd8264', sand: '#dcc58a',
  copper: '#c48055', iron: '#747e95', crystal: '#a48dc9', wheat: '#dcc26e', carrot: '#d48949', fish: '#7faeba', trout: '#aba3bc', pearl: '#eee5d5',
  copperBar: '#d99462', ironBar: '#a7b9c4', copperHead: '#d99462', ironHead: '#a7b9c4', copperBlank: '#b6865c', ironBlank: '#82949d', hook: '#c5b592', net: '#cbb88e',
};
export interface ToolDefinition { id: ToolKind; name: string; description: string; cost: Cost; requires?: ToolKind; station?: StationKind }
export const TOOLS: readonly ToolDefinition[] = [
  { id: 'axe', name: 'Stone axe', description: 'Double wood and fiber. Never breaks.', cost: { wood: 4, stone: 3 } },
  { id: 'pickaxe', name: 'Stone pickaxe', description: 'Mine copper and iron. Double stone, clay and sand.', cost: { wood: 4, stone: 5 } },
  { id: 'hoe', name: 'Garden hoe', description: 'Plant wheat and carrots outdoors or in greenhouse beds.', cost: { wood: 3, stone: 2 } },
  { id: 'rod', name: 'Fishing rod', description: 'Handmade starter rod. No bait or durability.', cost: { wood: 4, fiber: 3 } },
  { id: 'copperAxe', name: 'Copper axe', description: 'Four wood or fiber per harvest.', cost: { copperBlank: 1, stone: 1 }, requires: 'axe', station: 'grindstone' },
  { id: 'ironPickaxe', name: 'Iron pickaxe', description: 'Mine crystal. Triple stone and ore.', cost: { ironBlank: 1, stone: 1 }, requires: 'pickaxe', station: 'grindstone' },
  { id: 'fishingKit', name: 'Fishing kit', description: 'Double catches for 12 uses between dock repairs. Starter rod always works.', cost: { hook: 2, net: 1, wood: 4 }, requires: 'rod', station: 'fishingBench' },
];
export type StationKind = 'forge' | 'anvil' | 'workbench' | 'grindstone' | 'fishingBench' | 'netTable';
export const STATIONS: Record<StationKind, { name: string; queueLimit: number; outputSlots: number }> = {
  forge: { name: 'Forge', queueLimit: 4, outputSlots: 2 }, anvil: { name: 'Anvil', queueLimit: 4, outputSlots: 2 },
  workbench: { name: 'Tool workbench', queueLimit: 4, outputSlots: 2 }, grindstone: { name: 'Grindstone', queueLimit: 4, outputSlots: 2 },
  fishingBench: { name: 'Fishing workbench', queueLimit: 4, outputSlots: 2 }, netTable: { name: 'Net-making table', queueLimit: 4, outputSlots: 2 },
};
export interface RecipeDefinition { id: RecipeId; name: string; station: StationKind; cost: Cost; seconds: number; output: Cost; tool?: ToolKind; service?: 'fishingKit'; requires?: ToolKind }
function finishRecipe(id: RecipeId, tool: ToolKind, seconds: number): RecipeDefinition {
  const def = TOOLS.find(t => t.id === tool)!;
  return { id, name: `${tool === 'fishingKit' ? 'Assemble' : 'Finish'} ${def.name.toLowerCase()}`, station: def.station!, cost: def.cost, seconds, output: {}, tool, requires: def.requires };
}
export const RECIPES: readonly RecipeDefinition[] = [
  { id: 'smeltCopper', name: 'Smelt copper', station: 'forge', cost: { copper: 2, wood: 1 }, seconds: 12, output: { copperBar: 1 } },
  { id: 'smeltIron', name: 'Smelt iron', station: 'forge', cost: { iron: 2, wood: 1 }, seconds: 16, output: { ironBar: 1 } },
  { id: 'shapeCopper', name: 'Shape axe head', station: 'anvil', cost: { copperBar: 3 }, seconds: 10, output: { copperHead: 1 } },
  { id: 'shapeIron', name: 'Shape pickaxe head', station: 'anvil', cost: { ironBar: 4 }, seconds: 12, output: { ironHead: 1 } },
  { id: 'assembleAxe', name: 'Assemble axe', station: 'workbench', cost: { copperHead: 1, wood: 6 }, seconds: 8, output: { copperBlank: 1 } },
  { id: 'assemblePickaxe', name: 'Assemble pickaxe', station: 'workbench', cost: { ironHead: 1, wood: 6 }, seconds: 8, output: { ironBlank: 1 } },
  finishRecipe('finishAxe', 'copperAxe', 8),
  finishRecipe('finishPickaxe', 'ironPickaxe', 8),
  { id: 'makeHook', name: 'Shape fishing hooks', station: 'fishingBench', cost: { copper: 1 }, seconds: 6, output: { hook: 2 } },
  { id: 'weaveNet', name: 'Weave fishing net', station: 'netTable', cost: { fiber: 6 }, seconds: 10, output: { net: 1 } },
  finishRecipe('assembleFishingKit', 'fishingKit', 12),
  { id: 'repairFishingKit', name: 'Repair fishing kit', station: 'fishingBench', cost: { fiber: 2, hook: 1 }, seconds: 8, output: {}, service: 'fishingKit', requires: 'fishingKit' },
  { id: 'reworkNet', name: 'Unweave spare net', station: 'netTable', cost: { net: 1 }, seconds: 5, output: { fiber: 6 } },
];
export const recipeDefinition = (id: RecipeId): RecipeDefinition => RECIPES.find(r => r.id === id)!;
export interface Point { x: number; z: number }
export interface Rect extends Point { width: number; depth: number }
export type FurnitureKind = 'bed' | 'table' | 'chair' | 'shelf' | 'stove' | 'sink' | 'desk' | 'barrel' | 'planter' | 'anvil' | 'telescope' | 'loom' | 'chest' | 'crate' | 'sack' | 'basket' | 'rack' | 'hooks' | 'forge' | 'grindstone' | 'workbench' | 'fishingBench' | 'plot' | 'compost' | 'starMap' | 'chart';
export type FurnitureUse = { type: 'station'; station: StationKind } | { type: 'storage' | 'bed' | 'plot' | 'telescope' };
export interface Furniture extends Rect { id: string; name: string; kind: FurnitureKind; rotation: Rotation; access: Point; use?: FurnitureUse; solid: boolean; contents?: 'food' | 'metal' | 'seed' | 'tackle' }
export interface RoomDefinition { name: string; width: number; depth: number; floor: string; wall: string; accent: string; furniture: readonly Furniture[] }
export interface ExteriorPart extends Rect { kind: 'porch' | 'loading' | 'cargo' | 'pier' | 'nets'; solid: boolean; contents?: Furniture['contents'] }
export interface BuildingDefinition {
  id: BuildingKind; name: string; description: string; cost: Cost; color: string; roof: string;
  style: 'gable' | 'barn' | 'tower' | 'glass' | 'dock'; width: number; depth: number; height: number;
  chimney?: boolean; stone?: boolean; glow?: boolean; exterior: readonly ExteriorPart[];
  storage: { capacity: number; accepts?: readonly ItemKind[] }; rooms: readonly [RoomDefinition];
}
/** Clockwise on a north-up X/Z map. Three.js rotation.y is the opposite sign. */
export function rotatePoint(point: Point, rotation: Rotation): Point {
  switch (rotation) { case 90: return { x: -point.z, z: point.x }; case 180: return { x: -point.x, z: -point.z }; case 270: return { x: point.z, z: -point.x }; default: return { ...point }; }
}
export function rotatedRect(rect: Rect, rotation: Rotation, origin: Point = { x: 0, z: 0 }): Rect {
  const p = rotatePoint(rect, rotation), swap = rotation === 90 || rotation === 270;
  return { x: origin.x + p.x, z: origin.z + p.z, width: swap ? rect.depth : rect.width, depth: swap ? rect.width : rect.depth };
}
export function rectContains(rect: Rect, x: number, z: number, margin = 0): boolean { return Math.abs(x - rect.x) < rect.width / 2 + margin && Math.abs(z - rect.z) < rect.depth / 2 + margin; }
export function rectsOverlap(a: Rect, b: Rect, margin = 0): boolean { return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + margin && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + margin; }
export function furnitureBounds(f: Furniture): Rect { return rotatedRect({ x: 0, z: 0, width: f.width, depth: f.depth }, f.rotation, f); }
export function furnitureAccess(f: Furniture): Point { const p = rotatePoint(f.access, f.rotation); return { x: f.x + p.x, z: f.z + p.z }; }
const f = (id: string, kind: FurnitureKind, name: string, x: number, z: number, width: number, depth: number, use?: FurnitureUse, rotation: Rotation = 0, solid = true, contents?: Furniture['contents']): Furniture => ({ id, kind, name, x, z, width, depth, rotation, solid, contents, access: { x: 0, z: depth / 2 + 0.9 }, use });
const store: FurnitureUse = { type: 'storage' }, bed: FurnitureUse = { type: 'bed' }, plot: FurnitureUse = { type: 'plot' };
const station = (kind: StationKind): FurnitureUse => ({ type: 'station', station: kind });
const foods: readonly ItemKind[] = ['orange', 'wheat', 'carrot', 'fish', 'trout'];
const part = (kind: ExteriorPart['kind'], x: number, z: number, width: number, depth: number, solid = false, contents?: Furniture['contents']): ExteriorPart => ({ kind, x, z, width, depth, solid, contents });
export const BUILDINGS: readonly BuildingDefinition[] = [
  { id: 'home', name: 'Home house', description: 'Two beds, a warm hearth and a shared chest.', cost: { wood: 12, stone: 6 }, color: '#f0dab0', roof: '#b8795c', style: 'gable', width: 8, depth: 6, height: 3.4, chimney: true, stone: true,
    exterior: [part('porch', 0, 3.8, 3.6, 1.6)], storage: { capacity: 300 }, rooms: [{ name: 'Hearth room', width: 12, depth: 12, floor: '#bca27a', wall: '#e8d9b8', accent: '#98aa84', furniture: [
      f('bed-left', 'bed', 'Left bed', -3.6, -3.9, 2.5, 2.7, bed), f('bed-right', 'bed', 'Right bed', 3.6, -3.9, 2.5, 2.7, bed),
      f('hearth', 'stove', 'Hearth', 0, -4.8, 2, 1.5), f('supper', 'table', 'Supper table', -3.5, 0.6, 2, 1.5),
      f('chair-a', 'chair', 'Chair', -4.8, 0.6, 0.75, 0.75), f('chair-b', 'chair', 'Chair', -2.2, 0.6, 0.75, 0.75, undefined, 180),
      f('chest', 'chest', 'Home chest', 3.9, 1, 2.2, 1.4, store), f('shelves', 'shelf', 'Keepsakes', -4.3, 4.4, 2, 1), f('hooks', 'hooks', 'Coat hooks', 4.2, 4.9, 1.6, 0.4, undefined, 0, false),
    ] }] },
  { id: 'farm', name: 'Farmstead', description: 'A food store for the harvest you share.', cost: { wood: 16, stone: 6, fiber: 4 }, color: '#ba785b', roof: '#716c55', style: 'barn', width: 10, depth: 8, height: 4, stone: true,
    exterior: [part('loading', 0, 5, 5, 2), part('cargo', -4, 5.1, 2, 1.5, true)], storage: { capacity: 2000, accepts: foods }, rooms: [{ name: 'Harvest store', width: 16, depth: 12, floor: '#aa9068', wall: '#c9b58c', accent: '#bc9c58', furniture: [
      f('food-crates', 'crate', 'Harvest crates', -5, -3.8, 3.4, 2, store), f('food-baskets', 'basket', 'Produce baskets', 4.8, -3.9, 3, 1.8, store),
      f('grain', 'sack', 'Grain sacks', -5.5, 0.5, 2.5, 1.8), f('barrels', 'barrel', 'Food barrels', 5.5, 0.4, 2.4, 1.7, store),
      f('sorting', 'workbench', 'Sorting table', 0, -1.7, 3.4, 1.5), f('shelf', 'shelf', 'Basket shelves', 0, -5, 3, 1),
      f('sacks', 'sack', 'Spare sacks', -5.5, 4, 2.2, 1.5), f('baskets', 'basket', 'Empty baskets', 5.5, 4.1, 2.2, 1.3),
    ] }] },
  { id: 'dock', name: 'Water dock', description: 'A fishing workshop on stilts. Point the pier into water.', cost: { wood: 14, fiber: 4 }, color: '#c2ac82', roof: '#5c8585', style: 'dock', width: 8, depth: 6, height: 3.5,
    exterior: [part('pier', 0, -5, 3, 4), part('porch', 0, 3.8, 3.2, 1.6), part('nets', 3.1, 3.7, 1.2, 1.2, true)], storage: { capacity: 600 }, rooms: [{ name: 'Tackle workshop', width: 14, depth: 12, floor: '#b79e75', wall: '#bcd0c2', accent: '#6f9f9d', furniture: [
      f('fishing-bench', 'fishingBench', 'Fishing workbench', -3.8, -3.7, 3.6, 1.8, station('fishingBench')),
      f('net-table', 'loom', 'Net-making table', 3.8, -3.7, 2.8, 1.7, station('netTable')),
      f('tackle', 'shelf', 'Tackle storage', -5, 0.5, 2, 1.1, store, 0, true, 'tackle'), f('drying', 'rack', 'Drying rack', 5, 0.4, 2, 1.2),
      f('ropes', 'hooks', 'Rope rack', -4.8, 4.4, 2.2, 0.5, undefined, 0, false), f('tools', 'chest', 'Tool chest', 4.8, 3.8, 2.1, 1.4, store),
    ] }] },
  { id: 'greenhouse', name: 'Greenhouse', description: 'Six protected planting beds and a potting aisle.', cost: { wood: 12, sand: 12, copper: 4 }, color: '#aac9b5', roof: '#a4c7bf', style: 'glass', width: 10, depth: 12, height: 4.5,
    exterior: [], storage: { capacity: 800 }, rooms: [{ name: 'Growing hall', width: 18, depth: 18, floor: '#aaa889', wall: '#c2ddd0', accent: '#80a96c', furniture: [
      ...[-5.8, 0, 5.8].flatMap((x, i) => [-5, 0.5].map((z, j) => f(`bed-${i}-${j}`, 'plot', 'Planting bed', x, z, 3.5, 2.6, plot))),
      f('water', 'barrel', 'Watering barrel', -6.7, 6.5, 1.4, 1.4), f('seed-store', 'chest', 'Seed storage', -3.6, 6.6, 2.1, 1.4, store),
      f('potting', 'workbench', 'Potting table', 3.6, 6.5, 2.6, 1.5), f('compost', 'compost', 'Compost bin', 6.8, 6.5, 1.5, 1.5),
      f('planters', 'planter', 'Young plants', 0, -7.5, 2.5, 1),
    ] }] },
  { id: 'smithy', name: 'Smithy', description: 'Smelt, shape, assemble and sharpen advanced tools.', cost: { stone: 20, wood: 10, iron: 6 }, color: '#979b94', roof: '#606e72', style: 'barn', width: 10, depth: 8, height: 4, chimney: true, stone: true, glow: true,
    exterior: [part('loading', 0, 5, 4.5, 2), part('cargo', 4, 5, 1.8, 1.5, true, 'metal')], storage: { capacity: 1000 }, rooms: [{ name: 'Forge hall', width: 16, depth: 14, floor: '#98958b', wall: '#bab8a6', accent: '#bc8358', furniture: [
      f('forge', 'forge', 'Forge', -4.9, -4.3, 3.2, 2.4, station('forge')), f('anvil', 'anvil', 'Anvil', 0, -3.5, 2.8, 1.8, station('anvil')),
      f('workbench', 'workbench', 'Tool workbench', 4.9, -4, 3.2, 1.8, station('workbench')), f('grindstone', 'grindstone', 'Grindstone', 4.8, 1, 2.4, 1.6, station('grindstone')),
      f('quench', 'barrel', 'Quenching barrel', -5.9, 0.4, 1.5, 1.5), f('materials', 'crate', 'Material storage', -5, 4.6, 2.8, 1.6, store, 0, true, 'metal'),
      f('tool-rack', 'rack', 'Finished-tool rack', 5, 4.8, 2.8, 1, undefined, 0, true, 'metal'),
    ] }] },
  { id: 'observatory', name: 'Observatory', description: 'Search the night sky and chart twelve constellations.', cost: { stone: 22, copper: 12, crystal: 4 }, color: '#c9c2b3', roof: '#74a3a0', style: 'tower', width: 8, depth: 8, height: 4.8, stone: true,
    exterior: [], storage: { capacity: 300 }, rooms: [{ name: 'Star chamber', width: 14, depth: 14, floor: '#a9a697', wall: '#c9d0cf', accent: '#718f9e', furniture: [
      f('telescope', 'telescope', 'Telescope', 0, -2.5, 3.8, 3.2, { type: 'telescope' }), f('star-map', 'starMap', 'Star-map table', -4.6, 1.1, 2.5, 1.6),
      f('books', 'shelf', 'Astronomy shelves', -4.9, -4.8, 2.8, 1.1), f('desk', 'desk', 'Astronomer’s desk', 4.8, -4.3, 2.7, 1.5),
      f('charts', 'chart', 'Wall charts', 4.8, 0.4, 2.5, 0.4, undefined, 0, false), f('records', 'chest', 'Expedition chest', 4.8, 4.7, 2.1, 1.4, store),
    ] }] },
];
export const buildingDefinition = (kind: BuildingKind): BuildingDefinition => BUILDINGS.find(b => b.id === kind)!;
export const roomFurniture = (room: RoomDefinition): readonly Furniture[] => room.furniture;
export function costLabel(cost: Cost): string { return Object.entries(cost).map(([kind, amount]) => `${amount} ${ITEM_LABELS[kind as ItemKind].toLowerCase()}`).join(' · '); }
export const CROPS: Record<CropKind, { name: string; color: string; yield: number }> = { wheat: { name: 'Wheat', color: '#e1c36b', yield: 3 }, carrot: { name: 'Carrots', color: '#d78c48', yield: 3 } };
export function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.z - b.z); }
export interface Constellation { id: ConstellationId; name: string; x: number; y: number; stars: readonly (readonly [number, number])[] }
/** Authored, recognizable zodiac-inspired asterisms in a fictional game sky, not an astronomical ephemeris. */
export const CONSTELLATIONS: readonly Constellation[] = [
  { id: 'aries', name: 'Aries', x: .12, y: .2, stars: [[-2,1],[-1,0],[1,-.4],[2,.5]] },
  { id: 'taurus', name: 'Taurus', x: .37, y: .18, stars: [[-2,-2],[-1,0],[0,1],[1,0],[2,-2]] },
  { id: 'gemini', name: 'Gemini', x: .62, y: .2, stars: [[-1,-2],[-1,0],[-1,2],[1,2],[1,0],[1,-2]] },
  { id: 'cancer', name: 'Cancer', x: .86, y: .18, stars: [[-2,-1],[0,0],[1,2],[0,0],[2,-1]] },
  { id: 'leo', name: 'Leo', x: .14, y: .5, stars: [[-2,1],[0,1],[1,0],[0,-1],[1,-2],[2,-1]] },
  { id: 'virgo', name: 'Virgo', x: .38, y: .48, stars: [[-2,-2],[-1,0],[1,1],[2,0],[1,1],[0,2]] },
  { id: 'libra', name: 'Libra', x: .62, y: .5, stars: [[-2,1],[0,-1],[2,1],[-2,1]] },
  { id: 'scorpio', name: 'Scorpio', x: .86, y: .48, stars: [[-2,-2],[-1,-1],[0,0],[0,2],[1,2],[2,1],[1,.5]] },
  { id: 'sagittarius', name: 'Sagittarius', x: .13, y: .79, stars: [[-2,1],[-1,-1],[1,-1],[2,1],[-2,1],[0,2],[2,1]] },
  { id: 'capricorn', name: 'Capricorn', x: .38, y: .81, stars: [[-2,-1],[0,2],[2,-1],[0,0],[-2,-1]] },
  { id: 'aquarius', name: 'Aquarius', x: .63, y: .79, stars: [[-2,-1],[-1,0],[0,-1],[1,0],[2,-1],[1,2]] },
  { id: 'pisces', name: 'Pisces', x: .86, y: .81, stars: [[-2,-1],[-1,-2],[0,-1],[-2,-1],[0,2],[2,1],[1,0],[0,2]] },
];
