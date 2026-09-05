import { describe, expect, it } from 'vitest';
import { GameEngine, interact, makePlayer, movePlayer, nearestInteraction, setReady } from '../src/game/engine';
import { ITEMS, QUESTS, WALK_SPEED, distance } from '../src/game/content';
import { guestMessageSchema, hostMessageSchema, type Profile } from '../src/game/schema';

const profile: Profile = { name: 'Mango', gender: 'male', fur: 'honey', accessory: 'orange' };
function game(): GameEngine {
  const engine = new GameEngine(); engine.addPlayer('p1', profile); engine.addPlayer('p2', { ...profile, name: 'Clover', gender: 'female' });
  engine.ready('p1', true); engine.ready('p2', true); return engine;
}
describe('cooperative game rules', () => {
  it('starts only when exactly two connected players are ready', () => {
    const engine = new GameEngine(); engine.addPlayer('p1', profile); engine.ready('p1', true);
    expect(engine.state.phase).toBe('lobby');
    engine.addPlayer('p2', profile); expect(engine.state.phase).toBe('lobby');
    engine.ready('p2', true); expect(engine.state.phase).toBe('playing');
    expect(distance(engine.state.players.p1!, engine.state.players.p2!)).toBe(2);
  });
  it('supports unreadying and does not start with a disconnected friend', () => {
    const engine = new GameEngine(); engine.addPlayer('p1', profile); engine.addPlayer('p2', profile);
    engine.ready('p1', true); engine.ready('p1', false); engine.ready('p2', true);
    expect(engine.state.phase).toBe('lobby'); engine.disconnect('p2'); setReady(engine.state, 'p1', true);
    expect(engine.state.phase).toBe('lobby');
  });
  it('normalizes diagonals, respects the coast, and slows swimming', () => {
    const p = makePlayer('p1', profile); p.x = 0; p.z = 0;
    movePlayer(p, { x: 1, z: 1 }, 0.1); expect(Math.hypot(p.x, p.z)).toBeCloseTo(WALK_SPEED * 0.1);
    for (let i = 0; i < 1000; i++) movePlayer(p, { x: 1, z: 0 }, 0.1);
    expect(Math.hypot(p.x, p.z / 0.9)).toBeLessThanOrEqual(24.0001);
    p.x = 14; p.z = 0; movePlayer(p, { x: 0, z: 1 }, 0.1); expect(p.z).toBeCloseTo(0.3);
  });
  it('prevents remote pickups, duplicate pickups, and future quest pickups', () => {
    const engine = game(), state = engine.state;
    state.players.p1!.x = 23; state.players.p1!.z = 0;
    expect(nearestInteraction(state, 'p1')).toBeNull(); interact(state, 'p1'); expect(state.collected).toHaveLength(0);
    Object.assign(state.players.p1!, ITEMS[0]); state.players.p1!.id = 'p1';
    interact(state, 'p1'); interact(state, 'p1'); expect(state.collected).toEqual([ITEMS[0].id]); expect(state.inventory.orange).toBe(1);
    const seed = ITEMS.find(i => i.kind === 'seed')!; state.players.p1!.x = seed.x; state.players.p1!.z = seed.z;
    interact(state, 'p1'); expect(state.inventory.seed).toBe(0);
  });
  it('requires both individual contributions and proximity at a station', () => {
    const state = game().state;
    state.inventory.orange = 6;
    for (const p of Object.values(state.players)) { p!.x = QUESTS[0].x; p!.z = QUESTS[0].z; }
    state.players.p1!.contributions = 6;
    interact(state, 'p1'); interact(state, 'p2'); expect(state.quest).toBe(0);
    state.players.p2!.contributions = 1; state.players.p1!.x = 22;
    interact(state, 'p2'); expect(state.quest).toBe(0);
    state.players.p1!.x = QUESTS[0].x; interact(state, 'p1'); expect(state.quest).toBe(1);
  });
  it('completes the entire adventure using shared items and both players', () => {
    const state = game().state;
    for (const [index, quest] of QUESTS.entries()) {
      const items = ITEMS.filter(i => i.kind === quest.kind).slice(0, quest.amount);
      items.forEach((item, i) => { const id = i % 2 === 0 ? 'p1' : 'p2'; state.players[id]!.x = item.x; state.players[id]!.z = item.z; interact(state, id); });
      expect(state.inventory[quest.kind]).toBe(quest.amount);
      for (const id of ['p1', 'p2'] as const) { state.players[id]!.x = quest.x; state.players[id]!.z = quest.z; }
      interact(state, 'p1'); expect(state.quest).toBe(index); interact(state, 'p2'); expect(state.quest).toBe(index + 1);
      expect(state.inventory[quest.kind]).toBe(0); expect(state.players.p1!.contributions).toBe(0);
    }
    expect(state.phase).toBe('complete'); expect(state.collected).toHaveLength(14);
    expect(hostMessageSchema.safeParse({ type: 'state', state }).success).toBe(true);
  });
  it('pauses on disconnect, stops stale movement, and preserves progress on rejoin', () => {
    const engine = game(); engine.setInput('p1', { x: 1, z: 0 }); engine.tick(0.1);
    const p = engine.state.players.p1!, first = p.x;
    for (let i = 0; i < 10; i++) engine.tick(0.1);
    const stopped = p.x; engine.tick(0.1); expect(p.x).toBe(stopped); expect(stopped).toBeGreaterThan(first);
    engine.state.inventory.orange = 2; engine.state.players.p2!.contributions = 1;
    engine.disconnect('p2'); engine.setInput('p1', { x: 1, z: 0 }); engine.tick(0.1); expect(p.x).toBe(stopped);
    engine.addPlayer('p2', profile); expect(engine.state.inventory.orange).toBe(2); expect(engine.state.players.p2!.contributions).toBe(1);
  });
  it('does not collect when a friend is offline', () => {
    const engine = game(); engine.disconnect('p2'); engine.state.players.p1!.x = ITEMS[0].x; engine.state.players.p1!.z = ITEMS[0].z;
    engine.interact('p1'); expect(engine.state.collected).toEqual([]);
  });
});
describe('untrusted wire protocol', () => {
  it.each([
    { type: 'input', input: { x: Infinity, z: 0 } }, { type: 'input', input: { x: 50, z: 0 } },
    { type: 'teleport', x: 1, z: 2 }, { type: 'hello', version: 2, profile },
    { type: 'hello', version: 1, profile: { ...profile, name: 'x'.repeat(17) } },
    { type: 'hello', version: 1, profile: { ...profile, gender: 'anything' } },
  ])('rejects invalid client message %j', msg => { expect(guestMessageSchema.safeParse(msg).success).toBe(false); });
  it('accepts valid cosmetic customization and rejects corrupted snapshots', () => {
    expect(guestMessageSchema.safeParse({ type: 'hello', version: 1, profile }).success).toBe(true);
    expect(hostMessageSchema.safeParse({ type: 'state', state: { ...game().state, quest: 999 } }).success).toBe(false);
  });
});
