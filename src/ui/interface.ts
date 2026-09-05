import { ITEM_LABELS, buildingDefinition } from '../game/content';
import { art } from './art';
import { panelDefaults, workshopMarkup, type Panel, type Selection } from './workshop';
import { bothConnected, canAfford, nearestInteraction, placementIssue } from '../game/engine';
import { BIOMES, biomeAt } from '../game/geography';
import { buildingKindSchema, cropKindSchema, toolKindSchema, profileSchema, type BuildingKind, type GameState, type PlayerId, type Profile, type SandboxCommand } from '../game/schema';
import { FUR_COLORS } from '../render/capybara';
import { drawMinimap } from './minimap';
import { escapeHtml as esc, icon, renderIcons } from './icons';

export interface UIEvents {
  preview: (profile: Profile) => void;
  connect: (profile: Profile) => void;
  ready: (value: boolean) => void;
  leave: () => void;
  retry: () => void;
  interact: () => void;
  emote: () => void;
  sound: () => Promise<boolean>;
  command: (command: SandboxCommand) => void;
  blueprint: (kind: BuildingKind | null) => void;
}
const defaultProfile: Profile = { name: 'Capy', gender: 'male', fur: 'honey', accessory: 'orange' };
export function savedProfile(): Profile {
  try { const value = profileSchema.safeParse(JSON.parse(localStorage.getItem('capycove-profile') || 'null')); return value.success ? value.data : { ...defaultProfile }; }
  catch { return { ...defaultProfile }; }
}
const capyMark = `<svg viewBox="0 0 48 40" class="capy-mark" fill="none" aria-hidden="true"><path d="M5 18 10 8h21l12 10v17H6Z" fill="currentColor"/><path d="M11 13V4h7v12m12-2V4h7v14" fill="currentColor"/><path d="M28 23h15v12H28Z" fill="#edce92"/><circle cx="23" cy="20" r="2" fill="#fff8e5"/><circle cx="38" cy="25" r="1.7" fill="#355440"/></svg>`;
export class GameUI {
  private profile = savedProfile();
  private state: GameState | null = null;
  private localId: PlayerId = 'p1';
  private screen = '';
  private signature = '';
  private soundOn = false;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private panel: Panel | null = null;
  private selection: Selection = 'axe';
  private mapExpanded = false;
  private panelSignature = '';
  private blueprint: BuildingKind | null = null;
  private invite = '';
  private lastFocus: HTMLElement | null = null;
  private room: string | null;
  constructor(private root: HTMLElement, room: string | null, private events: UIEvents) {
    this.room = room;
    root.addEventListener('click', event => this.click(event));
    root.addEventListener('input', event => {
      const target = event.target as HTMLInputElement;
      if (target.id === 'capy-name') this.profile.name = target.value;
    });
    root.addEventListener('submit', event => {
      if ((event.target as HTMLFormElement).id !== 'setup-form') return;
      event.preventDefault();
      this.profile.name = this.profile.name.trim() || 'Capy';
      try { localStorage.setItem('capycove-profile', JSON.stringify(this.profile)); } catch { /* Private mode may disallow storage. */ }
      this.events.connect({ ...this.profile });
    });
    window.addEventListener('keydown', event => {
      if (this.screen !== 'game' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
      const key = event.key.toLowerCase();
      if (key === 'escape') { this.closePanel(); this.selectBlueprint(null); this.toggleMap(false); }
      if (key === 'm') { event.preventDefault(); this.toggleMap(); }
      if (key === 'b' || key === 'c' || key === 'i' || key === 'g') { event.preventDefault(); this.openPanel(key === 'b' ? 'build' : key === 'c' ? 'craft' : key === 'g' ? 'farm' : 'bag'); }
    });
    this.showSetup();
  }
  get currentProfile(): Profile { return { ...this.profile }; }
  private toolbar(): string {
    if (this.screen === 'game') return `<div class="toolbar"><button class="icon-button" data-action="options" aria-label="Game menu" title="Game menu">${icon('settings-2')}</button></div>`;
    return `<div class="toolbar"><button class="icon-button" data-action="sound" aria-label="${this.soundOn ? 'Mute island sounds' : 'Enable island sounds'}" aria-pressed="${this.soundOn}">${icon(this.soundOn ? 'volume-2' : 'volume-x')}</button><button class="icon-button" data-action="help" aria-label="How to play">${icon('circle-help')}</button>${this.state ? `<button class="icon-button" data-action="leave" aria-label="Leave island">${icon('door-open')}</button>` : ''}</div>`;
  }
  private header(): string {
    return `<header class="topbar"><a class="brand" href="${location.pathname}" aria-label="Capy Cove home" data-action="home">${capyMark}<span>capy cove<span class="brand-dot">.</span></span></a>${this.toolbar()}</header>`;
  }
  showSetup(): void {
    this.state = null; this.screen = 'setup'; this.signature = ''; this.panel = null; this.blueprint = null; this.events.blueprint(null);
    this.root.className = 'setup-screen';
    this.root.innerHTML = `${this.header()}
      <section class="welcome" aria-labelledby="welcome-title">
        <h1 id="welcome-title">A wild world.<br>Make it <span>your own.</span></h1>
        <p class="intro">Gather. Grow. Build a little life.<br>An open world, made for two.</p>
        <form id="setup-form" class="character-form">
          <div class="form-heading"><h2>Make yourself at home.</h2>${icon('leaf')}</div>
          <label class="field-label" for="capy-name">Your capybara’s name</label>
          <input id="capy-name" name="name" maxlength="16" autocomplete="nickname" value="${esc(this.profile.name)}" required placeholder="A very good capy name" />
          <fieldset><legend>Choose your capybara</legend><div class="segmented">
            ${(['male', 'female'] as const).map(g => `<button type="button" data-gender="${g}" aria-pressed="${this.profile.gender === g}" class="${this.profile.gender === g ? 'selected' : ''}">${capyMark}${g === 'male' ? 'Male' : 'Female'}${this.profile.gender === g ? icon('check') : ''}</button>`).join('')}
          </div></fieldset>
          <div class="appearance"><fieldset><legend>Fur coat</legend><div class="swatches">${(Object.keys(FUR_COLORS) as Profile['fur'][]).map(f => `<button type="button" class="swatch ${this.profile.fur === f ? 'selected' : ''}" style="--fur:${FUR_COLORS[f]}" data-fur="${f}" aria-label="${f} fur" aria-pressed="${this.profile.fur === f}">${this.profile.fur === f ? icon('check') : ''}</button>`).join('')}</div></fieldset>
          <fieldset><legend>A little extra</legend><div class="accessories">${(['orange', 'flower', 'none'] as const).map(a => `<button type="button" data-accessory="${a}" class="accessory ${this.profile.accessory === a ? 'selected' : ''}" aria-label="${a === 'none' ? 'No accessory' : `${a} accessory`}" aria-pressed="${this.profile.accessory === a}">${a === 'orange' ? '<span class="orange-icon"></span>' : icon(a === 'flower' ? 'flower-2' : 'minus')}</button>`).join('')}</div></fieldset></div>
          <button class="button primary create-button" type="submit">${this.room ? 'Join your friend’s island' : 'Create an island'}${icon('arrow-right')}</button>
          <p class="form-note">${icon(this.room ? 'link' : 'users')}${this.room ? 'Your friend saved you a spot.' : 'Then invite your favorite person.'}</p>
        </form>
      </section>
      <div class="scene-caption"><span class="sun-stamp">${icon('sun')}</span><span>No rush. No worries.<br><strong>Just a very good day.</strong></span></div>
      <footer class="landing-footer"><span>${icon('users')}2 players</span><span>${icon('sprout')}A world of possibilities</span><span class="footer-right">No quests. Just possibilities.</span></footer>
      <div id="dialogs"></div>`;
    renderIcons(); this.events.preview(this.profile);
  }
  connecting(): void {
    const button = this.root.querySelector<HTMLButtonElement>('.create-button');
    if (button) { button.disabled = true; button.innerHTML = `${icon('loader-circle', 'spin')} Finding your little paradise…`; renderIcons(); }
    this.root.querySelectorAll<HTMLButtonElement | HTMLInputElement>('#setup-form button, #setup-form input').forEach(control => { control.disabled = true; });
  }
  setInvite(url: string): void { this.invite = url; }
  update(state: GameState, localId: PlayerId): void {
    this.state = state; this.localId = localId;
    if (state.phase === 'lobby') {
      const signature = JSON.stringify(state.players);
      if (this.screen !== 'lobby' || signature !== this.signature) { this.signature = signature; this.showLobby(); }
      return;
    }
    if (this.screen !== 'game') this.showGame();
    this.updateGame();
  }
  private showLobby(): void {
    if (!this.state) return;
    this.screen = 'lobby'; this.root.className = 'lobby-screen';
    const players = this.state.players, local = players[this.localId]!;
    const count = Object.values(players).filter(p => p?.connected).length;
    const focusAction = (document.activeElement as HTMLElement)?.dataset.action;
    this.root.innerHTML = `${this.header()}<section class="lobby-panel" aria-labelledby="lobby-title">
      <div class="connection-tag">${icon('radio')}Island open <span>${count}/2</span></div>
      <h1 id="lobby-title">${count === 2 ? 'Better together.' : 'Room for<br>one more.'}</h1>
      <p class="intro">${count === 2 ? 'Two capybaras. One very good adventure.<br>Get comfy, then both tap ready.' : 'Your capybara is ready for company.<br>Send this little escape to a friend.'}</p>
      <div class="roster">${(['p1', 'p2'] as const).map(id => {
        const p = players[id];
        return `<div class="roster-player ${!p?.connected ? 'waiting' : ''}"><span class="roster-avatar" style="color:${p ? FUR_COLORS[p.profile.fur] : '#97a38b'}">${capyMark}</span><div><strong>${p?.connected ? `${esc(p.profile.name)}${id === this.localId ? ' (you)' : ''}` : 'Your favorite person'}</strong><span>${p?.connected ? `${p.profile.gender === 'male' ? 'Male' : 'Female'} · ${p.profile.fur} coat` : 'Waiting for a friend…'}</span></div><span class="ready-state">${p?.connected ? icon(p.ready ? 'check-check' : 'check') : icon('users')}<span>${p?.connected ? p.ready ? 'Ready' : 'Joined' : '1 spot'}</span></span></div>`;
      }).join('')}</div>
      ${this.localId === 'p1' ? `<label class="field-label" for="invite-link">Your private invite link</label><div class="invite-field"><input id="invite-link" value="${esc(this.invite)}" readonly aria-label="Invite link" /><button class="icon-button" data-action="copy" aria-label="Copy invite link">${icon('copy')}</button></div>` : '<p class="joined-note">'+icon('link')+' You’re on your friend’s island.</p>'}
      <button class="button primary" data-action="ready">${icon(local.ready ? 'check-check' : 'leaf')}${local.ready ? 'Ready! Waiting for your friend' : 'I’m ready to explore'}${!local.ready ? icon('arrow-right') : ''}</button>
      <p class="form-note">${local.ready ? 'Tap again to change your ready status.' : 'You’ll arrive together when you’re both ready.'}</p>
      <p class="connection-note">Keep the host’s tab open. This island lives in this session.</p>
    </section><div class="scene-caption"><span class="sun-stamp">${icon('heart')}</span><span>A whole island.<br><strong>And your kind of company.</strong></span></div><div id="dialogs"></div>`;
    renderIcons();
    if (focusAction) this.root.querySelector<HTMLElement>(`[data-action="${focusAction}"]`)?.focus();
  }
  private showGame(): void {
    this.screen = 'game'; this.root.className = 'game-screen';
    this.root.innerHTML = `${this.header()}
      <section class="place-panel" aria-label="Your surroundings"><h2 id="place-title">Sunlit meadows</h2><span id="friend-location"></span></section>
      <aside class="map-panel" aria-label="World map"><button class="map-toggle" data-action="map" aria-label="Expand world map" aria-expanded="false"><canvas id="minimap" width="440" height="440" aria-label="Map showing biomes, resources, buildings, you and your friend"></canvas></button></aside>
      <div id="connection-banner" class="connection-banner" role="status" hidden>${icon('radio')}Your friend disconnected. The world is paused.<button data-action="copy">Copy invite</button></div>
      <div id="player-labels" aria-hidden="true"><div id="label-p1" class="player-label"></div><div id="label-p2" class="player-label"></div></div>
      <nav class="sandbox-tools" aria-label="Sandbox tools">${(['craft', 'build', 'farm', 'bag'] as const).map((p, i) => `<button data-panel="${p}" aria-label="${p[0].toUpperCase() + p.slice(1)}" data-tooltip="${p[0].toUpperCase() + p.slice(1)} (${['C', 'B', 'G', 'I'][i]})" aria-expanded="false" aria-controls="sandbox-panel">${art('tools', p)}</button>`).join('')}</nav>
      <aside class="inventory" aria-label="Shared backpack">${(['wood', 'stone', 'seed', 'orange'] as const).map(kind => `<span title="${ITEM_LABELS[kind]}" aria-label="${ITEM_LABELS[kind]}">${art('resources', kind)}<b id="bag-${kind}">0</b></span>`).join('')}</aside>
      <section id="sandbox-panel" class="sandbox-panel" aria-label="Sandbox menu" hidden></section>
      <section id="build-placement" class="build-placement" aria-label="Building placement" hidden><div><strong id="blueprint-title"></strong><p id="blueprint-hint"></p></div><button class="button primary" data-action="place" id="place-button">Place building</button><button class="icon-button" data-action="cancel-build" aria-label="Cancel building placement">${icon('x')}</button></section>
      <div class="interaction-area" hidden><button id="interact-button" class="interact-button" data-action="interact" disabled><kbd>E</kbd><span id="interact-label"></span></button></div>
      <button class="emote-button icon-button" data-action="emote" aria-label="Send a heart (H)" title="Send a heart (H)">${art('tools', 'heart')}</button>
      <div class="touch-controls" aria-label="Movement controls"><button data-move="w" class="up" aria-label="Move up">${icon('arrow-right')}</button><button data-move="a" class="left" aria-label="Move left">${icon('arrow-right')}</button><span>${icon('leaf')}</span><button data-move="d" class="right" aria-label="Move right">${icon('arrow-right')}</button><button data-move="s" class="down" aria-label="Move down">${icon('arrow-right')}</button></div><div id="dialogs"></div>`;
    renderIcons();
  }
  private text(id: string, value: string): void { const element = document.getElementById(id); if (element && element.textContent !== value) element.textContent = value; }
  private updateGame(): void {
    const state = this.state!;
    const local = state.players[this.localId];
    if (!local) return;
    const building = local.location ? state.buildings.find(b => b.id === local.location!.buildingId) : null;
    const def = building ? buildingDefinition(building.kind) : null;
    const biome = BIOMES[biomeAt(local.x, local.z, state.seed)];
    this.text('place-title', def && local.location ? def.rooms[local.location.room].name : biome.name);
    const friend = state.players[this.localId === 'p1' ? 'p2' : 'p1'];
    const friendBuilding = friend?.location ? state.buildings.find(b => b.id === friend.location!.buildingId) : null;
    this.text('friend-location', friend?.profile.name || '');
    const friendStatus = document.getElementById('friend-location')!;
    friendStatus.title = friend ? `${friend.profile.name} · ${!friend.connected ? 'disconnected' : friendBuilding ? `inside ${buildingDefinition(friendBuilding.kind).name.toLowerCase()}` : 'outdoors'}` : '';
    friendStatus.setAttribute('aria-label', friendStatus.title);
    friendStatus.classList.toggle('offline', !friend?.connected);
    for (const kind of ['orange', 'seed', 'stone', 'wood'] as const) this.text(`bag-${kind}`, String(state.inventory[kind]));
    const interaction = nearestInteraction(state, this.localId);
    const interactButton = document.getElementById('interact-button') as HTMLButtonElement;
    const waiting = !!local.fishing && state.time < local.fishing.biteAt;
    interactButton.parentElement!.hidden = !interaction || !!this.panel || !!this.blueprint;
    interactButton.disabled = !interaction || !bothConnected(state) || waiting;
    interactButton.querySelector('kbd')!.hidden = waiting;
    interactButton.classList.toggle('fish-bite', !!local.fishing && !waiting);
    this.text('interact-label', waiting ? 'Waiting…' : interaction?.label || '');
    const banner = document.getElementById('connection-banner')!; banner.hidden = bothConnected(state);
    for (const id of ['p1', 'p2'] as const) {
      const p = state.players[id]; const label = document.getElementById(`label-${id}`)!;
      label.textContent = p?.connected && id !== this.localId ? p.profile.name : '';
      label.dataset.player = id;
      label.dataset.x = String(p?.x ?? 0); label.dataset.z = String(p?.z ?? 0);
      label.dataset.location = p?.location ? `${p.location.buildingId}:${p.location.room}` : 'outside';
      label.classList.toggle('is-you', id === this.localId);
    }
    drawMinimap(document.getElementById('minimap') as HTMLCanvasElement, state, this.localId);
    if (this.blueprint) {
      const def = buildingDefinition(this.blueprint), issue = placementIssue(state, local, this.blueprint);
      this.text('blueprint-title', def.name);
      this.text('blueprint-hint', issue || (!canAfford(state, def.cost) ? 'Missing materials' : 'Choose a clear spot'));
      (document.getElementById('place-button') as HTMLButtonElement).disabled = !!issue || !canAfford(state, def.cost) || !bothConnected(state);
    }
    const signature = JSON.stringify([state.inventory, local.tools, local.location, bothConnected(state), state.buildings.length, this.panel === 'build' && interaction?.type === 'enter' ? interaction.id : null]);
    if (this.panel && signature !== this.panelSignature) { this.panelSignature = signature; this.renderPanel(); }
  }
  positionLabels(project: (id: PlayerId) => { x: number; y: number } | null): void {
    if (this.screen !== 'game') return;
    for (const id of ['p1', 'p2'] as const) {
      const point = project(id), label = document.getElementById(`label-${id}`);
      if (label) { label.hidden = !point || id === this.localId; if (point) label.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`; }
    }
  }
  toast(message: string): void {
    const element = document.getElementById('toast')!;
    const amount = message.match(/^\+(\d+) /)?.[1];
    const resource = Object.entries(ITEM_LABELS).find(([, label]) => message.toLowerCase() === `+${amount} ${label.toLowerCase()}`);
    if (resource && amount) element.innerHTML = `${art('resources', resource[0] as keyof typeof ITEM_LABELS)}<b>+${amount}</b>`;
    else element.textContent = message;
    element.setAttribute('aria-label', message); element.classList.add('visible');
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => element.classList.remove('visible'), amount ? 1800 : 2800);
  }
  error(message: string): void {
    this.dialog(`<div class="dialog-symbol">${icon('link')}</div><h2>A little connection hiccup.</h2><p>${esc(message)}</p><button class="button primary" data-action="retry">${icon('rotate-ccw')}Try again</button><button class="button secondary" data-action="exit">Back to the beach</button>`, 'Connection problem');
  }
  private dialog(content: string, label: string): void {
    const container = document.getElementById('dialogs')!;
    const existing = container.querySelector('dialog');
    if (existing?.open) existing.close();
    this.lastFocus = document.activeElement as HTMLElement;
    container.innerHTML = `<dialog aria-label="${esc(label)}"><button class="dialog-close icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('x')}</button>${content}</dialog>`;
    const dialog = container.querySelector('dialog')!;
    dialog.addEventListener('close', () => this.lastFocus?.focus());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    renderIcons(); dialog.showModal();
  }
  private showHelp(): void {
    this.dialog(`<h2>A little guidance</h2><dl class="controls-guide"><div><dt><kbd>W A S D</kbd> / arrows</dt><dd>Move</dd></div><div><dt><kbd>E</kbd> / <kbd>Space</kbd></dt><dd>Nearby action</dd></div><div><dt><kbd>C</kbd> <kbd>B</kbd> <kbd>G</kbd> <kbd>I</kbd></dt><dd>Craft · build · farm · bag</dd></div><div><dt><kbd>M</kbd> / mouse wheel</dt><dd>Map / zoom</dd></div></dl><p>Gather by hand. Craft tools. Plant seeds. Cast a line at the river. Resources return and tools never break.</p><p>On touch screens, use the direction pad and tap the nearby action.</p><p class="small-print">Keep the host tab open. This world is not saved when the host leaves.</p><button class="button primary" data-action="close-dialog">Back to the world</button>`, 'How to play');
  }
  private showOptions(): void {
    this.dialog(`<h2>A little breather</h2><button class="button secondary" data-action="sound" aria-label="${this.soundOn ? 'Mute island sounds' : 'Enable island sounds'}" aria-pressed="${this.soundOn}">${icon(this.soundOn ? 'volume-2' : 'volume-x')}Sound ${this.soundOn ? 'on' : 'off'}</button><button class="button secondary" data-action="help">${icon('circle-help')}How to play</button><button class="button secondary" data-action="leave">${icon('door-open')}Leave island</button><button class="button primary" data-action="close-dialog">Keep exploring</button>`, 'Game menu');
  }
  private toggleMap(value = !this.mapExpanded): void {
    this.mapExpanded = value; this.root.classList.toggle('map-expanded', value);
    const toggle = this.root.querySelector('.map-toggle');
    toggle?.setAttribute('aria-expanded', String(value)); toggle?.setAttribute('aria-label', value ? 'Collapse world map' : 'Expand world map');
  }
  private openPanel(panel: Panel): void {
    if (this.panel === panel) { this.closePanel(); return; }
    this.panel = panel; this.selection = panelDefaults[panel]; this.panelSignature = ''; this.selectBlueprint(null); this.toggleMap(false); this.renderPanel();
    this.root.classList.add('menu-open');
    this.root.querySelector<HTMLElement>('.interaction-area')!.hidden = true;
    this.root.querySelectorAll<HTMLElement>('[data-panel]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.panel === panel)));
    this.root.querySelector<HTMLElement>('#sandbox-panel h2')?.focus();
  }
  private closePanel(): void {
    const wasOpen = this.panel; this.panel = null; this.root.classList.remove('menu-open');
    const panel = document.getElementById('sandbox-panel'); if (panel) panel.hidden = true;
    this.root.querySelectorAll<HTMLElement>('[data-panel]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (wasOpen) this.root.querySelector<HTMLElement>(`[data-panel="${wasOpen}"]`)?.focus();
  }
  private selectBlueprint(kind: BuildingKind | null): void {
    this.blueprint = kind; this.events.blueprint(kind);
    const placement = document.getElementById('build-placement'); if (placement) placement.hidden = !kind;
    if (kind) { this.closePanel(); this.updateGame(); }
  }
  private renderPanel(): void {
    if (!this.panel || !this.state) return;
    const panel = document.getElementById('sandbox-panel')!;
    const scroll = panel.querySelector('.catalog-grid')?.scrollTop || 0;
    const focused = document.activeElement as HTMLElement;
    const selectedFocus = focused?.dataset.select;
    const actionFocus = focused?.dataset.tool ? '[data-tool]' : focused?.dataset.blueprint ? '[data-blueprint]' : focused?.dataset.crop ? '[data-crop]' : null;
    const titles = { craft: 'Craft', build: 'Build', farm: 'Grow', bag: 'Shared bag' };
    panel.hidden = false; panel.dataset.panelType = this.panel;
    panel.innerHTML = `<header class="panel-header">${art('tools', this.panel)}<h2 tabindex="-1">${titles[this.panel]}</h2><button class="icon-button" data-action="close-panel" aria-label="Close sandbox menu">${icon('x')}</button></header><div class="panel-body">${workshopMarkup(this.state, this.localId, this.panel, this.selection)}</div>`;
    panel.querySelector('.catalog-grid')!.scrollTop = scroll; renderIcons();
    if (selectedFocus) panel.querySelector<HTMLElement>(`[data-select="${CSS.escape(selectedFocus)}"]`)?.focus({ preventScroll: true });
    else if (actionFocus) panel.querySelector<HTMLElement>(actionFocus)?.focus({ preventScroll: true });
  }
  private async click(event: MouseEvent): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button, a[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (button instanceof HTMLButtonElement && button.disabled) return;
    if (button.dataset.select && this.panel) { this.selection = button.dataset.select as Selection; this.renderPanel(); return; }
    const panel = button.dataset.panel;
    if (panel === 'craft' || panel === 'build' || panel === 'farm' || panel === 'bag') { this.openPanel(panel); return; }
    const tool = toolKindSchema.safeParse(button.dataset.tool);
    if (tool.success) { this.events.command({ type: 'craft', tool: tool.data }); return; }
    const blueprint = buildingKindSchema.safeParse(button.dataset.blueprint);
    if (blueprint.success) { this.selectBlueprint(blueprint.data); return; }
    const crop = cropKindSchema.safeParse(button.dataset.crop);
    if (crop.success) { this.events.command({ type: 'plant', crop: crop.data }); this.closePanel(); return; }
    if (action === 'home') { event.preventDefault(); if (this.state) this.confirmLeave(); return; }
    if (button.dataset.gender || button.dataset.fur || button.dataset.accessory) {
      if (button.dataset.gender) this.profile.gender = button.dataset.gender as Profile['gender'];
      if (button.dataset.fur) this.profile.fur = button.dataset.fur as Profile['fur'];
      if (button.dataset.accessory) this.profile.accessory = button.dataset.accessory as Profile['accessory'];
      const selector = button.dataset.gender ? `[data-gender="${this.profile.gender}"]` : button.dataset.fur ? `[data-fur="${this.profile.fur}"]` : `[data-accessory="${this.profile.accessory}"]`;
      this.showSetup(); this.root.querySelector<HTMLElement>(selector)?.focus(); return;
    }
    switch (action) {
      case 'help': this.showHelp(); break;
      case 'options': this.showOptions(); break;
      case 'map': this.toggleMap(); break;
      case 'close-panel': this.closePanel(); break;
      case 'cancel-build': this.selectBlueprint(null); break;
      case 'place': if (this.blueprint) this.events.command({ type: 'build', kind: this.blueprint }); this.selectBlueprint(null); break;
      case 'confirm-dismantle': this.dialog('<h2>Dismantle this building?</h2><p>The building by your front paws will be removed. All construction materials return to the shared bag. No one can be inside.</p><button class="button primary" data-action="close-dialog">Keep building</button><button class="button secondary" data-action="dismantle">Dismantle and refund materials</button>', 'Dismantle building?'); break;
      case 'dismantle': this.root.querySelector('dialog')?.close(); this.events.command({ type: 'dismantle' }); this.closePanel(); break;
      case 'close-dialog': this.root.querySelector('dialog')?.close(); break;
      case 'sound':
        try { this.soundOn = await this.events.sound(); button.innerHTML = icon(this.soundOn ? 'volume-2' : 'volume-x') + (button.closest('dialog') ? `Sound ${this.soundOn ? 'on' : 'off'}` : ''); button.setAttribute('aria-label', this.soundOn ? 'Mute island sounds' : 'Enable island sounds'); button.setAttribute('aria-pressed', String(this.soundOn)); renderIcons(); }
        catch { this.toast('Audio is unavailable in this browser. The island is still lovely in silence.'); } break;
      case 'copy':
        try { await navigator.clipboard.writeText(this.invite); this.toast('Invite copied. Send a little paradise to your friend.'); }
        catch { const input = document.getElementById('invite-link') as HTMLInputElement | null; if (input) { input.focus(); input.select(); this.toast('Select and copy the invite link above.'); } else this.toast(`Invite link: ${this.invite}`); } break;
      case 'ready': this.events.ready(!this.state?.players[this.localId]?.ready); break;
      case 'leave': this.confirmLeave(); break;
      case 'exit': this.root.querySelector('dialog')?.close(); this.events.leave(); break;
      case 'retry': this.root.querySelector('dialog')?.close(); this.events.retry(); break;
      case 'interact': this.events.interact(); break;
      case 'emote': this.events.emote(); break;
    }
  }
  private confirmLeave(): void {
    this.dialog(`<div class="dialog-symbol">${icon('door-open')}</div><h2>Head back to the beach?</h2><p>${this.localId === 'p1' ? 'Leaving closes this island for both of you. Your adventure is not saved.' : 'Your friend’s island will pause. You can rejoin with the same invite while they keep it open.'}</p><button class="button primary" data-action="close-dialog">Stay on the island</button><button class="button secondary" data-action="exit">Leave island</button>`, 'Leave island?');
  }
  reset(clearRoom = false): void {
    if (clearRoom) this.room = null;
    this.showSetup();
  }
}
