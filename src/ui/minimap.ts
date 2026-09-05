import { ITEMS, QUESTS, riverX } from '../game/content';
import type { GameState, PlayerId } from '../game/schema';
export function drawMinimap(canvas: HTMLCanvasElement, state: GameState, localId: PlayerId): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const size = canvas.width, scale = size / 59, half = size / 2;
  const p = (x: number, z: number): [number, number] => [half + x * scale, half + z * scale];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#b3d3bf'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#e6d3a3'; ctx.beginPath(); ctx.ellipse(half, half, 26 * scale, 23.4 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a3b675'; ctx.beginPath(); ctx.ellipse(half, half, 24 * scale, 21.6 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#78b7ac'; ctx.lineWidth = 3.3 * scale; ctx.beginPath();
  for (let z = -19; z <= 19; z++) { const [x, y] = p(riverX(z), z); if (z === -19) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  const quest = QUESTS[state.quest];
  if (quest) {
    for (const item of ITEMS) {
      if (item.kind !== quest.kind || state.collected.includes(item.id)) continue;
      ctx.fillStyle = '#fff3b5'; ctx.beginPath(); ctx.arc(...p(item.x, item.z), 2.3, 0, Math.PI * 2); ctx.fill();
    }
    const [qx, qy] = p(quest.x, quest.z); ctx.fillStyle = '#345c42'; ctx.save(); ctx.translate(qx, qy); ctx.rotate(Math.PI / 4); ctx.fillRect(-3.5, -3.5, 7, 7); ctx.restore();
  }
  for (const id of ['p1', 'p2'] as const) {
    const player = state.players[id]; if (!player?.connected) continue;
    ctx.fillStyle = id === localId ? '#fff9e6' : '#e79875'; ctx.strokeStyle = '#33523e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(...p(player.x, player.z), 4.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}
