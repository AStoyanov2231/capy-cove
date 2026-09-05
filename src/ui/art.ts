import { escapeHtml } from './icons';
import type { BuildingKind, ItemKind, ToolKind } from '../game/schema';
export type ActionArt = 'craft' | 'build' | 'farm' | 'bag' | 'map' | 'heart';
export function art(group: 'resources' | 'tools' | 'buildings', name: ItemKind | ToolKind | BuildingKind | ActionArt | 'sprout', className = ''): string {
  return `<img class="game-art ${className}" src="${import.meta.env.BASE_URL}art/icons/${group}-${escapeHtml(name)}.webp" alt="" width="256" height="256" draggable="false" decoding="async" />`;
}
