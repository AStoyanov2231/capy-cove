import { INTERACT_RADIUS, ISLAND_RADIUS, ITEMS, ITEM_LABELS, QUESTS, SPAWNS, WALK_SPEED, distance, isWater } from './content';
import type { GameState, MoveInput, Player, PlayerId, Profile } from './schema';

export function initialState(): GameState {
  return { version: 1, phase: 'lobby', time: 0, players: { p1: null, p2: null }, collected: [], inventory: { orange: 0, seed: 0, stone: 0 }, quest: 0, activated: [], notice: '', noticeId: 0 };
}
export function makePlayer(id: PlayerId, profile: Profile): Player {
  return { id, profile, ...SPAWNS[id], angle: 0.6, connected: true, ready: false, moving: false, contributions: 0, emoteUntil: 0 };
}
export function bothConnected(state: GameState): boolean {
  return !!state.players.p1?.connected && !!state.players.p2?.connected;
}
export function announce(state: GameState, text: string): void {
  state.notice = text;
  state.noticeId++;
}
export function setReady(state: GameState, id: PlayerId, value: boolean): void {
  const player = state.players[id];
  if (!player || state.phase !== 'lobby') return;
  player.ready = value;
  if (bothConnected(state) && state.players.p1?.ready && state.players.p2?.ready) {
    state.phase = 'playing';
    announce(state, 'Welcome to your little island. Good things are better together.');
  }
}
export function movePlayer(player: Player, input: MoveInput, dt: number): void {
  const length = Math.hypot(input.x, input.z);
  player.moving = length > 0.05;
  if (!player.moving) return;
  const scale = WALK_SPEED * Math.min(dt, 0.1) * (isWater(player.x, player.z) ? 0.6 : 1) / Math.max(1, length);
  player.x += input.x * scale;
  player.z += input.z * scale;
  const radius = Math.hypot(player.x, player.z / 0.9);
  if (radius > ISLAND_RADIUS - 2) {
    player.x *= (ISLAND_RADIUS - 2) / radius;
    player.z *= (ISLAND_RADIUS - 2) / radius;
  }
  player.angle = Math.atan2(input.x, input.z);
}
export type Interaction = { type: 'item'; id: string; label: string } | { type: 'station'; label: string };
export function nearestInteraction(state: GameState, id: PlayerId): Interaction | null {
  const player = state.players[id];
  const quest = QUESTS[state.quest];
  if (!player || !quest || state.phase !== 'playing') return null;
  const nearest = ITEMS.filter(item => !state.collected.includes(item.id) && item.kind === quest.kind)
    .map(item => ({ item, d: distance(player, item) })).sort((a, b) => a.d - b.d)[0];
  if (nearest && nearest.d <= INTERACT_RADIUS) {
    return { type: 'item', id: nearest.item.id, label: `Collect ${nearest.item.kind === 'seed' ? 'seeds' : nearest.item.kind}` };
  }
  if (distance(player, quest) <= INTERACT_RADIUS + 1) return { type: 'station', label: quest.action };
  return null;
}
export function interact(state: GameState, id: PlayerId): void {
  if (!bothConnected(state)) return;
  const player = state.players[id];
  const quest = QUESTS[state.quest];
  const target = nearestInteraction(state, id);
  if (!player || !quest || !target) return;
  if (target.type === 'item') {
    state.collected.push(target.id);
    state.inventory[quest.kind]++;
    player.contributions++;
    announce(state, `${player.profile.name} found ${quest.kind === 'orange' ? 'an orange' : quest.kind === 'seed' ? 'some seeds' : 'a smooth stone'}!`);
    return;
  }
  if (state.inventory[quest.kind] < quest.amount) {
    announce(state, `A few more things first: ${state.inventory[quest.kind]}/${quest.amount} ${ITEM_LABELS[quest.kind]}.`);
    return;
  }
  if (player.contributions === 0) {
    announce(state, 'A little help from everyone: collect at least one item this quest.');
    return;
  }
  if (!state.activated.includes(id)) state.activated.push(id);
  if (state.activated.length < 2) {
    announce(state, 'Your part is done. Your friend needs to help here too!');
    return;
  }
  // Both capybaras must still be at the station when the second one acts.
  if (Object.values(state.players).some(p => !p || distance(p, quest) > INTERACT_RADIUS + 1)) {
    announce(state, 'Bring your friend closer. This moment is for both of you.');
    return;
  }
  state.inventory[quest.kind] -= quest.amount;
  state.quest++;
  state.activated = [];
  for (const p of Object.values(state.players)) if (p) p.contributions = 0;
  announce(state, `${quest.reward}. Made together.`);
  if (state.quest === QUESTS.length) state.phase = 'complete';
}

/** Deterministic host-owned rules. Rendering and transport never mutate these directly. */
export class GameEngine {
  readonly state = initialState();
  private inputs: Record<PlayerId, { value: MoveInput; at: number }> = {
    p1: { value: { x: 0, z: 0 }, at: 0 }, p2: { value: { x: 0, z: 0 }, at: 0 },
  };
  addPlayer(id: PlayerId, profile: Profile): void {
    const existing = this.state.players[id];
    if (existing && this.state.phase !== 'lobby') {
      existing.profile = profile;
      existing.connected = true;
      existing.moving = false;
      announce(this.state, `${profile.name} is back. Let the good day continue.`);
    } else this.state.players[id] = makePlayer(id, profile);
  }
  disconnect(id: PlayerId): void {
    const p = this.state.players[id];
    if (p) { p.connected = false; p.ready = false; p.moving = false; }
    this.setInput(id, { x: 0, z: 0 });
    announce(this.state, 'Your friend disconnected. The island is paused until they return.');
  }
  setInput(id: PlayerId, value: MoveInput): void { this.inputs[id] = { value, at: this.state.time }; }
  ready(id: PlayerId, value: boolean): void { setReady(this.state, id, value); }
  interact(id: PlayerId): void { interact(this.state, id); }
  emote(id: PlayerId): void {
    const p = this.state.players[id];
    if (p && p.emoteUntil <= this.state.time) p.emoteUntil = this.state.time + 2.5;
  }
  tick(dt: number): void {
    this.state.time += dt;
    for (const id of ['p1', 'p2'] as const) {
      const p = this.state.players[id];
      if (!p) continue;
      if (this.state.phase === 'lobby' || !bothConnected(this.state)) { p.moving = false; continue; }
      const input = this.inputs[id];
      movePlayer(p, this.state.time - input.at > 0.4 ? { x: 0, z: 0 } : input.value, dt);
    }
  }
}
