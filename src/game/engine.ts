import { BAG_CAPACITY, BUILDINGS, CONSTELLATIONS, CROP_SECONDS, CROPS, DAWN, DAY_SECONDS, FISHING_SERVICE_INTERVAL, INTERACT_RADIUS, ITEM_LABELS, NIGHT_START, OBSERVE_RADIUS, OBSERVE_SECONDS, SPAWNS, STATIONS, TOOLS, WALK_SPEED, buildingDefinition, distance, furnitureAccess, furnitureBounds, recipeDefinition, rectContains, rectsOverlap, rotatePoint, rotatedRect, type Cost, type Furniture, type Point, type Rect } from './content';
import { biomeAt, generateWorld, insideWorld, isWater, nearWater, terrainHeight, waterHeight, type WorldItem } from './geography';
import { PROTOCOL_VERSION, itemKindSchema, sandboxCommandSchema, type Building, type BuildingKind, type GameState, type MoveInput, type Player, type PlayerId, type Profile, type Rotation, type SandboxCommand } from './schema';

export function initialState(seed = 7241): GameState {
  const inventory = Object.fromEntries(itemKindSchema.options.map(kind => [kind, 0])) as GameState['inventory'];
  Object.assign(inventory, { wood: 16, stone: 10, seed: 6, fiber: 4 });
  return { version: PROTOCOL_VERSION, seed, phase: 'lobby', time: 0, dayOffset: DAY_SECONDS * .25, discoveries: [], testMode: false, players: { p1: null, p2: null }, depleted: {}, inventory,
    buildings: [], crops: [], nextId: 0, harvests: 0, catches: 0, notice: '', noticeId: 0 };
}
export function makePlayer(id: PlayerId, profile: Profile): Player {
  return { id, profile, ...SPAWNS[id], angle: 0.6, connected: true, ready: false, moving: false, emoteUntil: 0, location: null, tools: [], fishingGearWear: 0, fishing: null, resting: null, sky: null, actionAt: 0 };
}
export function bothConnected(state: GameState): boolean { return !!state.players.p1?.connected && !!state.players.p2?.connected; }
export function announce(state: GameState, text: string): void { state.notice = text; state.noticeId++; }
export function dayFraction(state: GameState): number { return ((state.time + state.dayOffset) % DAY_SECONDS) / DAY_SECONDS; }
export function isNight(state: GameState): boolean { const phase = dayFraction(state); return phase >= NIGHT_START || phase < DAWN; }
export function setReady(state: GameState, id: PlayerId, value: boolean): void {
  const player = state.players[id]; if (!player || state.phase !== 'lobby') return;
  player.ready = value;
  if (bothConnected(state) && state.players.p1?.ready && state.players.p2?.ready) { state.phase = 'playing'; announce(state, 'Welcome to Capy Cove.'); }
}
export type PlacedShape = Pick<Building, 'x' | 'z' | 'kind' | 'rotation'>;
export function buildingPoint(building: PlacedShape, point: Point): Point { const p = rotatePoint(point, building.rotation); return { x: building.x + p.x, z: building.z + p.z }; }
export function entrance(building: PlacedShape): Point { return buildingPoint(building, { x: 0, z: buildingDefinition(building.kind).depth / 2 + 1.5 }); }
/** Every exterior component and the entry lane participates in placement and clearance. */
export function buildingRects(building: PlacedShape, includeEntry = false): (Rect & { solid: boolean })[] {
  const def = buildingDefinition(building.kind);
  const parts = [{ x: 0, z: 0, width: def.width, depth: def.depth, solid: true }, ...def.exterior];
  if (includeEntry) parts.push({ x: 0, z: def.depth / 2 + 1.3, width: 2.4, depth: 2.6, solid: false });
  return parts.map(part => ({ ...rotatedRect(part, building.rotation, building), solid: part.solid }));
}
export function buildingContains(building: PlacedShape, x: number, z: number, margin = 0): boolean {
  const p = rotatePoint({ x: x - building.x, z: z - building.z }, ((360 - building.rotation) % 360) as Rotation), def = buildingDefinition(building.kind);
  return (Math.abs(p.x) < def.width / 2 + margin && Math.abs(p.z) < def.depth / 2 + margin) || def.exterior.some(r => rectContains(r, p.x, p.z, margin));
}
export function nodeCovered(state: GameState, node: WorldItem): boolean {
  return state.buildings.some(b => Math.abs(b.x - node.x) < 16 && Math.abs(b.z - node.z) < 16 && (buildingContains(b, node.x, node.z, .7) || distance(entrance(b), node) < 2));
}
export function buildingElevation(building: PlacedShape, seed: number): number {
  const def = buildingDefinition(building.kind);
  const points = [{ x: 0, z: 0 }, { x: -def.width / 2, z: -def.depth / 2 }, { x: def.width / 2, z: -def.depth / 2 }, { x: -def.width / 2, z: def.depth / 2 }, { x: def.width / 2, z: def.depth / 2 }].map(p => buildingPoint(building, p));
  return Math.max(...points.map(p => isWater(p.x, p.z, seed) ? waterHeight(p.z, seed) : terrainHeight(p.x, p.z, seed))) + .12;
}
export function deckHeight(state: GameState, x: number, z: number): number | null {
  for (const b of state.buildings) for (const part of buildingDefinition(b.kind).exterior) {
    if (part.solid || !rectContains(rotatedRect(part, b.rotation, b), x, z)) continue;
    return buildingElevation(b, state.seed) + .24;
  }
  return null;
}
export function currentBuilding(state: GameState, player: Player): Building | undefined { return player.location ? state.buildings.find(b => b.id === player.location!.buildingId) : undefined; }
export function usableFurniture(state: GameState, player: Player, furnitureId: string): { building: Building; furniture: Furniture } | null {
  const building = currentBuilding(state, player); if (!building) return null;
  const furniture = buildingDefinition(building.kind).rooms[0].furniture.find(f => f.id === furnitureId && f.use);
  return furniture && distance(player, furnitureAccess(furniture)) <= 1.65 ? { building, furniture } : null;
}
function canWalk(state: GameState, player: Player, x: number, z: number): boolean {
  if (player.location) {
    const b = currentBuilding(state, player); if (!b) return false;
    const room = buildingDefinition(b.kind).rooms[0];
    if (Math.abs(x) > room.width / 2 - .55 || Math.abs(z) > room.depth / 2 - .55) return false;
    return !room.furniture.some(f => f.solid && rectContains(furnitureBounds(f), x, z, .35));
  }
  if (!insideWorld(x, z, 1) || state.buildings.some(b => buildingRects(b).some(r => r.solid && rectContains(r, x, z, .45)))) return false;
  return !generateWorld(state.seed).items.some(n => !state.depleted[n.id] && ['wood', 'stone', 'iron', 'copper', 'crystal'].includes(n.kind) && distance(n, { x, z }) < .8 && distance(n, { x, z }) <= distance(n, player) && !nodeCovered(state, n));
}
export function movePlayer(player: Player, input: MoveInput, dt: number, state: GameState): void {
  const length = Math.hypot(input.x, input.z); player.moving = length > .05;
  if (!player.moving) return;
  player.fishing = null; player.resting = null; player.sky = null;
  const swimming = !player.location && isWater(player.x, player.z, state.seed) && deckHeight(state, player.x, player.z) === null;
  const scale = WALK_SPEED * Math.min(Math.max(dt, 0), .1) * (swimming ? .55 : 1) / Math.max(1, length);
  const x = player.x + input.x * scale, z = player.z + input.z * scale;
  if (canWalk(state, player, x, player.z)) player.x = x;
  if (canWalk(state, player, player.x, z)) player.z = z;
  player.angle = Math.atan2(input.x, input.z);
}
export function canAfford(state: GameState, cost: Cost): boolean { return state.testMode || Object.entries(cost).every(([kind, amount]) => state.inventory[kind as keyof Cost] >= amount); }
function pay(state: GameState, cost: Cost): void { if (state.testMode) return; for (const [kind, amount] of Object.entries(cost)) state.inventory[kind as keyof Cost] -= amount; }
export function bagFits(state: GameState, cost: Cost): boolean { return Object.entries(cost).every(([kind, amount]) => state.inventory[kind as keyof Cost] + amount <= BAG_CAPACITY); }
/** Grants are atomic. A full bag never consumes a harvest, output, or refund. */
function grant(state: GameState, cost: Cost): boolean {
  if (!bagFits(state, cost)) { announce(state, 'Make space in the shared bag first.'); return false; }
  for (const [kind, amount] of Object.entries(cost)) state.inventory[kind as keyof Cost] += amount;
  return true;
}
export function buildPosition(player: Player, kind: BuildingKind = 'home'): Point {
  const def = buildingDefinition(kind), offset = Math.max(def.width, def.depth) / 2 + 5;
  return { x: Math.round(player.x / 2) * 2, z: Math.round((player.z - offset) / 2) * 2 };
}
export function placementIssue(state: GameState, player: Player, kind: BuildingKind, rotation: Rotation = 0): string | null {
  if (player.location) return 'Go outside to build.';
  if (state.buildings.length >= 100) return 'Dismantle a building to make room.';
  const shape: PlacedShape = { ...buildPosition(player, kind), kind, rotation }, def = buildingDefinition(kind), rects = buildingRects(shape, true);
  const entry = entrance(shape), heights: number[] = [];
  for (const r of rects) {
    const nx = Math.ceil(r.width), nz = Math.ceil(r.depth);
    for (let ix = 0; ix <= nx; ix++) for (let iz = 0; iz <= nz; iz++) {
      const x = r.x - r.width / 2 + r.width * ix / nx, z = r.z - r.depth / 2 + r.depth * iz / nz;
      if (!insideWorld(x, z, 1)) return 'Move farther from the world boundary.';
      const wet = isWater(x, z, state.seed);
      if (wet && def.style !== 'dock') return 'The foundation and entrance need dry ground.';
      heights.push(wet ? waterHeight(z, state.seed) : terrainHeight(x, z, state.seed));
    }
  }
  if ([-.8, 0, .8].some(dx => [-.6, 0, .6].some(dz => isWater(entry.x + dx, entry.z + dz, state.seed)))) return 'The entrance must connect to dry land.';
  if (Math.max(...heights) - Math.min(...heights) > 2.5) return 'The slope is too steep. Find a gentler spot.';
  if (def.style === 'dock') {
    const pierTip = buildingPoint(shape, { x: 0, z: -6.5 }), rear = buildingPoint(shape, { x: 0, z: -2.5 });
    if (!isWater(pierTip.x, pierTip.z, state.seed) || !isWater(rear.x, rear.z, state.seed)) return 'Rotate the pier into water; keep the front door on land.';
  }
  if (state.buildings.some(b => buildingRects(b, true).some(a => rects.some(r => rectsOverlap(a, r, 1))))) return 'Leave space around buildings and their entrances.';
  if (state.crops.some(c => rects.some(r => rectContains(r, c.x, c.z, 1)))) return 'Harvest crops under this foundation first.';
  if (Object.values(state.players).some(p => p && !p.location && rects.some(r => rectContains(r, p.x, p.z, .6)))) return 'A capybara is standing in the building area.';
  return null;
}
export type Interaction = { type: 'item' | 'crop' | 'enter' | 'furniture'; id: string; label: string } | { type: 'exit' | 'fish'; label: string };
export function nearestInteraction(state: GameState, id: PlayerId): Interaction | null {
  const player = state.players[id]; if (!player || state.phase !== 'playing') return null;
  if (player.location) {
    const b = currentBuilding(state, player); if (!b) return null;
    const room = buildingDefinition(b.kind).rooms[0];
    if (distance(player, { x: 0, z: room.depth / 2 - .6 }) <= 1.8) return { type: 'exit', label: 'Step outside' };
    const furniture = room.furniture.filter(f => f.use && usableFurniture(state, player, f.id)).sort((a, b) => distance(player, furnitureAccess(a)) - distance(player, furnitureAccess(b)))[0];
    return furniture ? { type: 'furniture', id: furniture.id, label: furniture.use?.type === 'bed' ? player.resting === furniture.id ? 'Get up' : 'Rest in bed' : `Use ${furniture.name.toLowerCase()}` } : null;
  }
  if (player.fishing) return { type: 'fish', label: state.time >= player.fishing.biteAt ? 'Reel in!' : 'Waiting…' };
  const building = state.buildings.find(b => distance(player, entrance(b)) <= INTERACT_RADIUS);
  if (building) return { type: 'enter', id: building.id, label: `Enter ${buildingDefinition(building.kind).name.toLowerCase()}` };
  const crop = state.crops.filter(c => distance(player, c) <= 2.2 && state.time - c.plantedAt >= CROP_SECONDS).sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (crop) return { type: 'crop', id: crop.id, label: `Harvest ${CROPS[crop.kind].name.toLowerCase()}` };
  const node = generateWorld(state.seed).items.filter(n => distance(player, n) <= INTERACT_RADIUS && !state.depleted[n.id] && !nodeCovered(state, n)).sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (node) return { type: 'item', id: node.id, label: node.requires && !player.tools.includes(node.requires) ? `Needs ${TOOLS.find(t => t.id === node.requires)!.name.toLowerCase()}` : `Gather ${ITEM_LABELS[node.kind].toLowerCase()}` };
  if (nearWater(player.x, player.z, state.seed) && (!isWater(player.x, player.z, state.seed) || deckHeight(state, player.x, player.z) !== null)) return { type: 'fish', label: player.tools.includes('rod') ? 'Cast line' : 'Fishing rod needed' };
  return null;
}
function beginAction(state: GameState, id: PlayerId): Player | null {
  const p = state.players[id];
  if (!p || state.phase !== 'playing' || !bothConnected(state) || state.time < p.actionAt) return null;
  p.actionAt = state.time + .3; return p;
}
export function interact(state: GameState, id: PlayerId): void {
  const target = nearestInteraction(state, id), p = beginAction(state, id); if (!target || !p) return;
  if (target.type === 'enter') {
    const b = state.buildings.find(b => b.id === target.id)!;
    p.location = { buildingId: b.id, room: 0 }; p.x = 0; p.z = buildingDefinition(b.kind).rooms[0].depth / 2 - 2;
    p.fishing = null; p.moving = false; p.resting = null; p.sky = null; return;
  }
  if (target.type === 'exit') {
    const b = currentBuilding(state, p); if (!b) return;
    Object.assign(p, entrance(b)); p.location = null; p.moving = false; p.resting = null; p.sky = null; return;
  }
  if (target.type === 'furniture') {
    const context = usableFurniture(state, p, target.id); if (!context) return;
    const { furniture, building } = context;
    if (furniture.use?.type === 'bed') {
      if (p.resting === furniture.id) { p.resting = null; return; }
      if (Object.values(state.players).some(other => other && other.id !== id && other.location?.buildingId === building.id && other.resting === furniture.id)) { announce(state, 'That bed is occupied.'); return; }
      p.sky = null; p.resting = furniture.id; announce(state, isNight(state) ? 'Resting. Both capybaras must sleep to welcome dawn.' : 'Resting. Night can be skipped after sunset.');
    }
    if (furniture.use?.type === 'telescope') {
      if (!isNight(state)) { announce(state, 'The telescope needs a night sky.'); return; }
      p.resting = null; p.sky = { furnitureId: furniture.id, x: .5, y: .5, target: null, alignedAt: state.time };
    }
    return;
  }
  if (target.type === 'item') {
    const node = generateWorld(state.seed).items.find(n => n.id === target.id)!;
    if (node.requires && !p.tools.includes(node.requires)) { announce(state, target.label + '.'); return; }
    let amount = 1;
    if (['wood', 'fiber'].includes(node.kind)) amount = p.tools.includes('copperAxe') ? 4 : p.tools.includes('axe') ? 2 : 1;
    if (['stone', 'clay', 'sand', 'copper', 'iron', 'crystal'].includes(node.kind)) amount = p.tools.includes('ironPickaxe') ? 3 : p.tools.includes('pickaxe') ? 2 : 1;
    if (!grant(state, { [node.kind]: amount })) return;
    state.depleted[node.id] = state.time + node.respawn; state.harvests++; announce(state, `+${amount} ${ITEM_LABELS[node.kind].toLowerCase()}`); return;
  }
  if (target.type === 'crop') {
    const crop = state.crops.find(c => c.id === target.id)!;
    if (!grant(state, { [crop.kind]: CROPS[crop.kind].yield, seed: 2 })) return;
    state.crops = state.crops.filter(c => c.id !== crop.id); state.harvests++; announce(state, 'Harvest collected.'); return;
  }
  if (target.type === 'fish') {
    if (!p.tools.includes('rod')) { announce(state, 'Fishing rod needed.'); return; }
    if (!p.fishing) { p.fishing = { biteAt: state.time + 3, endsAt: state.time + 8 }; return; }
    if (state.time < p.fishing.biteAt) return;
    const biome = biomeAt(p.x, p.z, state.seed), kind = biome === 'highland' || biome === 'snow' ? 'trout' : 'fish', amount = p.tools.includes('fishingKit') && p.fishingGearWear < FISHING_SERVICE_INTERVAL ? 2 : 1;
    const pearl = (state.catches + 1) % 3 === 0;
    if (!grant(state, { [kind]: amount, ...(pearl ? { pearl: 1 } : {}) })) return;
    if (amount === 2) p.fishingGearWear++;
    state.catches++; state.harvests++; p.fishing = null; announce(state, `+${amount} ${ITEM_LABELS[kind].toLowerCase()}${pearl ? ' · +1 pearl' : ''}`);
  }
}
export function storageUsed(building: Building): number { return Object.values(building.storage).reduce((sum, amount) => sum + (amount || 0), 0); }
export function dismantleIssue(state: GameState, building: Building): string | null {
  if (Object.values(state.players).some(p => p?.location?.buildingId === building.id)) return 'Both players must leave first.';
  if (storageUsed(building)) return 'Empty the building storage first.';
  if (building.jobs.length) return 'Collect all production jobs first.';
  if (building.plots.length) return 'Harvest every indoor plot first.';
  if (!bagFits(state, buildingDefinition(building.kind).cost)) return 'Make room in the bag for the full refund.';
  return null;
}
export function sandboxAction(state: GameState, id: PlayerId, raw: SandboxCommand): void {
  const parsed = sandboxCommandSchema.safeParse(raw); if (!parsed.success) return;
  const command = parsed.data;
  // Closing a local view must always release its authoritative activity, even during action cooldown.
  if (command.type === 'stop-use') { const p = state.players[id]; if (p) { p.resting = null; p.sky = null; } return; }
  const p = beginAction(state, id); if (!p) return;
  if (command.type === 'aim' || command.type === 'record') {
    if (!p.sky || !isNight(state) || usableFurniture(state, p, p.sky.furnitureId)?.furniture.use?.type !== 'telescope') return;
    if (command.type === 'aim') {
      p.sky.x = command.x; p.sky.y = command.y;
      const target = CONSTELLATIONS.find(c => Math.hypot(c.x - command.x, c.y - command.y) <= OBSERVE_RADIUS)?.id || null;
      if (target !== p.sky.target) { p.sky.target = target; p.sky.alignedAt = state.time; }
    } else if (p.sky.target === command.constellation && state.time - p.sky.alignedAt >= OBSERVE_SECONDS && !state.discoveries.includes(command.constellation)) {
      state.discoveries.push(command.constellation); announce(state, `${CONSTELLATIONS.find(c => c.id === command.constellation)!.name} recorded in the shared star chart.`);
    }
    return;
  }
  if (command.type === 'transfer') {
    const ctx = usableFurniture(state, p, command.furnitureId); if (!ctx || ctx.furniture.use?.type !== 'storage') return;
    const { building } = ctx, storage = buildingDefinition(building.kind).storage, amount = command.amount;
    if (command.direction === 'deposit') {
      if (storage.accepts && !storage.accepts.includes(command.item)) { announce(state, 'This store accepts farm food only.'); return; }
      if (state.inventory[command.item] < amount) { announce(state, 'Not enough in the shared bag.'); return; }
      if (storageUsed(building) + amount > storage.capacity) { announce(state, 'Not enough room in this store.'); return; }
      state.inventory[command.item] -= amount; building.storage[command.item] = (building.storage[command.item] || 0) + amount;
    } else {
      if ((building.storage[command.item] || 0) < amount) { announce(state, 'Not enough in this store.'); return; }
      if (!grant(state, { [command.item]: amount })) return;
      building.storage[command.item] = (building.storage[command.item] || 0) - amount;
    }
    return;
  }
  if (command.type === 'produce' || command.type === 'collect') {
    const ctx = usableFurniture(state, p, command.stationId); if (!ctx || ctx.furniture.use?.type !== 'station') return;
    const { building, furniture } = ctx, kind = furniture.use!.type === 'station' ? furniture.use!.station : null; if (!kind) return;
    if (command.type === 'collect') {
      const job = building.jobs.find(j => j.id === command.jobId && j.stationId === furniture.id && j.ready); if (!job) return;
      const recipe = recipeDefinition(job.recipe);
      if (recipe.tool || recipe.service) {
        if (job.owner !== id) { announce(state, 'That tool belongs to your friend.'); return; }
        if (recipe.tool && !p.tools.includes(recipe.tool)) p.tools.push(recipe.tool);
        if (recipe.tool === 'fishingKit' || recipe.service === 'fishingKit') p.fishingGearWear = 0;
      } else if (!grant(state, recipe.output)) return;
      building.jobs = building.jobs.filter(j => j !== job); return;
    }
    const recipe = recipeDefinition(command.recipe);
    if (recipe.station !== kind) { announce(state, 'Use the correct station for this recipe.'); return; }
    if (recipe.requires && !p.tools.includes(recipe.requires)) { announce(state, 'Craft the prerequisite tool first.'); return; }
    if (recipe.service && (p.fishingGearWear === 0 || state.buildings.some(b => b.jobs.some(j => j.owner === id && recipeDefinition(j.recipe).service === recipe.service)))) { announce(state, 'Gear is serviced or a repair is already queued.'); return; }
    if (recipe.tool && (p.tools.includes(recipe.tool) || state.buildings.some(b => b.jobs.some(j => j.owner === id && recipeDefinition(j.recipe).tool === recipe.tool)))) { announce(state, 'This tool is owned or already in production.'); return; }
    if (building.jobs.filter(j => j.stationId === furniture.id).length >= STATIONS[kind].queueLimit) { announce(state, 'Station queue full. Collect finished work.'); return; }
    if (!canAfford(state, recipe.cost)) { announce(state, 'Missing materials in the shared bag.'); return; }
    pay(state, recipe.cost);
    building.jobs.push({ id: `job-${state.nextId++}`, stationId: furniture.id, recipe: recipe.id, owner: id, remaining: recipe.seconds, ready: false }); return;
  }
  if (command.type === 'plot') {
    const ctx = usableFurniture(state, p, command.furnitureId); if (!ctx || ctx.furniture.use?.type !== 'plot') return;
    const { building } = ctx, existing = building.plots.find(plot => plot.furnitureId === command.furnitureId);
    if (command.action === 'harvest') {
      if (!existing || state.time - existing.plantedAt < CROP_SECONDS) return;
      if (!grant(state, { [existing.kind]: CROPS[existing.kind].yield, seed: 2 })) return;
      building.plots = building.plots.filter(plot => plot !== existing); state.harvests++; return;
    }
    if (existing || !p.tools.includes('hoe') || !canAfford(state, { seed: 1 })) { announce(state, existing ? 'This bed is already planted.' : 'A garden hoe and seed are needed.'); return; }
    pay(state, { seed: 1 }); building.plots.push({ furnitureId: command.furnitureId, kind: command.crop, plantedAt: state.time }); return;
  }
  if (command.type === 'craft') {
    const recipe = TOOLS.find(t => t.id === command.tool); if (!recipe) return;
    if (recipe.station) { announce(state, `Use the ${STATIONS[recipe.station].name.toLowerCase()} for this tool.`); return; }
    if (p.tools.includes(recipe.id)) { announce(state, 'Already owned.'); return; }
    if (!canAfford(state, recipe.cost)) { announce(state, 'Missing materials.'); return; }
    pay(state, recipe.cost); p.tools.push(recipe.id); announce(state, `${recipe.name} crafted.`); return;
  }
  if (command.type === 'build') {
    if (!BUILDINGS.some(b => b.id === command.kind)) return;
    const problem = placementIssue(state, p, command.kind, command.rotation); if (problem) { announce(state, problem); return; }
    const def = buildingDefinition(command.kind); if (!canAfford(state, def.cost)) { announce(state, 'Gather the missing materials before building.'); return; }
    pay(state, def.cost); state.buildings.push({ id: `building-${state.nextId++}`, kind: command.kind, rotation: command.rotation, ...buildPosition(p, command.kind), storage: {}, jobs: [], plots: [] });
    announce(state, `${def.name} built.`); return;
  }
  if (command.type === 'plant') {
    if (p.location || !p.tools.includes('hoe')) { announce(state, 'Use a greenhouse bed, or take a hoe outside.'); return; }
    if (state.crops.length >= 200) { announce(state, 'Harvest some crops before planting more.'); return; }
    const x = Math.round((p.x + Math.sin(p.angle) * 2.5) / 2) * 2, z = Math.round((p.z + Math.cos(p.angle) * 2.5) / 2) * 2;
    if (!insideWorld(x, z, 2) || !['meadow', 'forest'].includes(biomeAt(x, z, state.seed)) || isWater(x, z, state.seed) || state.buildings.some(b => buildingRects(b, true).some(r => rectContains(r, x, z, 1))) || state.crops.some(c => distance(c, { x, z }) < 1.9) || generateWorld(state.seed).items.some(n => distance(n, { x, z }) < 1.6)) { announce(state, 'Find clear meadow or forest soil.'); return; }
    if (!canAfford(state, { seed: 1 })) { announce(state, 'Gather wild seeds in the meadow.'); return; }
    pay(state, { seed: 1 }); state.crops.push({ id: `crop-${state.nextId++}`, kind: command.crop, x, z, plantedAt: state.time }); announce(state, `${CROPS[command.crop].name} planted.`); return;
  }
  if (command.type === 'dismantle') {
    if (p.location) { announce(state, 'Go outside to dismantle a building.'); return; }
    const b = state.buildings.find(b => distance(p, entrance(b)) <= INTERACT_RADIUS); if (!b) { announce(state, 'Stand by the front door to dismantle.'); return; }
    const issue = dismantleIssue(state, b); if (issue) { announce(state, issue); return; }
    if (!grant(state, buildingDefinition(b.kind).cost)) return;
    state.buildings = state.buildings.filter(other => other.id !== b.id); announce(state, 'Building removed. Materials returned.');
  }
}
/** Host-owned clocks and station queues. No renderer or client can complete production. */
function advanceBuildings(state: GameState, dt: number): void {
  for (const building of state.buildings) for (const f of buildingDefinition(building.kind).rooms[0].furniture) {
    if (f.use?.type !== 'station') continue;
    const jobs = building.jobs.filter(j => j.stationId === f.id), active = jobs.find(j => !j.ready);
    if (!active) continue;
    active.remaining = Math.max(0, active.remaining - dt);
    if (active.remaining === 0 && jobs.filter(j => j.ready).length < STATIONS[f.use.station].outputSlots) active.ready = true;
  }
}
/** Host-owned simulation; no DOM, rendering, transport or client-supplied positions. */
export class GameEngine {
  readonly state: GameState;
  private normalInventory: GameState['inventory'] | null = null;
  private inputs: Record<PlayerId, { value: MoveInput; at: number }> = { p1: { value: { x: 0, z: 0 }, at: 0 }, p2: { value: { x: 0, z: 0 }, at: 0 } };
  constructor(seed = 7241) { this.state = initialState(seed); }
  addPlayer(id: PlayerId, profile: Profile): void {
    const p = this.state.players[id];
    if (p && this.state.phase !== 'lobby') { p.profile = profile; p.connected = true; p.moving = false; p.fishing = null; p.resting = null; p.sky = null; this.setInput(id, { x: 0, z: 0 }); announce(this.state, `${profile.name} is back.`); }
    else this.state.players[id] = makePlayer(id, profile);
  }
  disconnect(id: PlayerId): void {
    const p = this.state.players[id]; if (p) { p.connected = false; p.ready = false; p.moving = false; p.fishing = null; }
    for (const key of ['p1', 'p2'] as const) { this.setInput(key, { x: 0, z: 0 }); const player = this.state.players[key]; if (player) { player.moving = false; player.resting = null; player.sky = null; } }
    announce(this.state, 'Your friend disconnected. The world is paused until they return.');
  }
  setInput(id: PlayerId, value: MoveInput): void { this.inputs[id] = { value, at: this.state.time }; }
  ready(id: PlayerId, value: boolean): void { setReady(this.state, id, value); }
  interact(id: PlayerId): void { interact(this.state, id); const p = this.state.players[id]; if (p?.resting || p?.sky) this.setInput(id, { x: 0, z: 0 }); }
  action(id: PlayerId, command: SandboxCommand): void { sandboxAction(this.state, id, command); }
  setTestMode(enabled: boolean): void {
    if (enabled === this.state.testMode) return;
    if (enabled) { this.normalInventory = { ...this.state.inventory }; for (const kind of itemKindSchema.options) this.state.inventory[kind] = BAG_CAPACITY; this.state.testMode = true; announce(this.state, 'Builder test mode on. Material costs are free.'); return; }
    if (this.normalInventory) this.state.inventory = { ...this.normalInventory };
    this.normalInventory = null; this.state.testMode = false; announce(this.state, 'Builder test mode off. Your normal bag is back.');
  }
  emote(id: PlayerId): void { const p = this.state.players[id]; if (p && p.emoteUntil <= this.state.time) p.emoteUntil = this.state.time + 2.5; }
  tick(dt: number): void {
    if (this.state.phase === 'lobby' || !bothConnected(this.state)) return;
    const step = Math.min(Math.max(dt, 0), .1); this.state.time += step;
    advanceBuildings(this.state, step);
    for (const [id, until] of Object.entries(this.state.depleted)) if (until <= this.state.time) {
      const node = generateWorld(this.state.seed).items.find(n => n.id === id);
      const occupied = node && Object.values(this.state.players).some(p => p && !p.location && distance(p, node) < 1.2);
      if (occupied) this.state.depleted[id] = this.state.time + 1; else delete this.state.depleted[id];
    }
    for (const id of ['p1', 'p2'] as const) {
      const p = this.state.players[id]; if (!p) continue;
      if (p.fishing && this.state.time > p.fishing.endsAt) { p.fishing = null; announce(this.state, 'The fish slipped away.'); }
      const input = this.inputs[id]; movePlayer(p, this.state.time - input.at > .4 ? { x: 0, z: 0 } : input.value, step, this.state);
      if (p.sky && (!isNight(this.state) || !usableFurniture(this.state, p, p.sky.furnitureId))) p.sky = null;
      if (p.resting && !usableFurniture(this.state, p, p.resting)) p.resting = null;
    }
    if (isNight(this.state) && this.state.players.p1?.resting && this.state.players.p2?.resting) {
      const phase = dayFraction(this.state); this.state.dayOffset += ((DAWN - phase + 1) % 1) * DAY_SECONDS + .001;
      for (const p of Object.values(this.state.players)) if (p) { p.resting = null; p.sky = null; }
      announce(this.state, 'A new morning.');
    }
  }
}
