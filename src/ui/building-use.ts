import { BAG_CAPACITY, CONSTELLATIONS, CROP_SECONDS, CROPS, FISHING_SERVICE_INTERVAL, ITEM_LABELS, OBSERVE_RADIUS, OBSERVE_SECONDS, RECIPES, STATIONS, TOOLS, buildingDefinition, recipeDefinition, type Furniture, type RecipeDefinition } from '../game/content';
import { bagFits, bothConnected, canAfford, isNight, storageUsed, usableFurniture } from '../game/engine';
import { itemKindSchema, type Building, type GameState, type ItemKind, type PlayerId, type RecipeId, type SandboxCommand } from '../game/schema';
import { art } from './art';
import { escapeHtml as esc, icon, renderIcons } from './icons';
import { materialCost } from './workshop';

/** Local menus send intent only. Opening a menu never reserves or changes shared items. */
export class BuildingUseUI {
  private dialog: HTMLDialogElement | null = null;
  private state: GameState | null = null;
  private playerId: PlayerId = 'p1';
  private buildingId = '';
  private furnitureId = '';
  private selectedItem: ItemKind = 'wood';
  private selectedRecipe: RecipeId | null = null;
  private amount = 1;
  private signature = '';
  private lastFocus: HTMLElement | null = null;
  private mode = '';
  private dismissedActivity = '';
  constructor(private root: HTMLElement, private command: (command: SandboxCommand) => void) {}
  reset(): void { this.close(false); this.state = null; this.dismissedActivity = ''; }
  open(furnitureId: string): void {
    const state = this.state, p = state?.players[this.playerId]; if (!state || !p) return;
    const ctx = usableFurniture(state, p, furnitureId); if (!ctx) return;
    this.close(false);
    this.buildingId = ctx.building.id; this.furnitureId = furnitureId; this.mode = ctx.furniture.use!.type;
    const accepts = buildingDefinition(ctx.building.kind).storage.accepts;
    this.selectedItem = accepts?.[0] || 'wood'; this.selectedRecipe = null; this.amount = 1;
    this.lastFocus = document.activeElement as HTMLElement;
    this.dialog = document.createElement('dialog'); this.dialog.className = 'building-use'; this.dialog.setAttribute('aria-label', ctx.furniture.name);
    this.root.append(this.dialog);
    this.dialog.addEventListener('close', () => { if (this.dialog && !this.dialog.open) this.close(); });
    this.dialog.addEventListener('click', event => this.click(event));
    this.dialog.addEventListener('change', event => {
      const input = event.target as HTMLInputElement | HTMLSelectElement;
      if (input.name === 'storage-item') { this.selectedItem = itemKindSchema.parse(input.value); this.render(true); }
      if (input.name === 'transfer-amount') this.amount = Math.max(1, Math.min(9999, Math.floor(Number(input.value) || 1)));
      if (input.name === 'recipe') { this.selectedRecipe = input.value as RecipeId; this.render(true); }
    });
    this.render(true); this.dialog.showModal();
  }
  close(notify = true): void {
    const dialog = this.dialog; this.dialog = null;
    if (dialog) { dialog.close(); dialog.remove(); this.lastFocus?.focus(); }
    if (notify && (this.mode === 'bed' || this.mode === 'telescope')) {
      this.dismissedActivity = `${this.buildingId}:${this.furnitureId}`;
      this.command({ type: 'stop-use' });
    }
    this.mode = ''; this.signature = '';
  }
  update(state: GameState, id: PlayerId): void {
    this.state = state; this.playerId = id;
    const p = state.players[id];
    if (!p || !bothConnected(state)) { this.close(false); return; }
    const active = p.sky?.furnitureId || p.resting;
    if (!active) this.dismissedActivity = '';
    if (active && this.dismissedActivity !== `${p.location?.buildingId}:${active}` && !this.dialog && !document.querySelector('dialog[open]')) this.open(active);
    if (!this.dialog) return;
    if (p.location?.buildingId !== this.buildingId || !usableFurniture(state, p, this.furnitureId) || (this.mode === 'telescope' && !p.sky) || (this.mode === 'bed' && !p.resting)) { this.close(false); return; }
    this.render();
  }
  private output(recipe: RecipeDefinition): string {
    return recipe.tool || recipe.service ? `${art('tools', (recipe.tool || recipe.service)!)}<span>${TOOLS.find(t => t.id === (recipe.tool || recipe.service))!.name}${recipe.service ? ' repaired' : ''}</span>` : `<span>${Object.entries(recipe.output).map(([key, count]) => `${art('resources', key as ItemKind)}<b>+${count}</b>`).join('')}</span>`;
  }
  private render(force = false): void {
    const state = this.state, dialog = this.dialog, p = state?.players[this.playerId]; if (!state || !p || !dialog) return;
    const ctx = usableFurniture(state, p, this.furnitureId); if (!ctx) return;
    const { building, furniture } = ctx;
    const plot = building.plots.find(p => p.furnitureId === furniture.id);
    const signature = JSON.stringify([state.inventory, state.testMode, building.storage, building.jobs.map(j => [j.id, j.ready, Math.ceil(j.remaining)]), plot, plot && Math.floor((state.time - plot.plantedAt) / 2), p.tools, p.fishingGearWear, p.sky, p.sky && state.time - p.sky.alignedAt >= OBSERVE_SECONDS, state.discoveries, isNight(state)]);
    if (!force && signature === this.signature) return;
    // Preserve form values/focus through host snapshots, never replace a field while it is being edited.
    if (!force && dialog.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement?.tagName || '')) return;
    this.signature = signature;
    const focused = document.activeElement as HTMLElement, focusKey = focused?.dataset.useAction, focusName = focused?.getAttribute('name');
    const scroll = dialog.scrollTop, chartOpen = dialog.querySelector('details')?.open;
    const content = furniture.use?.type === 'storage' ? this.storage(building)
      : furniture.use?.type === 'station' ? this.station(building, furniture)
      : furniture.use?.type === 'plot' ? plot ? `<div class="plot-display">${art('resources', plot.kind)}<h3>${CROPS[plot.kind].name}</h3><progress aria-label="Crop growth" max="${CROP_SECONDS}" value="${Math.min(CROP_SECONDS, state.time - plot.plantedAt)}"></progress><button class="button primary" data-use-action="harvest" ${state.time - plot.plantedAt < CROP_SECONDS || !bagFits(state, { [plot.kind]: 3, seed: 2 }) ? 'disabled' : ''}>${state.time - plot.plantedAt < CROP_SECONDS ? 'Growing' : !bagFits(state, { [plot.kind]: 3, seed: 2 }) ? 'Bag full' : 'Harvest'}</button></div>`
        : `<p>One seed. Three crops and two seeds at harvest.</p><div class="plot-choices">${(['wheat', 'carrot'] as const).map(crop => `<button class="button secondary" data-use-action="plant-${crop}" ${!p.tools.includes('hoe') || !canAfford(state, { seed: 1 }) ? 'disabled' : ''}>${art('resources', crop)}Plant ${CROPS[crop].name.toLowerCase()}</button>`).join('')}</div>${!p.tools.includes('hoe') ? '<p>Craft a garden hoe first.</p>' : ''}`
      : furniture.use?.type === 'telescope' ? this.sky()
      : `<div class="bed-status">${art('buildings', 'home')}<p>${isNight(state) ? 'Waiting for your friend to rest in another bed.' : 'A quiet rest. Sleep together after sunset to skip the night.'}</p><button class="button primary" data-use-action="close">Get up</button></div>`;
    dialog.classList.toggle('sky-view', furniture.use?.type === 'telescope');
    dialog.innerHTML = `<header class="use-header"><h2>${esc(furniture.name)}</h2><button class="icon-button" data-use-action="close" aria-label="Close ${esc(furniture.name)}">${icon('x')}</button></header><div class="use-body">${content}</div>`;
    dialog.scrollTop = scroll;
    const chart = dialog.querySelector('details'); if (chart && chartOpen) chart.open = true;
    renderIcons();
    if (focusKey) dialog.querySelector<HTMLElement>(`[data-use-action="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
    else if (focusName) dialog.querySelector<HTMLElement>(`[name="${CSS.escape(focusName)}"]`)?.focus({ preventScroll: true });
  }
  private storage(building: Building): string {
    const state = this.state!, def = buildingDefinition(building.kind), kinds = def.storage.accepts || itemKindSchema.options;
    const stored = building.storage[this.selectedItem] || 0, have = state.inventory[this.selectedItem];
    return `<p class="use-summary">${storageUsed(building)} / ${def.storage.capacity} stored${def.storage.accepts ? ' · Farm food only' : ''}</p><label class="field-label" for="storage-item">Material</label><select id="storage-item" name="storage-item">${kinds.map(k => `<option value="${k}" ${k === this.selectedItem ? 'selected' : ''}>${ITEM_LABELS[k]} · ${building.storage[k] || 0} stored</option>`).join('')}</select><div class="storage-stock">${art('resources', this.selectedItem)}<span>Shared bag <b>${have}</b></span><span>Building <b>${stored}</b></span></div><label class="field-label" for="transfer-amount">Amount</label><input id="transfer-amount" name="transfer-amount" type="number" inputmode="numeric" min="1" max="9999" step="1" value="${this.amount}"/><div class="use-actions"><button class="button primary" data-use-action="deposit" ${!have || storageUsed(building) >= def.storage.capacity ? 'disabled' : ''}>Deposit</button><button class="button secondary" data-use-action="withdraw" ${!stored || have >= BAG_CAPACITY ? 'disabled' : ''}>Withdraw</button></div><p class="small-print">Shared by both players. Transfers are explicit; stations use the shared bag, not this store.</p>`;
  }
  private station(building: Building, furniture: Furniture): string {
    if (furniture.use?.type !== 'station') return '';
    const state = this.state!, p = state.players[this.playerId]!, kind = furniture.use.station, station = STATIONS[kind], recipes = RECIPES.filter(r => r.station === kind);
    const selected = recipes.find(r => r.id === this.selectedRecipe) || recipes[0]; this.selectedRecipe = selected.id;
    const jobs = building.jobs.filter(j => j.stationId === furniture.id);
    const owned = selected.tool && (p.tools.includes(selected.tool) || state.buildings.some(b => b.jobs.some(j => j.owner === this.playerId && recipeDefinition(j.recipe).tool === selected.tool)));
    const missingTool = selected.requires && !p.tools.includes(selected.requires);
    const serviceBlocked = selected.service && (p.fishingGearWear === 0 || state.buildings.some(b => b.jobs.some(j => j.owner === this.playerId && recipeDefinition(j.recipe).service === selected.service)));
    const issue = owned || serviceBlocked ? 'Owned, serviced or queued' : missingTool ? `Requires ${TOOLS.find(t => t.id === selected.requires)!.name.toLowerCase()}` : jobs.length >= station.queueLimit ? 'Queue full' : !canAfford(state, selected.cost) ? 'Missing materials' : null;
    return `<label class="field-label" for="station-recipe">Recipe</label><select id="station-recipe" name="recipe">${recipes.map(r => `<option value="${r.id}" ${r.id === selected.id ? 'selected' : ''}>${r.name}</option>`).join('')}</select>${materialCost(state, selected.cost)}<div class="recipe-output" aria-label="Produces">${icon('arrow-right')}${this.output(selected)}</div><button class="button primary" data-use-action="produce" ${issue ? 'disabled' : ''}>${issue || 'Start production'}</button>${kind === 'fishingBench' && p.tools.includes('fishingKit') ? `<p class="small-print">Fishing kit: ${FISHING_SERVICE_INTERVAL - p.fishingGearWear}/${FISHING_SERVICE_INTERVAL} double catches left. The starter rod never stops working.</p>` : ''}<section class="production-queue" aria-label="Station queue"><h3>Queue <span>${jobs.length}/${station.queueLimit}</span></h3><p class="small-print">${jobs.filter(j => j.ready).length}/${station.outputSlots} output slots. Work continues while you explore.</p>${jobs.length ? jobs.map(j => {
      const r = recipeDefinition(j.recipe), yours = !(r.tool || r.service) || j.owner === this.playerId, fits = r.tool || r.service || bagFits(state, r.output);
      return `<div class="production-job"><span>${r.name}${(r.tool || r.service) && !yours ? ' · Friend’s tool' : ''}</span>${j.ready ? `<button class="button secondary" data-use-action="collect" data-job="${j.id}" ${!yours || !fits ? 'disabled' : ''}>${!yours ? 'Reserved' : !fits ? 'Bag full' : 'Collect'}</button>` : j.remaining === 0 ? '<b>Output blocked</b>' : `<progress max="${r.seconds}" value="${r.seconds - j.remaining}" aria-label="${r.name} progress"></progress>`}</div>`;
    }).join('') : '<p class="small-print">Nothing in production.</p>'}</section>`;
  }
  private sky(): string {
    const state = this.state!, sky = state.players[this.playerId]!.sky!;
    const target = CONSTELLATIONS.find(c => c.id === sky.target), known = target && state.discoveries.includes(target.id), ready = target && state.time - sky.alignedAt >= OBSERVE_SECONDS;
    const sx = (x: number) => 300 + (x - sky.x) / .3 * 600, sy = (y: number) => 190 + (y - sky.y) / .19 * 380;
    const stars = Array.from({ length: 160 }, (_, i) => { const x = (Math.sin(i * 127.1) * 43758.5) % 1, y = (Math.sin(i * 311.7 + 8) * 19724.2) % 1; return `<circle cx="${sx(Math.abs(x))}" cy="${sy(Math.abs(y))}" r="${i % 4 ? .8 : 1.3}" fill="#b9d4dc" opacity=".5"/>`; }).join('');
    const clusters = CONSTELLATIONS.map(c => {
      const points = c.stars.map(([x, y]) => `${sx(c.x + x * .006)},${sy(c.y + y * .006)}`).join(' ');
      return `${state.discoveries.includes(c.id) || c.id === sky.target ? `<polyline points="${points}" fill="none" stroke="#dcbf78" stroke-width="1.3" opacity=".7"/>` : ''}${c.stars.map(([x, y]) => `<circle cx="${sx(c.x + x * .006)}" cy="${sy(c.y + y * .006)}" r="2.5" fill="#f7eac5"/>`).join('')}`;
    }).join('');
    return `<p class="small-print">Pan with the arrows or tap a star cluster to center it. Hold it in the reticle to record.</p><svg class="night-sky" data-sky="true" viewBox="0 0 600 380" role="img" aria-label="Telescope view of the night sky"><rect width="600" height="380" fill="#182f43"/>${stars}${clusters}<circle cx="300" cy="190" r="${OBSERVE_RADIUS / .3 * 600}" fill="none" stroke="#d6bb79" stroke-width="1"/><path d="M300 135v12m0 86v12m-55-55h12m86 0h12" stroke="#d6bb79"/></svg><div class="sky-controls" aria-label="Telescope direction">${[['left', 'Pan left'], ['up', 'Pan up'], ['down', 'Pan down'], ['right', 'Pan right']].map(([dir, label]) => `<button class="icon-button pan-${dir}" data-use-action="pan-${dir}" aria-label="${label}">${icon('arrow-right')}</button>`).join('')}<button class="button primary" data-use-action="record" ${!ready || known ? 'disabled' : ''}>${known ? `${target!.name} charted` : ready ? `Record ${target!.name}` : target ? 'Hold steady…' : 'Find a cluster'}</button></div><details class="star-journal"><summary>Star chart · ${state.discoveries.length}/12</summary><ul>${CONSTELLATIONS.map(c => `<li class="${state.discoveries.includes(c.id) ? 'charted' : ''}">${state.discoveries.includes(c.id) ? icon('check') : icon('minus')}${c.name}</li>`).join('')}</ul></details>`;
  }
  private click(event: MouseEvent): void {
    const state = this.state, p = state?.players[this.playerId]; if (!state || !p) return;
    const svg = (event.target as Element).closest<SVGSVGElement>('[data-sky]');
    if (svg && p.sky) {
      const rect = svg.getBoundingClientRect();
      this.aim(p.sky.x + ((event.clientX - rect.left) / rect.width - .5) * .3, p.sky.y + ((event.clientY - rect.top) / rect.height - .5) * .19); return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-use-action]'); if (!button || button.disabled) return;
    const action = button.dataset.useAction;
    if (action === 'close') { this.close(); return; }
    if (action === 'produce' && this.selectedRecipe) this.command({ type: 'produce', stationId: this.furnitureId, recipe: this.selectedRecipe });
    if (action === 'collect' && button.dataset.job) this.command({ type: 'collect', stationId: this.furnitureId, jobId: button.dataset.job });
    if (action === 'deposit' || action === 'withdraw') {
      const input = this.dialog?.querySelector<HTMLInputElement>('[name="transfer-amount"]'); if (!input?.reportValidity()) return;
      this.command({ type: 'transfer', furnitureId: this.furnitureId, direction: action, item: this.selectedItem, amount: Number(input.value) });
    }
    if (action === 'plant-wheat' || action === 'plant-carrot') this.command({ type: 'plot', furnitureId: this.furnitureId, action: 'plant', crop: action === 'plant-wheat' ? 'wheat' : 'carrot' });
    if (action === 'harvest') this.command({ type: 'plot', furnitureId: this.furnitureId, action: 'harvest', crop: 'wheat' });
    if (action === 'record' && p.sky?.target) this.command({ type: 'record', constellation: p.sky.target });
    if (action?.startsWith('pan-') && p.sky) this.aim(p.sky.x + (action === 'pan-left' ? -.025 : action === 'pan-right' ? .025 : 0), p.sky.y + (action === 'pan-up' ? -.025 : action === 'pan-down' ? .025 : 0));
  }
  private aim(x: number, y: number): void { this.command({ type: 'aim', x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }); }
}
