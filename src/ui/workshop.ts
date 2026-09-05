import { BUILDINGS, ITEM_LABELS, TOOLS, buildingDefinition, type Cost } from '../game/content';
import { bothConnected, canAfford, entrance } from '../game/engine';
import { distance } from '../game/content';
import { itemKindSchema, type BuildingKind, type CropKind, type GameState, type ItemKind, type PlayerId, type ToolKind } from '../game/schema';
import { art } from './art';
import { escapeHtml as esc, icon } from './icons';
export type Panel = 'craft' | 'build' | 'farm' | 'bag';
export type Selection = ItemKind | ToolKind | BuildingKind;
const sources: Record<ItemKind, string> = {
  orange: 'Meadows', seed: 'Meadows · Forests', stone: 'Meadows · Dunes · Highlands', wood: 'Meadows · Forests', fiber: 'Meadows · Forests · Wetlands',
  clay: 'Wetlands', sand: 'Amber dunes', copper: 'Forests · Amber dunes', iron: 'Highlands · Frostpine peaks', crystal: 'Highlands · Frostpine peaks',
  wheat: 'Grow from wild seeds', carrot: 'Grow from wild seeds', fish: 'Riverbanks', trout: 'Highland riverbanks', pearl: 'Every third fishing catch',
};
const effects: Record<ToolKind, string> = { axe: 'Double wood & fiber', pickaxe: 'Mine ore · double stone', hoe: 'Plant on meadow & forest soil', rod: 'Fish at riverbanks', copperAxe: 'Four wood & fiber per harvest', ironPickaxe: 'Mine crystal · triple ore' };
export const panelDefaults: Record<Panel, Selection> = { craft: 'axe', build: 'home', farm: 'wheat', bag: 'wood' };
export function materialCost(state: GameState, cost: Cost, output = false): string {
  return `<div class="material-cost" aria-label="${output ? 'Yield' : 'Materials required'}">${Object.entries(cost).map(([key, needed]) => {
    const kind = key as ItemKind, have = state.inventory[kind], missing = !output && !state.testMode && have < needed;
    const label = output ? `${needed} ${ITEM_LABELS[kind]}` : `${ITEM_LABELS[kind]}: ${state.testMode ? 'unlimited' : `${have} available, ${needed} needed`}`;
    return `<span class="cost-token ${missing ? 'is-missing' : ''}" title="${label}" aria-label="${label}">${art('resources', kind)}<b>${output ? `+${needed}` : state.testMode ? '∞' : `${have}<span>/${needed}</span>`}</b>${missing ? icon('minus') : ''}</span>`;
  }).join('')}</div>${state.testMode && !output ? '<span class="test-mode-note">Unlimited in builder test mode</span>' : ''}`;
}
export function workshopMarkup(state: GameState, id: PlayerId, panel: Panel, selection: Selection): string {
  const local = state.players[id]!, connected = bothConnected(state);
  const tile = (key: Selection, name: string, group: 'resources' | 'tools' | 'buildings', badge = '', owned = false) => `<button class="catalog-tile ${selection === key ? 'selected' : ''}" data-select="${key}" aria-label="${esc(name)}" aria-pressed="${selection === key}" title="${esc(name)}">${art(group, key)}${badge ? `<b class="tile-count">${badge}</b>` : ''}${owned ? `<span class="tile-owned" aria-label="Owned">${icon('check')}</span>` : ''}</button>`;
  let grid = '', detail = '', footer = '';
  if (panel === 'craft') {
    const selected = TOOLS.find(t => t.id === selection) || TOOLS[0];
    grid = TOOLS.map(t => tile(t.id, t.name, 'tools', '', local.tools.includes(t.id))).join('');
    const owned = local.tools.includes(selected.id), prerequisite = selected.requires && !local.tools.includes(selected.requires);
    detail = `${art('tools', selected.id, 'detail-art')}<h3>${selected.name}</h3><p>${effects[selected.id]}</p>${materialCost(state, selected.cost)}${prerequisite ? `<p class="requirement">${icon('link')}Requires ${TOOLS.find(t => t.id === selected.requires)!.name.toLowerCase()}</p>` : ''}<button class="button primary" data-tool="${selected.id}" aria-label="Craft ${selected.name.toLowerCase()}" ${owned || prerequisite || !canAfford(state, selected.cost) || !connected ? 'disabled' : ''}>${owned ? `${icon('check')}Owned` : !canAfford(state, selected.cost) ? 'Missing materials' : 'Craft'}</button>`;
  }
  if (panel === 'build') {
    const b = BUILDINGS.find(b => b.id === selection) || BUILDINGS[0];
    grid = BUILDINGS.map(b => tile(b.id, b.name, 'buildings')).join('');
    detail = `${art('buildings', b.id, 'detail-art')}<h3>${b.name}</h3><p>${b.rooms.length} furnished rooms${b.style === 'dock' ? ' · Riverbank' : ''}</p>${materialCost(state, b.cost)}<button class="button primary" data-blueprint="${b.id}" aria-label="Choose blueprint: ${b.name}" ${local.location || !connected ? 'disabled' : ''}>${local.location ? 'Build outdoors' : canAfford(state, b.cost) ? 'Place' : 'Preview'}</button>`;
    const nearby = !local.location && state.buildings.find(b => distance(local, entrance(b)) <= 2.5);
    if (nearby) footer = `<button class="text-action" data-action="confirm-dismantle">${icon('rotate-ccw')}Dismantle ${buildingDefinition(nearby.kind).name.toLowerCase()}</button>`;
  }
  if (panel === 'farm') {
    const crop: CropKind = selection === 'carrot' ? 'carrot' : 'wheat';
    grid = tile('wheat', 'Wheat', 'resources') + tile('carrot', 'Carrots', 'resources');
    const hasHoe = local.tools.includes('hoe');
    detail = `${art('resources', crop, 'detail-art')}<h3>${ITEM_LABELS[crop]}</h3>${materialCost(state, { seed: 1 })}<div class="harvest-yield">${icon('arrow-right')}${materialCost(state, { [crop]: 3, seed: 2 }, true)}</div>${!hasHoe ? '<p class="requirement">Garden hoe needed</p>' : '<p>Meadow or forest soil</p>'}<button class="button primary" data-crop="${crop}" aria-label="Plant ${crop === 'carrot' ? 'carrots' : crop}" ${!hasHoe || !state.inventory.seed || local.location || !connected ? 'disabled' : ''}>${local.location ? 'Plant outdoors' : 'Plant'}</button>`;
  }
  if (panel === 'bag') {
    const kind = itemKindSchema.options.includes(selection as ItemKind) ? selection as ItemKind : 'wood';
    grid = itemKindSchema.options.map(k => tile(k, `${ITEM_LABELS[k]}: ${state.inventory[k]}`, 'resources', String(state.inventory[k]))).join('');
    detail = `${art('resources', kind, 'detail-art')}<h3>${ITEM_LABELS[kind]}</h3><strong class="stock-amount" id="stock-${kind}">${state.inventory[kind]}</strong><p>${sources[kind]}</p><span class="shared-note">${icon('users')}Shared bag</span>`;
    footer = local.tools.length ? `<div class="owned-tools" aria-label="Your tools">${local.tools.map(t => `<span title="${TOOLS.find(tool => tool.id === t)!.name}">${art('tools', t)}</span>`).join('')}</div>` : '';
  }
  return `<div class="catalog-grid ${panel === 'build' ? 'building-grid' : ''}" aria-label="${panel} catalog">${grid}</div><section class="catalog-detail" aria-label="Selected item">${detail}</section>${footer ? `<footer class="catalog-footer">${footer}</footer>` : ''}`;
}
