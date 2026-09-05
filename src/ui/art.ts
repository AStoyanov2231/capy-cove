import { escapeHtml } from './icons';
import type { BuildingKind, ItemKind, ToolKind } from '../game/schema';
export type ActionArt = 'craft' | 'build' | 'farm' | 'bag' | 'map' | 'heart';
export function art(group: 'resources' | 'tools' | 'buildings', name: ItemKind | ToolKind | BuildingKind | ActionArt | 'sprout', className = ''): string {
  if (group === 'tools' && name === 'fishingKit') return art('tools', 'rod', className).replace('game-art ', 'game-art upgraded-art ');
  if (group === 'resources' && ['copperBar', 'ironBar', 'copperHead', 'ironHead', 'copperBlank', 'ironBlank', 'hook', 'net'].includes(name)) {
    const copper = name.startsWith('copper'), metal = copper ? '#ce9161' : '#9eafb4';
    const drawing = name === 'net' ? '<path d="M13 14h38v38H13z" fill="#dfcea0"/><path d="M22 14v38m10-38v38m10-38v38M13 24h38M13 34h38M13 44h38" stroke="#8a7553" stroke-width="3"/>'
      : name === 'hook' ? '<path d="M38 12v28c0 16-23 15-23 0l8 6" fill="none" stroke="#b3a477" stroke-width="7" stroke-linecap="round"/><circle cx="38" cy="12" r="5" fill="none" stroke="#e1d39e" stroke-width="3"/>'
      : name.endsWith('Bar') ? `<path d="M10 41l9-21h28l9 21-10 8H18z" fill="${metal}"/><path d="M19 20h28l-4 18H23z" fill="#e9dcc0" opacity=".55"/>`
      : `${name.endsWith('Blank') ? '<path d="M20 53l19-38" stroke="#a98455" stroke-width="8" stroke-linecap="round"/>' : ''}<path d="M15 17l18-6 19 9-7 21-15-8-12 7z" fill="${metal}"/><path d="M33 11l19 9-7 21-4-18z" fill="#e8dfcb" opacity=".5"/>`;
    return `<svg class="game-art ${className}" viewBox="0 0 64 64" aria-hidden="true">${drawing}</svg>`;
  }
  return `<img class="game-art ${className}" src="${import.meta.env.BASE_URL}art/icons/${group}-${escapeHtml(name)}.webp" alt="" width="256" height="256" draggable="false" decoding="async" />`;
}
