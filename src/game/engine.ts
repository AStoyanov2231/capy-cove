import { BUILDINGS, CROP_SECONDS, CROPS, INTERACT_RADIUS, ITEM_LABELS, ROOM_DEPTH, ROOM_WIDTH, SPAWNS, TOOLS, WALK_SPEED, buildingDefinition, distance, roomFurniture, type Cost } from './content';
import { biomeAt, generateWorld, insideWorld, isWater, nearWater, terrainHeight, type WorldItem } from './geography';
import { PROTOCOL_VERSION, itemKindSchema, type Building, type BuildingKind, type GameState, type MoveInput, type Player, type PlayerId, type Profile, type SandboxCommand } from './schema';

export function initialState(seed = 7241): GameState {
  const inventory = Object.fromEntries(itemKindSchema.options.map(kind => [kind, 0])) as GameState['inventory'];
  Object.assign(inventory, { wood: 16, stone: 10, seed: 6, fiber: 4 });
  return { version: PROTOCOL_VERSION, seed, phase: 'lobby', time: 0, players: { p1: null, p2: null }, depleted: {}, inventory,
    buildings: [], crops: [], nextId: 0, harvests: 0, catches: 0, notice: '', noticeId: 0 };
}
export function makePlayer(id: PlayerId, profile: Profile): Player {
  return { id, profile, ...SPAWNS[id], angle: 0.6, connected: true, ready: false, moving: false, emoteUntil: 0, location: null, tools: [], fishing: null, actionAt: 0 };
}
export function bothConnected(state: GameState): boolean { return !!state.players.p1?.connected && !!state.players.p2?.connected; }
export function announce(state: GameState, text: string): void { state.notice = text; state.noticeId++; }
export function setReady(state: GameState, id: PlayerId, value: boolean): void {
  const player = state.players[id]; if (!player || state.phase !== 'lobby') return;
  player.ready = value;
  if (bothConnected(state) && state.players.p1?.ready && state.players.p2?.ready) {
    state.phase = 'playing'; announce(state, 'Your world, your pace. The shared bag has a few supplies to get you started.');
  }
}
export function buildingContains(building: Building, x: number, z: number, margin = 0): boolean { return Math.abs(x - building.x) < 4 + margin && Math.abs(z - building.z) < 3 + margin; }
export function entrance(building: Building): { x: number; z: number } { return { x: building.x, z: building.z + 4.5 }; }
export function nodeCovered(state: GameState, node: WorldItem): boolean { return state.buildings.some(b => buildingContains(b, node.x, node.z, 0.5) || distance(entrance(b), node) < 2); }
function canWalk(state: GameState, player: Player, x: number, z: number): boolean {
  if (player.location) {
    if (Math.abs(x) > ROOM_WIDTH / 2 - 0.55 || Math.abs(z) > ROOM_DEPTH / 2 - 0.55) return false;
    const b = state.buildings.find(b => b.id === player.location!.buildingId); if (!b) return false;
    const room = buildingDefinition(b.kind).rooms[player.location.room]; if (!room) return false;
    return !roomFurniture(room).some(f => Math.abs(x - f.x) < f.width / 2 + 0.35 && Math.abs(z - f.z) < f.depth / 2 + 0.35);
  }
  if (!insideWorld(x, z, 1) || state.buildings.some(b => buildingContains(b, x, z, 0.5))) return false;
  return !generateWorld(state.seed).items.some(n => !state.depleted[n.id] && ['wood', 'stone', 'iron', 'copper', 'crystal'].includes(n.kind) && distance(n, { x, z }) < 0.8 && distance(n, { x, z }) <= distance(n, player) && !nodeCovered(state, n));
}
export function movePlayer(player: Player, input: MoveInput, dt: number, state: GameState): void {
  const length = Math.hypot(input.x, input.z); player.moving = length > 0.05;
  if (!player.moving) return;
  player.fishing = null;
  const scale = WALK_SPEED * Math.min(dt, 0.1) * (!player.location && isWater(player.x, player.z, state.seed) ? 0.55 : 1) / Math.max(1, length);
  const x = player.x + input.x * scale, z = player.z + input.z * scale;
  if (canWalk(state, player, x, player.z)) player.x = x;
  if (canWalk(state, player, player.x, z)) player.z = z;
  player.angle = Math.atan2(input.x, input.z);
}
export function canAfford(state: GameState, cost: Cost): boolean { return Object.entries(cost).every(([kind, amount]) => state.inventory[kind as keyof Cost] >= amount); }
function pay(state: GameState, cost: Cost): void { for (const [kind, amount] of Object.entries(cost)) state.inventory[kind as keyof Cost] -= amount; }
function grant(state: GameState, cost: Cost): void { for (const [kind, amount] of Object.entries(cost)) state.inventory[kind as keyof Cost] = Math.min(9999, state.inventory[kind as keyof Cost] + amount); }
export function buildPosition(player: Player): { x: number; z: number } { return { x: Math.round(player.x / 2) * 2, z: Math.round((player.z - 9) / 2) * 2 }; }
export function placementIssue(state: GameState, player: Player, kind: BuildingKind): string | null {
  if (player.location) return 'Go outside to build.';
  if (state.buildings.length >= 100) return 'This world has 100 buildings. Dismantle one to make room.';
  const pos = buildPosition(player);
  if (!insideWorld(pos.x, pos.z, 7)) return 'Move farther from the world boundary.';
  const heights: number[] = [];
  for (const dx of [-4.5, 0, 4.5]) for (const dz of [-3.5, 0, 5]) {
    if (isWater(pos.x + dx, pos.z + dz, state.seed)) return 'The foundation and entrance need dry ground.';
    heights.push(terrainHeight(pos.x + dx, pos.z + dz, state.seed));
  }
  if (Math.max(...heights) - Math.min(...heights) > 2.5) return 'The slope is too steep. Find a gentler spot.';
  // Waterfront buildings sit on a dry bank, within twelve units of the river.
  if (buildingDefinition(kind).style === 'dock' && ![-6, 0, 6].some(dx => nearWater(pos.x + dx, pos.z, state.seed))) return 'Build a dock near a riverbank.';
  if (state.buildings.some(b => Math.abs(b.x - pos.x) < 10 && Math.abs(b.z - pos.z) < 10)) return 'Leave space between buildings and their entrances.';
  if (state.crops.some(c => buildingContains({ ...pos, kind, id: '' }, c.x, c.z, 1))) return 'Harvest the crops under this foundation first.';
  if (Object.values(state.players).some(p => p && !p.location && buildingContains({ ...pos, kind, id: '' }, p.x, p.z, 1))) return 'A capybara is standing in the building area.';
  return null;
}
export type Interaction = { type: 'item' | 'crop' | 'enter'; id: string; label: string } | { type: 'exit' | 'room' | 'fish'; room?: number; label: string };
export function nearestInteraction(state: GameState, id: PlayerId): Interaction | null {
  const player = state.players[id]; if (!player || state.phase !== 'playing') return null;
  if (player.location) {
    const b = state.buildings.find(b => b.id === player.location!.buildingId); if (!b) return null;
    const rooms = buildingDefinition(b.kind).rooms, current = player.location.room;
    if (distance(player, { x: 0, z: 4.4 }) <= 2) return { type: 'exit', label: 'Step outside' };
    if (current > 0 && distance(player, { x: -5.3, z: 0 }) <= 2) return { type: 'room', room: current - 1, label: `Enter ${rooms[current - 1].name.toLowerCase()}` };
    if (current < rooms.length - 1 && distance(player, { x: 5.3, z: 0 }) <= 2) return { type: 'room', room: current + 1, label: `Enter ${rooms[current + 1].name.toLowerCase()}` };
    return null;
  }
  if (player.fishing) return { type: 'fish', label: state.time >= player.fishing.biteAt ? 'A bite! Reel in' : 'Line cast · wait for a bite' };
  const building = state.buildings.find(b => distance(player, entrance(b)) <= INTERACT_RADIUS);
  if (building) return { type: 'enter', id: building.id, label: `Enter ${buildingDefinition(building.kind).name.toLowerCase()}` };
  const crop = state.crops.filter(c => distance(player, c) <= 2.2 && state.time - c.plantedAt >= CROP_SECONDS).sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (crop) return { type: 'crop', id: crop.id, label: `Harvest ${CROPS[crop.kind].name.toLowerCase()}` };
  const node = generateWorld(state.seed).items.filter(n => distance(player, n) <= INTERACT_RADIUS && !state.depleted[n.id] && !nodeCovered(state, n)).sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (node) return { type: 'item', id: node.id, label: node.requires && !player.tools.includes(node.requires) ? `Needs ${TOOLS.find(t => t.id === node.requires)!.name.toLowerCase()}` : `Gather ${ITEM_LABELS[node.kind].toLowerCase()}` };
  if (nearWater(player.x, player.z, state.seed) && !isWater(player.x, player.z, state.seed)) return { type: 'fish', label: player.tools.includes('rod') ? 'Cast fishing line' : 'Craft a fishing rod to fish here' };
  return null;
}
function beginAction(state: GameState, id: PlayerId): Player | null {
  const p = state.players[id];
  if (!p || state.phase !== 'playing' || !bothConnected(state) || state.time < p.actionAt) return null;
  p.actionAt = state.time + 0.3; return p;
}
export function interact(state: GameState, id: PlayerId): void {
  const target = nearestInteraction(state, id), p = beginAction(state, id); if (!target || !p) return;
  if (target.type === 'enter') { p.location = { buildingId: target.id, room: 0 }; p.x = 0; p.z = 2.5; p.fishing = null; p.moving = false; return; }
  if (target.type === 'exit') {
    const b = state.buildings.find(b => b.id === p.location?.buildingId); if (!b) return;
    Object.assign(p, entrance(b)); p.location = null; p.moving = false; return;
  }
  if (target.type === 'room' && p.location && target.room !== undefined) {
    const direction = target.room > p.location.room ? -1 : 1; p.location.room = target.room; p.x = direction * 3.7; p.z = 0; p.moving = false; return;
  }
  if (target.type === 'item') {
    const node = generateWorld(state.seed).items.find(n => n.id === target.id)!;
    if (node.requires && !p.tools.includes(node.requires)) { announce(state, target.label + '. Open Craft to make one.'); return; }
    let yieldAmount = 1;
    if (['wood', 'fiber'].includes(node.kind)) yieldAmount = p.tools.includes('copperAxe') ? 4 : p.tools.includes('axe') ? 2 : 1;
    if (['stone', 'clay', 'sand', 'copper', 'iron', 'crystal'].includes(node.kind)) yieldAmount = p.tools.includes('ironPickaxe') ? 3 : p.tools.includes('pickaxe') ? 2 : 1;
    grant(state, { [node.kind]: yieldAmount }); state.depleted[node.id] = state.time + node.respawn; state.harvests++;
    announce(state, `+${yieldAmount} ${ITEM_LABELS[node.kind].toLowerCase()}. This resource renews in ${node.respawn}s.`); return;
  }
  if (target.type === 'crop') {
    const crop = state.crops.find(c => c.id === target.id)!;
    grant(state, { [crop.kind]: CROPS[crop.kind].yield, seed: 2 }); state.crops = state.crops.filter(c => c.id !== crop.id); state.harvests++;
    announce(state, `Harvested ${CROPS[crop.kind].name.toLowerCase()} and 2 seeds. Plant again to keep growing.`); return;
  }
  if (target.type === 'fish') {
    if (!p.tools.includes('rod')) { announce(state, 'Craft a fishing rod from wood and fiber. No bait needed.'); return; }
    if (!p.fishing) { p.fishing = { biteAt: state.time + 3, endsAt: state.time + 8 }; announce(state, 'Line cast. Wait for a bite, then press E. Moving cancels fishing.'); return; }
    if (state.time < p.fishing.biteAt) { announce(state, 'Not yet. Wait for the bobber to dip.'); return; }
    const biome = biomeAt(p.x, p.z, state.seed), kind = biome === 'highland' || biome === 'snow' ? 'trout' : 'fish';
    state.catches++;
    const pearl = state.catches % 3 === 0;
    grant(state, { [kind]: 1, ...(pearl ? { pearl: 1 } : {}) }); state.harvests++; p.fishing = null;
    announce(state, `Caught ${ITEM_LABELS[kind].toLowerCase()}!${pearl ? ' A pearl came up with it.' : ' Every third catch brings a pearl.'}`);
  }
}
export function sandboxAction(state: GameState, id: PlayerId, command: SandboxCommand): void {
  const p = beginAction(state, id); if (!p) return;
  if (command.type === 'craft') {
    const recipe = TOOLS.find(t => t.id === command.tool); if (!recipe) return;
    if (p.tools.includes(recipe.id)) { announce(state, 'You already own this tool. Tools never break.'); return; }
    if (recipe.requires && !p.tools.includes(recipe.requires)) { announce(state, `Craft the ${TOOLS.find(t => t.id === recipe.requires)!.name.toLowerCase()} first.`); return; }
    if (!canAfford(state, recipe.cost)) { announce(state, 'Not enough materials. Every raw resource grows back.'); return; }
    pay(state, recipe.cost); p.tools.push(recipe.id); announce(state, `${p.profile.name} crafted a ${recipe.name.toLowerCase()}.`); return;
  }
  if (command.type === 'build') {
    if (!BUILDINGS.some(b => b.id === command.kind)) return;
    const problem = placementIssue(state, p, command.kind); if (problem) { announce(state, problem); return; }
    const def = buildingDefinition(command.kind); if (!canAfford(state, def.cost)) { announce(state, 'Gather the missing materials before building.'); return; }
    pay(state, def.cost); state.buildings.push({ id: `building-${state.nextId++}`, kind: command.kind, ...buildPosition(p) });
    announce(state, `${def.name} built. Walk to the front door and press E to enter.`); return;
  }
  if (command.type === 'plant') {
    if (p.location || !p.tools.includes('hoe')) { announce(state, 'Take a garden hoe outside to plant.'); return; }
    if (state.crops.length >= 200) { announce(state, 'Harvest some crops before planting more.'); return; }
    const x = Math.round((p.x + Math.sin(p.angle) * 2.5) / 2) * 2, z = Math.round((p.z + Math.cos(p.angle) * 2.5) / 2) * 2;
    if (!insideWorld(x, z, 2) || !['meadow', 'forest'].includes(biomeAt(x, z, state.seed)) || isWater(x, z, state.seed) ||
      state.buildings.some(b => buildingContains(b, x, z, 2)) || state.crops.some(c => distance(c, { x, z }) < 1.9) ||
      generateWorld(state.seed).items.some(n => distance(n, { x, z }) < 1.6)) { announce(state, 'Find open meadow or forest soil. Leave room around crops and resources.'); return; }
    if (!canAfford(state, { seed: 1 })) { announce(state, 'Gather wild seeds in meadows or forests. They always grow back.'); return; }
    pay(state, { seed: 1 }); state.crops.push({ id: `crop-${state.nextId++}`, kind: command.crop, x, z, plantedAt: state.time });
    announce(state, `${CROPS[command.crop].name} planted. Ready in ${CROP_SECONDS}s; rain and river mist do the watering.`); return;
  }
  if (command.type === 'dismantle') {
    if (p.location) { announce(state, 'Go outside to dismantle a building.'); return; }
    const b = state.buildings.find(b => distance(p, entrance(b)) <= INTERACT_RADIUS); if (!b) { announce(state, 'Stand by the front door of the building to dismantle.'); return; }
    if (Object.values(state.players).some(other => other?.location?.buildingId === b.id)) { announce(state, 'Someone is inside. Both players must leave before dismantling.'); return; }
    grant(state, buildingDefinition(b.kind).cost); state.buildings = state.buildings.filter(other => other.id !== b.id);
    announce(state, 'Building dismantled. All construction materials returned to the shared bag.');
  }
}
/** Host-owned simulation; no DOM, rendering, transport or client-supplied positions. */
export class GameEngine {
  readonly state: GameState;
  private inputs: Record<PlayerId, { value: MoveInput; at: number }> = { p1: { value: { x: 0, z: 0 }, at: 0 }, p2: { value: { x: 0, z: 0 }, at: 0 } };
  constructor(seed = 7241) { this.state = initialState(seed); }
  addPlayer(id: PlayerId, profile: Profile): void {
    const p = this.state.players[id];
    if (p && this.state.phase !== 'lobby') { p.profile = profile; p.connected = true; p.moving = false; p.fishing = null; this.setInput(id, { x: 0, z: 0 }); announce(this.state, `${profile.name} is back. Your world is just as you left it.`); }
    else this.state.players[id] = makePlayer(id, profile);
  }
  disconnect(id: PlayerId): void {
    const p = this.state.players[id]; if (p) { p.connected = false; p.ready = false; p.moving = false; p.fishing = null; }
    for (const key of ['p1', 'p2'] as const) { this.setInput(key, { x: 0, z: 0 }); const player = this.state.players[key]; if (player) player.moving = false; }
    announce(this.state, 'Your friend disconnected. The world is paused until they return.');
  }
  setInput(id: PlayerId, value: MoveInput): void { this.inputs[id] = { value, at: this.state.time }; }
  ready(id: PlayerId, value: boolean): void { setReady(this.state, id, value); }
  interact(id: PlayerId): void { interact(this.state, id); }
  action(id: PlayerId, command: SandboxCommand): void { sandboxAction(this.state, id, command); }
  emote(id: PlayerId): void { const p = this.state.players[id]; if (p && p.emoteUntil <= this.state.time) p.emoteUntil = this.state.time + 2.5; }
  tick(dt: number): void {
    if (this.state.phase === 'lobby' || !bothConnected(this.state)) return;
    this.state.time += Math.min(Math.max(dt, 0), 0.1);
    for (const [id, until] of Object.entries(this.state.depleted)) if (until <= this.state.time) {
      const node = generateWorld(this.state.seed).items.find(n => n.id === id);
      const occupied = node && Object.values(this.state.players).some(p => p && !p.location && distance(p, node) < 1.2);
      if (occupied) this.state.depleted[id] = this.state.time + 1;
      else delete this.state.depleted[id];
    }
    for (const id of ['p1', 'p2'] as const) {
      const p = this.state.players[id]; if (!p) continue;
      if (p.fishing && this.state.time > p.fishing.endsAt) { p.fishing = null; announce(this.state, 'The fish slipped away. Cast again whenever you like.'); }
      const input = this.inputs[id]; movePlayer(p, this.state.time - input.at > 0.4 ? { x: 0, z: 0 } : input.value, dt, this.state);
    }
  }
}
