import type { BuildingKind, CropKind, ItemKind, ToolKind } from './schema';

export const WORLD_LIMIT = 126;
export const INTERACT_RADIUS = 2.5;
export const WALK_SPEED = 7;
export const TICK_RATE = 30;
export const SNAPSHOT_RATE = 10;
export const SPAWNS = { p1: { x: -2, z: 8 }, p2: { x: 0, z: 8 } };
export const CROP_SECONDS = 45;
export const ROOM_WIDTH = 12;
export const ROOM_DEPTH = 10;
export type Cost = Partial<Record<ItemKind, number>>;
export const ITEM_LABELS: Record<ItemKind, string> = {
  orange: 'Oranges', seed: 'Seeds', stone: 'Stone', wood: 'Wood', fiber: 'Fiber', clay: 'Clay', sand: 'Sand',
  copper: 'Copper', iron: 'Iron', crystal: 'Crystal', wheat: 'Wheat', carrot: 'Carrots', fish: 'River fish', trout: 'Mountain trout', pearl: 'Pearls',
};
export const ITEM_COLORS: Record<ItemKind, string> = {
  orange: '#eda33c', seed: '#bdad65', stone: '#8c9a9c', wood: '#a0784e', fiber: '#71945c', clay: '#bd8264', sand: '#dcc58a',
  copper: '#c48055', iron: '#747e95', crystal: '#a48dc9', wheat: '#dcc26e', carrot: '#d48949', fish: '#7faeba', trout: '#aba3bc', pearl: '#eee5d5',
};
export interface ToolDefinition { id: ToolKind; name: string; description: string; cost: Cost; requires?: ToolKind }
export const TOOLS: readonly ToolDefinition[] = [
  { id: 'axe', name: 'Stone axe', description: 'Gather twice as much wood and fiber. Never breaks.', cost: { wood: 4, stone: 3 } },
  { id: 'pickaxe', name: 'Stone pickaxe', description: 'Mine copper and iron. Double stone, clay and sand.', cost: { wood: 4, stone: 5 } },
  { id: 'hoe', name: 'Garden hoe', description: 'Plant renewable wheat and carrots on meadow or forest soil.', cost: { wood: 3, stone: 2 } },
  { id: 'rod', name: 'Fishing rod', description: 'Cast at any riverbank. No bait required. Reel when a fish bites.', cost: { wood: 4, fiber: 3 } },
  { id: 'copperAxe', name: 'Copper axe', description: 'Gather four wood or fiber per harvest.', cost: { wood: 6, copper: 6 }, requires: 'axe' },
  { id: 'ironPickaxe', name: 'Iron pickaxe', description: 'Mine highland crystal. Triple stone and ore yields.', cost: { wood: 6, iron: 8 }, requires: 'pickaxe' },
];
export interface RoomDefinition { name: string; furniture: readonly FurnitureKind[] }
export type FurnitureKind = 'bed' | 'table' | 'shelf' | 'stove' | 'sink' | 'sofa' | 'desk' | 'barrel' | 'planter' | 'anvil' | 'telescope' | 'bath' | 'display' | 'loom';
export interface BuildingDefinition {
  id: BuildingKind; name: string; description: string; cost: Cost; color: string; roof: string;
  style: 'gable' | 'barn' | 'tower' | 'glass' | 'pagoda' | 'dock'; rooms: readonly RoomDefinition[];
}
const room = (name: string, ...furniture: FurnitureKind[]): RoomDefinition => ({ name, furniture });
export const BUILDINGS: readonly BuildingDefinition[] = [
  { id: 'home', name: 'Home house', description: 'A hearth, a kitchen, and a room of your own.', cost: { wood: 12, stone: 6 }, color: '#f0dab0', roof: '#b8795c', style: 'gable', rooms: [room('Living room', 'sofa', 'table', 'shelf'), room('Kitchen', 'stove', 'sink', 'table'), room('Bedroom', 'bed', 'desk', 'shelf')] },
  { id: 'farm', name: 'Farmstead', description: 'A working barn with a seed room and farmhouse kitchen.', cost: { wood: 16, stone: 6, fiber: 4 }, color: '#ba785b', roof: '#716c55', style: 'barn', rooms: [room('Barn', 'barrel', 'loom', 'table'), room('Seed room', 'planter', 'shelf', 'barrel'), room('Farm kitchen', 'stove', 'sink', 'table')] },
  { id: 'dock', name: 'Water dock', description: 'Build beside water. A covered landing and tackle cabin.', cost: { wood: 14, fiber: 4 }, color: '#c2ac82', roof: '#5c8585', style: 'dock', rooms: [room('Landing cabin', 'table', 'barrel', 'shelf'), room('Tackle room', 'desk', 'shelf', 'barrel'), room('Net loft', 'loom', 'sofa', 'shelf')] },
  { id: 'workshop', name: 'Workshop', description: 'A woodshop, makers’ studio and supply room.', cost: { wood: 18, stone: 8 }, color: '#ceb387', roof: '#71817a', style: 'gable', rooms: [room('Woodshop', 'desk', 'loom', 'shelf'), room('Makers’ studio', 'table', 'desk', 'display'), room('Supply room', 'barrel', 'shelf', 'shelf')] },
  { id: 'cottage', name: 'Forest cottage', description: 'A leafy retreat for long, quiet afternoons.', cost: { wood: 14, stone: 6, fiber: 8 }, color: '#e0d6af', roof: '#78845b', style: 'gable', rooms: [room('Reading room', 'sofa', 'shelf', 'desk'), room('Garden kitchen', 'planter', 'sink', 'stove'), room('Sleeping nook', 'bed', 'shelf', 'table')] },
  { id: 'greenhouse', name: 'Greenhouse', description: 'Glazed growing rooms and a potting workshop.', cost: { wood: 12, sand: 12, copper: 4 }, color: '#aac9b5', roof: '#a4c7bf', style: 'glass', rooms: [room('Growing room', 'planter', 'planter', 'sink'), room('Potting room', 'desk', 'barrel', 'shelf'), room('Winter garden', 'planter', 'sofa', 'table')] },
  { id: 'bakery', name: 'Bakery', description: 'A warm shop, flour pantry and stone-oven kitchen.', cost: { wood: 12, stone: 10, clay: 8 }, color: '#efcca4', roof: '#bf8863', style: 'gable', rooms: [room('Bread shop', 'display', 'table', 'shelf'), room('Oven kitchen', 'stove', 'desk', 'sink'), room('Flour pantry', 'barrel', 'shelf', 'barrel')] },
  { id: 'smithy', name: 'Smithy', description: 'A stone forge with a metalworking room and ore store.', cost: { stone: 20, wood: 10, iron: 6 }, color: '#979b94', roof: '#606e72', style: 'barn', rooms: [room('Forge', 'anvil', 'stove', 'barrel'), room('Metal workshop', 'desk', 'anvil', 'shelf'), room('Ore store', 'barrel', 'display', 'shelf')] },
  { id: 'lodge', name: 'Mountain lodge', description: 'A sturdy base for highland expeditions.', cost: { wood: 22, stone: 14, fiber: 6 }, color: '#bda989', roof: '#6b7885', style: 'gable', rooms: [room('Great room', 'sofa', 'stove', 'table'), room('Bunk room', 'bed', 'bed', 'shelf'), room('Equipment room', 'desk', 'shelf', 'barrel')] },
  { id: 'library', name: 'Library', description: 'A reading hall, archive and writing study.', cost: { wood: 22, fiber: 12, stone: 8 }, color: '#e0cdb0', roof: '#73837e', style: 'tower', rooms: [room('Reading hall', 'shelf', 'table', 'sofa'), room('Archive', 'shelf', 'shelf', 'desk'), room('Writing study', 'desk', 'shelf', 'sofa')] },
  { id: 'inn', name: 'Cozy inn', description: 'A common room, kitchen and two guest suites.', cost: { wood: 28, stone: 16, fiber: 10 }, color: '#e6c798', roof: '#a47065', style: 'barn', rooms: [room('Common room', 'sofa', 'table', 'stove'), room('Kitchen', 'stove', 'sink', 'barrel'), room('Sunrise suite', 'bed', 'desk', 'table'), room('Moonrise suite', 'bed', 'sofa', 'shelf')] },
  { id: 'mill', name: 'Windmill', description: 'A turning sail above grain, milling and flour rooms.', cost: { wood: 20, stone: 12, fiber: 8 }, color: '#e4d4ae', roof: '#887d62', style: 'tower', rooms: [room('Grain floor', 'barrel', 'barrel', 'shelf'), room('Milling room', 'loom', 'desk', 'barrel'), room('Flour store', 'shelf', 'table', 'barrel')] },
  { id: 'boathouse', name: 'Boathouse', description: 'A waterside boat workshop and skipper’s quarters.', cost: { wood: 22, fiber: 8, copper: 4 }, color: '#b5c6bd', roof: '#617e8b', style: 'dock', rooms: [room('Boat workshop', 'loom', 'desk', 'barrel'), room('Chart room', 'desk', 'shelf', 'display'), room('Skipper’s quarters', 'bed', 'table', 'sofa')] },
  { id: 'apothecary', name: 'Apothecary', description: 'An herb shop, drying room and mixing laboratory.', cost: { wood: 16, clay: 10, fiber: 10 }, color: '#c8cda4', roof: '#7d8a65', style: 'gable', rooms: [room('Herb shop', 'display', 'planter', 'shelf'), room('Drying room', 'loom', 'planter', 'barrel'), room('Mixing laboratory', 'desk', 'sink', 'shelf')] },
  { id: 'observatory', name: 'Observatory', description: 'A copper-roofed tower for watching distant skies.', cost: { stone: 22, copper: 12, crystal: 4 }, color: '#c9c2b3', roof: '#74a3a0', style: 'tower', rooms: [room('Star hall', 'display', 'shelf', 'table'), room('Telescope room', 'telescope', 'desk', 'shelf'), room('Astronomer’s study', 'desk', 'bed', 'shelf')] },
  { id: 'teaHouse', name: 'Tea house', description: 'A peaceful tearoom with a tea kitchen and meditation room.', cost: { wood: 18, clay: 8, fiber: 8 }, color: '#e5d6b1', roof: '#7a9580', style: 'pagoda', rooms: [room('Tearoom', 'table', 'sofa', 'planter'), room('Tea kitchen', 'stove', 'sink', 'shelf'), room('Meditation room', 'planter', 'sofa', 'display')] },
  { id: 'warehouse', name: 'Warehouse', description: 'A cargo hall, sorting room and foreman’s office.', cost: { wood: 24, stone: 10, iron: 4 }, color: '#bba881', roof: '#77857c', style: 'barn', rooms: [room('Cargo hall', 'barrel', 'shelf', 'barrel'), room('Sorting room', 'table', 'shelf', 'loom'), room('Foreman’s office', 'desk', 'shelf', 'sofa')] },
  { id: 'pottery', name: 'Pottery studio', description: 'A pottery gallery, wheel studio and kiln room.', cost: { wood: 12, stone: 12, clay: 12 }, color: '#dcb399', roof: '#a77b67', style: 'gable', rooms: [room('Ceramics gallery', 'display', 'shelf', 'table'), room('Wheel studio', 'desk', 'sink', 'barrel'), room('Kiln room', 'stove', 'shelf', 'barrel')] },
  { id: 'bathhouse', name: 'Bathhouse', description: 'A changing room, warm baths and cooling lounge.', cost: { stone: 22, clay: 12, wood: 12 }, color: '#d3cfb8', roof: '#809d94', style: 'pagoda', rooms: [room('Changing room', 'shelf', 'sofa', 'table'), room('Warm baths', 'bath', 'bath', 'sink'), room('Cooling lounge', 'sofa', 'planter', 'table')] },
  { id: 'museum', name: 'Island museum', description: 'A natural-history hall, mineral gallery and curator’s studio.', cost: { stone: 26, wood: 18, crystal: 6, pearl: 3 }, color: '#e4d9be', roof: '#79869b', style: 'tower', rooms: [room('Natural-history hall', 'display', 'display', 'shelf'), room('Mineral gallery', 'display', 'shelf', 'table'), room('Curator’s studio', 'desk', 'display', 'shelf')] },
];
export function buildingDefinition(kind: BuildingKind): BuildingDefinition { return BUILDINGS.find(b => b.id === kind)!; }
export function costLabel(cost: Cost): string { return Object.entries(cost).map(([kind, amount]) => `${amount} ${ITEM_LABELS[kind as ItemKind].toLowerCase()}`).join(' · '); }
export const CROPS: Record<CropKind, { name: string; color: string; yield: number }> = { wheat: { name: 'Wheat', color: '#e1c36b', yield: 3 }, carrot: { name: 'Carrots', color: '#d78c48', yield: 3 } };
export interface Furniture { kind: FurnitureKind; x: number; z: number; width: number; depth: number }
/** Shared furniture footprints are the collision truth for both renderer and engine. Door lanes stay clear. */
export function roomFurniture(def: RoomDefinition): Furniture[] {
  const anchors = [{ x: -3.6, z: -2.6 }, { x: 3.5, z: -2.6 }, { x: 3.4, z: 2.7 }];
  return def.furniture.map((kind, i) => ({ kind, ...anchors[i], width: kind === 'bed' || kind === 'bath' || kind === 'sofa' ? 2.5 : 2, depth: kind === 'bed' || kind === 'bath' ? 2.7 : 1.5 }));
}
export function distance(a: { x: number; z: number }, b: { x: number; z: number }): number { return Math.hypot(a.x - b.x, a.z - b.z); }
