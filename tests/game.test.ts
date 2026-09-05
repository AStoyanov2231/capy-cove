import { describe, expect, it } from 'vitest';
import { GameEngine, buildPosition, entrance, interact, makePlayer, movePlayer, nearestInteraction, placementIssue, sandboxAction } from '../src/game/engine';
import { BUILDINGS, CROP_SECONDS, TOOLS, WALK_SPEED, buildingDefinition, roomFurniture } from '../src/game/content';
import { biomeAt, generateWorld, isWater, riverX, terrainHeight } from '../src/game/geography';
import { PROTOCOL_VERSION, guestMessageSchema, hostMessageSchema, type Profile } from '../src/game/schema';
const profile: Profile = { name: 'Mango', gender: 'male', fur: 'honey', accessory: 'orange' };
function game(seed = 7241): GameEngine {
  const engine = new GameEngine(seed); engine.addPlayer('p1', profile); engine.addPlayer('p2', { ...profile, name: 'Clover' });
  engine.ready('p1', true); engine.ready('p2', true); return engine;
}
function advance(engine: GameEngine, seconds: number): void { for (let i = 0; i < Math.ceil(seconds * 30); i++) engine.tick(1 / 30); }
describe('sandbox rules', () => {
  it('starts only with two connected, ready players', () => {
    const engine = new GameEngine(); engine.addPlayer('p1', profile); engine.ready('p1', true); expect(engine.state.phase).toBe('lobby');
    engine.addPlayer('p2', profile); engine.ready('p2', true); expect(engine.state.phase).toBe('playing');
  });
  it('gathers without quests, prevents duplicate harvests, and renews nodes', () => {
    const engine = game(), state = engine.state;
    expect(nearestInteraction(state, 'p1')?.type).toBe('item'); interact(state, 'p1');
    expect(state.inventory.orange).toBe(1); advance(engine, 0.4); interact(state, 'p1'); expect(state.inventory.orange).toBe(1);
    advance(engine, 26); interact(state, 'p1'); expect(state.inventory.orange).toBe(2);
  });
  it('offers reversible host builder test mode with unlimited material costs', () => {
    const engine = game(), state = engine.state, before = { ...state.inventory };
    engine.setTestMode(true);
    expect(state.testMode).toBe(true);
    expect(Object.values(state.inventory).every(amount => amount === 9999)).toBe(true);
    advance(engine, 0.4); sandboxAction(state, 'p1', { type: 'craft', tool: 'axe' });
    expect(state.players.p1!.tools).toContain('axe');
    expect(state.inventory).toEqual(Object.fromEntries(Object.keys(before).map(kind => [kind, 9999])));
    advance(engine, 0.4); sandboxAction(state, 'p1', { type: 'build', kind: 'home', rotation: 0 });
    expect(state.buildings).toHaveLength(1);
    engine.setTestMode(false);
    expect(state.testMode).toBe(false);
    expect(state.inventory).toEqual(before);
  });
  it('enforces proximity, tool prerequisites and per-player ownership', () => {
    const engine = game(), state = engine.state, p = state.players.p1!;
    const node = generateWorld(state.seed).items.find(n => n.kind === 'iron')!;
    Object.assign(p, { x: node.x, z: node.z }); interact(state, 'p1'); expect(state.inventory.iron).toBe(0);
    advance(engine, 0.4); sandboxAction(state, 'p1', { type: 'craft', tool: 'pickaxe' }); expect(p.tools).toContain('pickaxe'); expect(state.players.p2!.tools).not.toContain('pickaxe');
    advance(engine, 0.4); interact(state, 'p1'); expect(state.inventory.iron).toBe(2);
    const wood = state.inventory.wood; advance(engine, 0.4); sandboxAction(state, 'p1', { type: 'craft', tool: 'pickaxe' }); expect(state.inventory.wood).toBe(wood);
    advance(engine, 0.4); sandboxAction(state, 'p2', { type: 'craft', tool: 'ironPickaxe' }); expect(state.players.p2!.tools).not.toContain('ironPickaxe');
  });
  it('normalizes movement, respects the finite boundary, and slows swimming', () => {
    const state = game().state, p = makePlayer('p1', profile); p.x = 0; p.z = 0;
    movePlayer(p, { x: 1, z: 1 }, 0.1, state); expect(Math.hypot(p.x, p.z)).toBeCloseTo(WALK_SPEED * 0.1);
    p.x = 125; p.z = 0; movePlayer(p, { x: 1, z: 0 }, 0.1, state); expect(p.x).toBe(125);
    p.x = riverX(0, state.seed); p.z = 0; movePlayer(p, { x: 0, z: 1 }, 0.1, state); expect(p.z).toBeCloseTo(WALK_SPEED * 0.055);
  });
  it('builds, enters rooms independently, blocks furniture and refunds dismantling', () => {
    const engine = game(), state = engine.state, p = state.players.p1!, other = state.players.p2!;
    const before = { ...state.inventory }; expect(placementIssue(state, p, 'home')).toBeNull();
    sandboxAction(state, 'p1', { type: 'build', kind: 'home', rotation: 0 }); expect(state.buildings).toHaveLength(1);
    const b = state.buildings[0]; Object.assign(p, entrance(b)); advance(engine, 0.4); interact(state, 'p1');
    expect(p.location).toEqual({ buildingId: b.id, room: 0 }); expect(other.location).toBeNull();
    const previous = other.x; engine.setInput('p2', { x: 1, z: 0 }); engine.tick(0.1); expect(other.x).toBeGreaterThan(previous);
    expect(p.location?.room).toBe(0);
    const furniture = roomFurniture(buildingDefinition('home').rooms[0])[0];
    p.x = furniture.x; p.z = furniture.z + furniture.depth / 2 + 0.4;
    const oldZ = p.z; movePlayer(p, { x: 0, z: -1 }, 0.1, state); expect(p.z).toBe(oldZ);
    Object.assign(other, entrance(b)); sandboxAction(state, 'p2', { type: 'dismantle' }); expect(state.buildings).toHaveLength(1);
    Object.assign(p, { x: 0, z: 4 }); advance(engine, 0.4); interact(state, 'p1'); expect(p.location).toBeNull();
    advance(engine, 0.4); sandboxAction(state, 'p1', { type: 'dismantle' }); expect(state.buildings).toHaveLength(0); expect(state.inventory).toEqual(before);
  });
  it('rejects overlapping, unaffordable and non-waterfront construction', () => {
    const engine = game(), state = engine.state, p = state.players.p1!;
    sandboxAction(state, 'p1', { type: 'build', kind: 'home', rotation: 0 }); advance(engine, 0.4);
    const remaining = { ...state.inventory }; sandboxAction(state, 'p1', { type: 'build', kind: 'home', rotation: 0 }); expect(state.buildings).toHaveLength(1); expect(state.inventory).toEqual(remaining);
    Object.assign(p, { x: -30, z: 30 }); expect(placementIssue(state, p, 'dock')).toBeTruthy();
    state.inventory.wood = 0; sandboxAction(state, 'p1', { type: 'build', kind: 'observatory', rotation: 0 }); expect(state.buildings).toHaveLength(1);
    expect(buildPosition(p)).toEqual({ x: -30, z: 22 });
  });
  it('grows crops and returns more seeds than planting consumes', () => {
    const engine = game(), state = engine.state;
    sandboxAction(state, 'p2', { type: 'craft', tool: 'hoe' }); advance(engine, 0.4);
    const seeds = state.inventory.seed; sandboxAction(state, 'p2', { type: 'plant', crop: 'wheat' }); expect(state.crops).toHaveLength(1);
    const crop = state.crops[0]; Object.assign(state.players.p2!, { x: crop.x, z: crop.z });
    advance(engine, CROP_SECONDS + 1); interact(state, 'p2'); expect(state.inventory.wheat).toBe(3); expect(state.inventory.seed).toBe(seeds + 1); expect(state.crops).toHaveLength(0);
  });
  it('fishes with timed bites, no bait, renewable pearls, and cancellation on movement', () => {
    const engine = game(), state = engine.state, p = state.players.p1!;
    sandboxAction(state, 'p1', { type: 'craft', tool: 'rod' });
    const z = 20; Object.assign(p, { x: riverX(z, state.seed) + 4, z });
    for (let i = 0; i < 3; i++) { advance(engine, 0.4); interact(state, 'p1'); expect(p.fishing).not.toBeNull(); advance(engine, 3.1); interact(state, 'p1'); }
    expect(state.inventory.fish).toBe(3); expect(state.inventory.pearl).toBe(1);
    advance(engine, 0.4); interact(state, 'p1'); engine.setInput('p1', { x: 1, z: 0 }); engine.tick(0.1); expect(p.fishing).toBeNull();
  });
  it('pauses growth, resource timers and movement on disconnect and retains interior on rejoin', () => {
    const engine = game(), state = engine.state; state.players.p2!.tools.push('hoe');
    engine.interact('p1'); engine.disconnect('p2'); const time = state.time, x = state.players.p1!.x;
    engine.setInput('p1', { x: 1, z: 0 }); advance(engine, 30); expect(state.time).toBe(time); expect(state.players.p1!.x).toBe(x);
    engine.addPlayer('p2', profile); expect(state.players.p2!.tools).toContain('hoe'); expect(state.inventory.orange).toBe(1);
    advance(engine, 1); const stopped = state.players.p1!.x; advance(engine, 1); expect(state.players.p1!.x).toBe(stopped);
  });
});
describe('deterministic content and protocol', () => {
  it('varies seeds while guaranteeing every raw material, biome and furnished building', () => {
    expect(BUILDINGS).toHaveLength(6); expect(new Set(BUILDINGS.map(b => b.id)).size).toBe(6);
    for (const b of BUILDINGS) { expect(b.rooms).toHaveLength(1); expect(roomFurniture(b.rooms[0]).length).toBeGreaterThanOrEqual(6); }
    for (const seed of [1, 7241, 2000000000]) {
      const world = generateWorld(seed); expect(world).toEqual(generateWorld(seed));
      const kinds = new Set(world.items.map(n => n.kind));
      for (const k of ['wood', 'stone', 'fiber', 'seed', 'orange', 'sand', 'clay', 'iron', 'copper', 'crystal']) expect(kinds.has(k as never)).toBe(true);
      for (const recipe of TOOLS.filter(t => !t.station)) for (const k of Object.keys(recipe.cost)) expect(kinds.has(k as never)).toBe(true);
      expect(new Set(world.items.map(n => biomeAt(n.x, n.z, seed))).size).toBe(6);
      expect(world.items.every(n => !isWater(n.x, n.z, seed))).toBe(true);
      expect(Number.isFinite(terrainHeight(-120, -100, seed))).toBe(true);
    }
    expect(generateWorld(1).items).not.toEqual(generateWorld(2).items);
  });
  it.each([
    { type: 'input', input: { x: Infinity, z: 0 } }, { type: 'input', input: { x: 50, z: 0 } },
    { type: 'teleport', x: 1, z: 2 }, { type: 'hello', version: 1, profile },
    { type: 'build', kind: 'castle' }, { type: 'craft', tool: 'godAxe' }, { type: 'plant', crop: 'money' },
  ])('rejects invalid commands %j', message => expect(guestMessageSchema.safeParse(message).success).toBe(false));
  it('validates sandbox snapshots and the versioned handshake', () => {
    expect(guestMessageSchema.safeParse({ type: 'hello', version: PROTOCOL_VERSION, profile }).success).toBe(true);
    expect(hostMessageSchema.safeParse({ type: 'state', state: game().state }).success).toBe(true);
    expect(hostMessageSchema.safeParse({ type: 'state', state: { ...game().state, seed: -1 } }).success).toBe(false);
  });
});
