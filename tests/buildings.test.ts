import { describe, expect, it } from 'vitest';
import { BAG_CAPACITY, BUILDINGS, CONSTELLATIONS, CROP_SECONDS, DAWN, DAY_SECONDS, FISHING_SERVICE_INTERVAL, OBSERVE_SECONDS, RECIPES, STATIONS, TOOLS, buildingDefinition, distance, furnitureAccess, furnitureBounds, rectContains, rectsOverlap, rotatePoint } from '../src/game/content';
import { GameEngine, buildingPoint, buildingRects, dayFraction, dismantleIssue, entrance, interact, isNight, placementIssue, sandboxAction, usableFurniture } from '../src/game/engine';
import { buildingKindSchema, guestMessageSchema, hostMessageSchema, type Building, type BuildingKind, type PlayerId, type Rotation, type SandboxCommand } from '../src/game/schema';

function game(): GameEngine {
  const engine = new GameEngine();
  for (const id of ['p1', 'p2'] as const) { engine.addPlayer(id, { name: id, gender: 'male', fur: 'honey', accessory: 'none' }); engine.ready(id, true); }
  return engine;
}
function add(engine: GameEngine, kind: BuildingKind, rotation: Rotation = 0): Building {
  const building: Building = { id: `fixture-${engine.state.buildings.length}`, kind, x: 0, z: 0, rotation, storage: {}, jobs: [], plots: [] };
  engine.state.buildings.push(building); return building;
}
function stand(engine: GameEngine, b: Building, furnitureId: string, id: PlayerId = 'p1'): void {
  const p = engine.state.players[id]!, f = buildingDefinition(b.kind).rooms[0].furniture.find(f => f.id === furnitureId)!;
  p.location = { buildingId: b.id, room: 0 }; Object.assign(p, furnitureAccess(f)); p.actionAt = 0;
}
function act(engine: GameEngine, command: SandboxCommand, id: PlayerId = 'p1'): void {
  engine.state.players[id]!.actionAt = 0; sandboxAction(engine.state, id, command);
}
function advance(engine: GameEngine, seconds: number): void { for (let i = 0; i < Math.ceil(seconds * 30); i++) engine.tick(1 / 30); }

describe('building catalog and geometry', () => {
  it('keeps exactly the approved catalog and a unique functional room for each', () => {
    expect(BUILDINGS.map(b => b.id)).toEqual(buildingKindSchema.options);
    expect(BUILDINGS.map(b => b.id)).toEqual(['home', 'farm', 'dock', 'greenhouse', 'smithy', 'observatory']);
    for (const b of BUILDINGS) {
      expect(b.rooms).toHaveLength(1);
      const room = b.rooms[0]; expect(new Set(room.furniture.map(f => f.id)).size).toBe(room.furniture.length);
      expect(room.furniture.some(f => f.use)).toBe(true);
      for (const f of room.furniture) {
        const r = furnitureBounds(f);
        expect(Math.abs(r.x) + r.width / 2).toBeLessThanOrEqual(room.width / 2);
        expect(Math.abs(r.z) + r.depth / 2).toBeLessThanOrEqual(room.depth / 2);
        if (f.use) {
          const access = furnitureAccess(f);
          expect(Math.abs(access.x)).toBeLessThan(room.width / 2 - .35);
          expect(Math.abs(access.z)).toBeLessThan(room.depth / 2 - .35);
          expect(room.furniture.some(other => other.solid && rectContains(furnitureBounds(other), access.x, access.z, .35))).toBe(false);
        }
      }
      const solids = room.furniture.filter(f => f.solid);
      for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) expect(rectsOverlap(furnitureBounds(solids[i]), furnitureBounds(solids[j]))).toBe(false);
    }
  });
  it('keeps all functional access points connected to the doorway', () => {
    for (const b of BUILDINGS) {
      const room = b.rooms[0], step = .25;
      const walkable = (x: number, z: number) => Math.abs(x) < room.width / 2 - .55 && Math.abs(z) < room.depth / 2 - .55 && !room.furniture.some(f => f.solid && rectContains(furnitureBounds(f), x, z, .35));
      const start = { x: 0, z: room.depth / 2 - 2 }, queue = [start], seen = new Set([`${start.x}:${start.z}`]);
      for (let i = 0; i < queue.length; i++) for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const x = queue[i].x + dx, z = queue[i].z + dz, key = `${x}:${z}`;
        if (seen.has(key) || !walkable(x, z)) continue;
        seen.add(key); queue.push({ x, z });
      }
      for (const f of room.furniture.filter(f => f.use)) expect(queue.some(p => distance(p, furnitureAccess(f)) < .4)).toBe(true);
    }
  });
  it.each([0, 90, 180, 270] as const)('rotates footprints, pier and door together at %i degrees', rotation => {
    const b = add(game(), 'dock', rotation), def = buildingDefinition('dock'), rects = buildingRects(b);
    expect(rects[0].width).toBe(rotation % 180 ? def.depth : def.width);
    expect(rects[0].depth).toBe(rotation % 180 ? def.width : def.depth);
    expect(entrance(b)).toEqual(rotatePoint({ x: 0, z: def.depth / 2 + 1.5 }, rotation));
    expect(buildingPoint(b, { x: 0, z: -5 })).toEqual(rotatePoint({ x: 0, z: -5 }, rotation));
    expect(rects[1].x).toBe(buildingPoint(b, def.exterior[0]).x);
    expect(rects[1].z).toBe(buildingPoint(b, def.exterior[0]).z);
  });
  it('uses rotated dimensions at world edges and retains placement authority', () => {
    const engine = game(), p = engine.state.players.p1!;
    p.x = 122; p.z = 40;
    expect(placementIssue(engine.state, p, 'home', 0)).toBeTruthy();
    expect(placementIssue(engine.state, p, 'home', 90)).not.toBe('Move farther from the world boundary.');
    act(engine, { type: 'build', kind: 'home', rotation: 0 }); expect(engine.state.buildings).toHaveLength(0);
    expect(placementIssue(engine.state, p, 'dock', 180)).toBeTruthy();
  });
  it('reaches all processed recipe inputs from renewable sources without building/tool cycles', () => {
    const reachable = new Set(['orange', 'seed', 'stone', 'wood', 'fiber', 'clay', 'sand', 'copper', 'iron', 'crystal', 'wheat', 'carrot', 'fish', 'trout', 'pearl']);
    for (let i = 0; i < RECIPES.length; i++) for (const recipe of RECIPES) if (Object.keys(recipe.cost).every(k => reachable.has(k))) Object.keys(recipe.output).forEach(k => reachable.add(k));
    for (const recipe of [...RECIPES, ...TOOLS]) for (const item of Object.keys(recipe.cost)) expect(reachable.has(item)).toBe(true);
    for (const b of BUILDINGS) for (const item of Object.keys(b.cost)) expect(reachable.has(item)).toBe(true);
  });
});

describe('authoritative local storage and production', () => {
  it('accepts farm food only, enforces range and makes transfers atomic', () => {
    const engine = game(), b = add(engine, 'farm'); engine.state.inventory.wheat = 20;
    act(engine, { type: 'transfer', furnitureId: 'food-crates', direction: 'deposit', item: 'wheat', amount: 10 }); expect(b.storage.wheat).toBeUndefined();
    stand(engine, b, 'food-crates');
    act(engine, { type: 'transfer', furnitureId: 'food-crates', direction: 'deposit', item: 'wood', amount: 1 }); expect(b.storage.wood).toBeUndefined();
    act(engine, { type: 'transfer', furnitureId: 'food-crates', direction: 'deposit', item: 'wheat', amount: 10 }); expect(b.storage.wheat).toBe(10); expect(engine.state.inventory.wheat).toBe(10);
    stand(engine, b, 'food-baskets', 'p2');
    act(engine, { type: 'transfer', furnitureId: 'food-baskets', direction: 'withdraw', item: 'wheat', amount: 11 }, 'p2'); expect(b.storage.wheat).toBe(10);
    engine.state.inventory.wheat = BAG_CAPACITY;
    act(engine, { type: 'transfer', furnitureId: 'food-baskets', direction: 'withdraw', item: 'wheat', amount: 1 }, 'p2'); expect(b.storage.wheat).toBe(10);
    engine.state.inventory.wheat = 0;
    act(engine, { type: 'transfer', furnitureId: 'food-baskets', direction: 'withdraw', item: 'wheat', amount: 10 }, 'p2'); expect(b.storage.wheat).toBe(0); expect(engine.state.inventory.wheat).toBe(10);
    b.storage.wheat = 2000;
    act(engine, { type: 'transfer', furnitureId: 'food-baskets', direction: 'deposit', item: 'wheat', amount: 1 }, 'p2'); expect(engine.state.inventory.wheat).toBe(10);
  });
  it('reserves inputs once, keeps bounded outputs and never spills into a full bag', () => {
    const engine = game(), b = add(engine, 'smithy'); Object.assign(engine.state.inventory, { copper: 20, wood: 20 });
    stand(engine, b, 'forge');
    for (let i = 0; i < 5; i++) act(engine, { type: 'produce', stationId: 'forge', recipe: 'smeltCopper' });
    expect(b.jobs).toHaveLength(STATIONS.forge.queueLimit); expect(engine.state.inventory.copper).toBe(12);
    engine.state.players.p1!.location = null; advance(engine, 70);
    expect(b.jobs.filter(j => j.ready)).toHaveLength(STATIONS.forge.outputSlots);
    expect(b.jobs[2].remaining).toBe(0); expect(b.jobs[3].remaining).toBe(12);
    engine.state.inventory.copperBar = BAG_CAPACITY;
    stand(engine, b, 'forge'); act(engine, { type: 'collect', stationId: 'forge', jobId: b.jobs[0].id }); expect(b.jobs).toHaveLength(4);
    engine.state.inventory.copperBar = 0;
    const first = b.jobs[0].id;
    act(engine, { type: 'collect', stationId: 'forge', jobId: first }); act(engine, { type: 'collect', stationId: 'forge', jobId: first });
    expect(engine.state.inventory.copperBar).toBe(1); expect(b.jobs).toHaveLength(3);
    advance(engine, .1); expect(b.jobs.filter(j => j.ready)).toHaveLength(2);
  });
  it('rejects wrong stations, remote collection, and duplicate personal tool jobs', () => {
    const engine = game(), b = add(engine, 'smithy'); engine.state.inventory.copperBlank = 2; engine.state.players.p1!.tools.push('axe');
    stand(engine, b, 'anvil'); act(engine, { type: 'produce', stationId: 'anvil', recipe: 'finishAxe' }); expect(b.jobs).toHaveLength(0);
    stand(engine, b, 'grindstone'); act(engine, { type: 'craft', tool: 'copperAxe' }); expect(engine.state.players.p1!.tools).not.toContain('copperAxe');
    act(engine, { type: 'produce', stationId: 'grindstone', recipe: 'finishAxe' }); act(engine, { type: 'produce', stationId: 'grindstone', recipe: 'finishAxe' }); expect(b.jobs).toHaveLength(1);
    advance(engine, 9); stand(engine, b, 'grindstone', 'p2');
    act(engine, { type: 'collect', stationId: 'grindstone', jobId: b.jobs[0].id }, 'p2'); expect(b.jobs).toHaveLength(1);
    act(engine, { type: 'collect', stationId: 'grindstone', jobId: b.jobs[0].id }); expect(engine.state.players.p1!.tools).toContain('copperAxe'); expect(b.jobs).toHaveLength(0);
  });
  it('services worn fishing gear through a personal, dock-only repair job', () => {
    const engine = game(), b = add(engine, 'dock'), p = engine.state.players.p1!;
    p.tools.push('rod', 'fishingKit'); p.fishingGearWear = FISHING_SERVICE_INTERVAL; engine.state.inventory.hook = 1;
    stand(engine, b, 'fishing-bench'); act(engine, { type: 'produce', stationId: 'fishing-bench', recipe: 'repairFishingKit' });
    expect(p.fishingGearWear).toBe(FISHING_SERVICE_INTERVAL); advance(engine, 9);
    act(engine, { type: 'collect', stationId: 'fishing-bench', jobId: b.jobs[0].id }); expect(p.fishingGearWear).toBe(0); expect(p.tools.filter(t => t === 'fishingKit')).toHaveLength(1);
  });
  it('does not teleport building storage into a recipe and pauses on disconnect', () => {
    const engine = game(), b = add(engine, 'smithy'); b.storage.copper = 20; stand(engine, b, 'forge');
    act(engine, { type: 'produce', stationId: 'forge', recipe: 'smeltCopper' }); expect(b.jobs).toHaveLength(0);
    engine.state.inventory.copper = 2; act(engine, { type: 'produce', stationId: 'forge', recipe: 'smeltCopper' });
    engine.disconnect('p2'); const before = b.jobs[0].remaining, clock = dayFraction(engine.state); advance(engine, 30);
    expect(b.jobs[0].remaining).toBe(before); expect(dayFraction(engine.state)).toBe(clock);
  });
});

describe('functional rooms and progression', () => {
  it('plants and harvests persistent greenhouse beds without discarding full-bag yields', () => {
    const engine = game(), b = add(engine, 'greenhouse'); engine.state.players.p1!.tools.push('hoe'); stand(engine, b, 'bed-0-0');
    act(engine, { type: 'plot', furnitureId: 'bed-0-0', action: 'plant', crop: 'carrot' });
    expect(b.plots).toHaveLength(1); expect(engine.state.inventory.seed).toBe(5);
    engine.state.players.p1!.location = null; advance(engine, CROP_SECONDS + 1); stand(engine, b, 'bed-0-0');
    engine.state.inventory.carrot = BAG_CAPACITY;
    act(engine, { type: 'plot', furnitureId: 'bed-0-0', action: 'harvest', crop: 'wheat' }); expect(b.plots).toHaveLength(1);
    engine.state.inventory.carrot = 0;
    act(engine, { type: 'plot', furnitureId: 'bed-0-0', action: 'harvest', crop: 'wheat' }); expect(b.plots).toHaveLength(0); expect(engine.state.inventory.carrot).toBe(3); expect(engine.state.inventory.seed).toBe(7);
  });
  it('requires two distinct occupied beds to skip night without advancing production clocks', () => {
    const engine = game(), b = add(engine, 'home'); engine.state.dayOffset = DAY_SECONDS * .8;
    stand(engine, b, 'bed-left'); interact(engine.state, 'p1'); stand(engine, b, 'bed-left', 'p2'); interact(engine.state, 'p2');
    expect(engine.state.players.p2!.resting).toBeNull(); advance(engine, .1); expect(isNight(engine.state)).toBe(true);
    stand(engine, b, 'bed-right', 'p2'); interact(engine.state, 'p2'); const time = engine.state.time;
    advance(engine, .1); expect(isNight(engine.state)).toBe(false); expect(dayFraction(engine.state)).toBeCloseTo(DAWN, 2); expect(engine.state.time - time).toBeLessThan(.2);
    expect(engine.state.players.p1!.resting).toBeNull();
  });
  it('requires telescope proximity, night and sustained alignment to record discoveries once', () => {
    const engine = game(), b = add(engine, 'observatory'), c = CONSTELLATIONS[0]; stand(engine, b, 'telescope'); interact(engine.state, 'p1'); expect(engine.state.players.p1!.sky).toBeNull();
    engine.state.dayOffset = DAY_SECONDS * .8; engine.state.players.p1!.actionAt = 0; interact(engine.state, 'p1');
    act(engine, { type: 'record', constellation: c.id }); expect(engine.state.discoveries).toHaveLength(0);
    act(engine, { type: 'aim', x: c.x, y: c.y }); act(engine, { type: 'record', constellation: c.id }); expect(engine.state.discoveries).toHaveLength(0);
    advance(engine, OBSERVE_SECONDS + .1); act(engine, { type: 'record', constellation: c.id }); act(engine, { type: 'record', constellation: c.id }); expect(engine.state.discoveries).toEqual([c.id]);
    engine.setInput('p1', { x: 1, z: 0 }); advance(engine, .1); expect(engine.state.players.p1!.sky).toBeNull();
    expect(usableFurniture(engine.state, engine.state.players.p2!, 'telescope')).toBeNull();
  });
  it('protects storage, crops, jobs, occupants and full refunds when dismantling', () => {
    const engine = game(), b = add(engine, 'greenhouse'); expect(dismantleIssue(engine.state, b)).toBeNull();
    b.storage.seed = 1; expect(dismantleIssue(engine.state, b)).toMatch(/storage/); b.storage = {};
    b.plots.push({ furnitureId: 'bed-0-0', kind: 'wheat', plantedAt: 0 }); expect(dismantleIssue(engine.state, b)).toMatch(/plot/); b.plots = [];
    stand(engine, b, 'bed-0-0'); expect(dismantleIssue(engine.state, b)).toMatch(/leave/); engine.state.players.p1!.location = null;
    engine.state.inventory.wood = BAG_CAPACITY; expect(dismantleIssue(engine.state, b)).toMatch(/refund/);
  });
  it('bounds new commands and validates snapshots with building-local state', () => {
    const engine = game(); add(engine, 'greenhouse', 270);
    expect(hostMessageSchema.safeParse({ type: 'state', state: engine.state }).success).toBe(true);
    for (const command of [{ type: 'build', kind: 'home', rotation: 45 }, { type: 'build', kind: 'home' }, { type: 'build', kind: 'removed-building', rotation: 0 }, { type: 'transfer', furnitureId: 'chest', item: 'wood', direction: 'withdraw', amount: -1 }, { type: 'aim', x: Infinity, y: 0 }, { type: 'produce', stationId: 'forge', recipe: 'cheat' }]) expect(guestMessageSchema.safeParse(command).success).toBe(false);
  });
});
