import { buildingDefinition, roomFurniture } from '../game/content';
import { nodeCovered } from '../game/engine';
import { BIOMES, biomeAt, generateWorld, isWater } from '../game/geography';
import type { GameState, PlayerId } from '../game/schema';
const backgrounds = new Map<number, HTMLCanvasElement>();
function background(seed: number): HTMLCanvasElement {
  const cached = backgrounds.get(seed); if (cached) return cached;
  const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 220;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < 220; x += 2) for (let y = 0; y < 220; y += 2) {
    const wx = x / 220 * 256 - 128, wz = y / 220 * 256 - 128;
    ctx.fillStyle = isWater(wx, wz, seed) ? '#6ea8a4' : BIOMES[biomeAt(wx, wz, seed)].color; ctx.fillRect(x, y, 2, 2);
  }
  if (backgrounds.size >= 3) backgrounds.delete(backgrounds.keys().next().value!);
  backgrounds.set(seed, canvas); return canvas;
}
export function drawMinimap(canvas: HTMLCanvasElement, state: GameState, localId: PlayerId): void {
  const ctx = canvas.getContext('2d'), local = state.players[localId]; if (!ctx || !local) return;
  const size = canvas.width, half = size / 2, indoors = !!local.location, scale = indoors ? size / 15 : size / 256;
  const point = (x: number, z: number): [number, number] => [half + x * scale, half + z * scale];
  ctx.clearRect(0, 0, size, size);
  if (indoors && local.location) {
    ctx.fillStyle = '#354b41'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#d4bc92'; ctx.fillRect(...point(-6, -5), 12 * scale, 10 * scale);
    const b = state.buildings.find(b => b.id === local.location!.buildingId);
    if (b) for (const f of roomFurniture(buildingDefinition(b.kind).rooms[local.location.room])) { ctx.fillStyle = '#8d8267'; ctx.fillRect(...point(f.x - f.width / 2, f.z - f.depth / 2), f.width * scale, f.depth * scale); }
    ctx.fillStyle = '#739b86'; ctx.fillRect(...point(-1, 4.5), 2 * scale, 0.5 * scale);
    if (local.location.room > 0) ctx.fillRect(...point(-6, -0.8), 0.5 * scale, 1.6 * scale);
    if (b && local.location.room < buildingDefinition(b.kind).rooms.length - 1) ctx.fillRect(...point(5.5, -0.8), 0.5 * scale, 1.6 * scale);
  } else {
    ctx.drawImage(background(state.seed), 0, 0, size, size);
    for (const n of generateWorld(state.seed).items) if (!state.depleted[n.id] && !nodeCovered(state, n) && Math.hypot(n.x - local.x, n.z - local.z) < 24) { ctx.fillStyle = '#fff0ba'; ctx.beginPath(); ctx.arc(...point(n.x, n.z), 1.5, 0, Math.PI * 2); ctx.fill(); }
    for (const b of state.buildings) { const [x, y] = point(b.x, b.z); ctx.fillStyle = '#3a5a43'; ctx.fillRect(x - 2.5, y - 2.5, 5, 5); }
    ctx.fillStyle = '#36543e'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('N', half - 4, 15);
  }
  for (const id of ['p1', 'p2'] as const) {
    const p = state.players[id]; if (!p?.connected) continue;
    if (indoors && (p.location?.buildingId !== local.location?.buildingId || p.location?.room !== local.location?.room)) continue;
    const b = p.location && !indoors ? state.buildings.find(b => b.id === p.location!.buildingId) : null;
    const [x, y] = point(b?.x ?? p.x, b?.z ?? p.z);
    ctx.fillStyle = id === localId ? '#fff9e6' : '#df977b'; ctx.strokeStyle = '#33523e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}
