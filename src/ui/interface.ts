import { BUILDINGS, CROP_SECONDS, ITEM_COLORS, ITEM_LABELS, TOOLS, buildingDefinition, costLabel } from '../game/content';
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
  private panel: 'craft' | 'build' | 'farm' | 'bag' | null = null;
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
      if (key === 'escape') { this.closePanel(); this.selectBlueprint(null); }
      if (key === 'b' || key === 'c' || key === 'i' || key === 'g') { event.preventDefault(); this.openPanel(key === 'b' ? 'build' : key === 'c' ? 'craft' : key === 'g' ? 'farm' : 'bag'); }
    });
    this.showSetup();
  }
  get currentProfile(): Profile { return { ...this.profile }; }
  private toolbar(): string {
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
      <section class="place-panel" aria-label="Your surroundings"><h2 id="place-title">Sunlit meadows</h2><p id="place-description"></p><span id="friend-location"></span></section>
      <aside class="map-panel" aria-label="World map"><div class="map-heading"><span id="map-title">CAPY COVE</span>${icon('map')}</div><canvas id="minimap" width="220" height="220" aria-label="Map showing biomes, resources, buildings, you and your friend"></canvas><div class="map-legend"><span><i class="dot you"></i>You</span><span><i class="dot friend"></i>Friend</span><span><i class="dot destination"></i>Home</span></div><p id="world-coordinate"></p></aside>
      <div id="connection-banner" class="connection-banner" role="status" hidden>${icon('radio')}Your friend disconnected. The world is paused.<button data-action="copy">Copy invite</button></div>
      <div id="player-labels" aria-hidden="true"><div id="label-p1" class="player-label"></div><div id="label-p2" class="player-label"></div></div>
      <nav class="sandbox-tools" aria-label="Sandbox tools">${(['craft', 'build', 'farm', 'bag'] as const).map((p, i) => `<button data-panel="${p}" aria-expanded="false" aria-controls="sandbox-panel">${icon(['settings-2', 'plus', 'sprout', 'package'][i])}<span>${p[0].toUpperCase() + p.slice(1)}</span><kbd>${['C', 'B', 'G', 'I'][i]}</kbd></button>`).join('')}</nav>
      <aside class="inventory" aria-label="Shared backpack">${(['wood', 'stone', 'seed', 'orange'] as const).map(kind => `<span title="${ITEM_LABELS[kind]}"><i class="material-chip" style="--material:${ITEM_COLORS[kind]}"></i><span class="quick-label">${ITEM_LABELS[kind]}</span><b id="bag-${kind}">0</b></span>`).join('')}</aside>
      <section id="sandbox-panel" class="sandbox-panel" aria-label="Sandbox menu" hidden></section>
      <section id="build-placement" class="build-placement" aria-label="Building placement" hidden><div><strong id="blueprint-title"></strong><p id="blueprint-hint"></p></div><button class="button primary" data-action="place" id="place-button">Place building</button><button class="icon-button" data-action="cancel-build" aria-label="Cancel building placement">${icon('x')}</button></section>
      <div class="interaction-area"><button id="interact-button" class="interact-button" data-action="interact" disabled><kbd>E</kbd><span id="interact-label">Explore your surroundings</span></button><span class="desktop-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><span>Scroll to zoom</span></span></div>
      <button class="emote-button icon-button" data-action="emote" aria-label="Send a heart (H)">${icon('heart')}<kbd>H</kbd></button>
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
    this.text('place-description', def ? `${def.name} · Side doors connect rooms. The front doorway leads outside.` : biome.description);
    const friend = state.players[this.localId === 'p1' ? 'p2' : 'p1'];
    const friendBuilding = friend?.location ? state.buildings.find(b => b.id === friend.location!.buildingId) : null;
    this.text('friend-location', friend ? `${friend.profile.name} · ${!friend.connected ? 'disconnected' : friendBuilding ? `inside ${buildingDefinition(friendBuilding.kind).name.toLowerCase()}` : 'exploring outdoors'}` : 'Waiting for your friend');
    this.text('world-coordinate', local.location ? `Room ${local.location.room + 1} / ${def?.rooms.length}` : `${Math.round(local.x)}, ${Math.round(local.z)} · Seed ${state.seed}`);
    this.text('map-title', local.location ? 'ROOM MAP' : 'CAPY COVE');
    for (const kind of ['orange', 'seed', 'stone', 'wood'] as const) this.text(`bag-${kind}`, String(state.inventory[kind]));
    const interaction = nearestInteraction(state, this.localId);
    const interactButton = document.getElementById('interact-button') as HTMLButtonElement;
    interactButton.disabled = !interaction || !bothConnected(state) || !!(local.fishing && state.time < local.fishing.biteAt);
    interactButton.classList.toggle('fish-bite', !!local.fishing && state.time >= local.fishing.biteAt);
    this.text('interact-label', interaction?.label || (local.location ? 'Explore the room or approach a doorway' : 'Approach a resource, crop or riverbank'));
    const banner = document.getElementById('connection-banner')!; banner.hidden = bothConnected(state);
    for (const id of ['p1', 'p2'] as const) {
      const p = state.players[id]; const label = document.getElementById(`label-${id}`)!;
      label.textContent = p?.connected ? `${p.profile.name}${id === this.localId ? ' · you' : ''}` : '';
      label.dataset.player = id;
      label.dataset.x = String(p?.x ?? 0); label.dataset.z = String(p?.z ?? 0);
      label.dataset.location = p?.location ? `${p.location.buildingId}:${p.location.room}` : 'outside';
      label.classList.toggle('is-you', id === this.localId);
    }
    drawMinimap(document.getElementById('minimap') as HTMLCanvasElement, state, this.localId);
    if (this.blueprint) {
      const def = buildingDefinition(this.blueprint), issue = placementIssue(state, local, this.blueprint);
      this.text('blueprint-title', def.name);
      this.text('blueprint-hint', issue || (!canAfford(state, def.cost) ? `Need ${costLabel(def.cost)}` : 'Move to position the foundation north of you. Green means ready.'));
      (document.getElementById('place-button') as HTMLButtonElement).disabled = !!issue || !canAfford(state, def.cost) || !bothConnected(state);
    }
    const signature = JSON.stringify([state.inventory, local.tools, local.location, bothConnected(state), state.buildings.length]);
    if (this.panel && signature !== this.panelSignature) { this.panelSignature = signature; this.renderPanel(); }
  }
  positionLabels(project: (id: PlayerId) => { x: number; y: number } | null): void {
    if (this.screen !== 'game') return;
    for (const id of ['p1', 'p2'] as const) {
      const point = project(id), label = document.getElementById(`label-${id}`);
      if (label) { label.hidden = !point; if (point) label.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`; }
    }
  }
  toast(message: string): void {
    const element = document.getElementById('toast')!;
    element.textContent = message; element.classList.add('visible');
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => element.classList.remove('visible'), 4200);
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
    this.dialog(`<div class="dialog-symbol">${icon('leaf')}</div><h2>Make a little life.</h2><p>No quests, deadlines or tool durability. Explore six biomes, grow a garden and build a place of your own.</p><dl class="controls-guide"><div><dt><kbd>W A S D</kbd> / arrows</dt><dd>Move · swimming is automatic</dd></div><div><dt><kbd>E</kbd> / <kbd>Space</kbd></dt><dd>Gather, harvest, fish or use doors</dd></div><div><dt><kbd>C</kbd> <kbd>B</kbd> <kbd>G</kbd> <kbd>I</kbd></dt><dd>Craft · build · farm · bag</dd></div><div><dt><kbd>H</kbd> / mouse wheel</dt><dd>Send a heart / zoom</dd></div></dl><h3>Start with what’s around you.</h3><p>Wood, stone, fiber and wild seeds can be gathered by hand. Resources renew in 25 seconds, ores in 45. Craft a pickaxe for copper and iron, then an iron pickaxe for crystal.</p><h3>A home, room by room.</h3><p>Choose a blueprint in Build, walk to position its foundation, then press Place building. Waterfront buildings need a dry riverbank. Press E by a front door to enter. Side doors connect furnished rooms; the front doorway leads outside. Your friend can keep exploring elsewhere.</p><h3>A garden and a river.</h3><p>Craft a hoe and plant on open meadow or forest soil using Farm. Crops grow in ${CROP_SECONDS} seconds and return two seeds. Craft a rod, stand on a riverbank, cast with E, and press E again when a fish bites. Every third catch brings a pearl. Highland and snowy rivers have trout.</p><p class="small-print">The world is a finite, seeded 256 × 256 landscape with renewable materials. Each session supports 100 buildings and 200 crop plots. Dismantling refunds construction costs. Keep the host tab open: there are no saved worlds or host migration. Disconnects pause the whole world until your friend rejoins.</p><button class="button primary" data-action="close-dialog">Back to the world${icon('arrow-right')}</button>`, 'How to play');
  }
  private openPanel(panel: 'craft' | 'build' | 'farm' | 'bag'): void {
    if (this.panel === panel) { this.closePanel(); return; }
    this.panel = panel; this.panelSignature = ''; this.selectBlueprint(null); this.renderPanel();
    this.root.querySelectorAll<HTMLElement>('[data-panel]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.panel === panel)));
    this.root.querySelector<HTMLElement>('#sandbox-panel h2')?.focus();
  }
  private closePanel(): void {
    const wasOpen = this.panel; this.panel = null;
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
    const state = this.state, local = state.players[this.localId]!, panel = document.getElementById('sandbox-panel')!;
    const scroll = panel.querySelector('.panel-body')?.scrollTop || 0;
    const focused = (document.activeElement as HTMLElement)?.dataset;
    const titles = { craft: 'Craft a tool', build: 'Build your little world', farm: 'Grow something good', bag: 'Your shared bag' };
    let content = '';
    if (this.panel === 'craft') content = `<p>Tools belong to you. Materials come from the shared bag. Nothing breaks.</p><div class="recipe-list">${TOOLS.map(t => {
      const owned = local.tools.includes(t.id), prerequisite = t.requires && !local.tools.includes(t.requires);
      return `<article class="recipe"><h3>${t.name}${owned ? `<span class="owned">${icon('check')}Owned</span>` : ''}</h3><p>${t.description}</p><span class="recipe-cost">${costLabel(t.cost)}</span>${prerequisite ? `<small>First craft ${TOOLS.find(tool => tool.id === t.requires)!.name.toLowerCase()}.</small>` : ''}<button class="button secondary" data-tool="${t.id}" ${owned || prerequisite || !canAfford(state, t.cost) || !bothConnected(state) ? 'disabled' : ''}>${owned ? 'Already in your toolbelt' : !canAfford(state, t.cost) ? 'Gather missing materials' : `Craft ${t.name.toLowerCase()}`}</button></article>`;
    }).join('')}</div>`;
    if (this.panel === 'build') content = `<p>20 furnished buildings. Choose one, then move to place its foundation. Every building has connected rooms.</p><div class="recipe-list">${BUILDINGS.map(b => `<article class="recipe"><h3>${b.name}</h3><p>${b.description}</p><span class="room-summary">${b.rooms.map(r => r.name).join(' / ')}</span><span class="recipe-cost">${costLabel(b.cost)}</span><button class="button secondary" data-blueprint="${b.id}" ${local.location ? 'disabled' : ''}>${canAfford(state, b.cost) ? 'Choose blueprint' : 'Preview blueprint'}: ${b.name}</button></article>`).join('')}</div><div class="dismantle-section"><h3>Make room for something new</h3><p>Stand outside a front door. Dismantling returns all building materials, but no one can be inside.</p><button class="button secondary" data-action="confirm-dismantle">Dismantle nearby building</button></div>`;
    if (this.panel === 'farm') content = `<p>Use a hoe on open meadow or forest soil. A plot appears in front of you. Crops water themselves and grow in ${CROP_SECONDS} seconds.</p><div class="recipe-list">${(['wheat', 'carrot'] as const).map(crop => `<article class="recipe"><h3>${crop === 'wheat' ? 'Wheat' : 'Carrots'}</h3><p>Harvest 3 ${crop === 'wheat' ? 'wheat' : 'carrots'} and 2 seeds. Replant forever.</p><span class="recipe-cost">1 seed · ${CROP_SECONDS}s growing time</span><button class="button secondary" data-crop="${crop}" ${!local.tools.includes('hoe') || !state.inventory.seed || !!local.location || !bothConnected(state) ? 'disabled' : ''}>Plant ${crop === 'wheat' ? 'wheat' : 'carrots'}</button></article>`).join('')}</div>${!local.tools.includes('hoe') ? '<p class="panel-note">First make a garden hoe in Craft.</p>' : ''}<p class="panel-note">Seeds used up? Gather the golden wild seed plants in the meadow or forest. They renew every 25 seconds.</p>`;
    if (this.panel === 'bag') content = `<p>A shared supply for both capybaras. Explore the biomes below to find what you need.</p><dl class="bag-list">${Object.entries(state.inventory).map(([kind, amount]) => `<div><dt><i class="material-chip" style="--material:${ITEM_COLORS[kind as keyof typeof ITEM_COLORS]}"></i>${ITEM_LABELS[kind as keyof typeof ITEM_LABELS]}</dt><dd id="stock-${kind}">${amount}</dd></div>`).join('')}</dl><h3>Your toolbelt</h3><p>${local.tools.length ? local.tools.map(t => TOOLS.find(tool => tool.id === t)!.name).join(' · ') : 'Empty for now. Gather by hand, then open Craft.'}</p><h3>Field guide</h3><dl class="biome-guide">${Object.values(BIOMES).map(b => `<div><dt>${b.name}</dt><dd>${b.description}</dd></div>`).join('')}</dl><p class="panel-note">Raw materials renew forever. Tools do not break. Pearls come from every third fishing catch.</p>`;
    panel.hidden = false;
    panel.innerHTML = `<header class="panel-header"><h2 tabindex="-1">${titles[this.panel]}</h2><button class="icon-button" data-action="close-panel" aria-label="Close sandbox menu">${icon('x')}</button></header><div class="panel-body">${content}</div>`;
    panel.querySelector('.panel-body')!.scrollTop = scroll; renderIcons();
    if (focused?.tool) panel.querySelector<HTMLElement>(`[data-tool="${focused.tool}"]`)?.focus();
    if (focused?.blueprint) panel.querySelector<HTMLElement>(`[data-blueprint="${focused.blueprint}"]`)?.focus();
  }
  private async click(event: MouseEvent): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button, a[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (button instanceof HTMLButtonElement && button.disabled) return;
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
      case 'close-panel': this.closePanel(); break;
      case 'cancel-build': this.selectBlueprint(null); break;
      case 'place': if (this.blueprint) this.events.command({ type: 'build', kind: this.blueprint }); this.selectBlueprint(null); break;
      case 'confirm-dismantle': this.dialog('<h2>Dismantle this building?</h2><p>The building by your front paws will be removed. All construction materials return to the shared bag. No one can be inside.</p><button class="button primary" data-action="close-dialog">Keep building</button><button class="button secondary" data-action="dismantle">Dismantle and refund materials</button>', 'Dismantle building?'); break;
      case 'dismantle': this.root.querySelector('dialog')?.close(); this.events.command({ type: 'dismantle' }); this.closePanel(); break;
      case 'close-dialog': this.root.querySelector('dialog')?.close(); break;
      case 'sound':
        try { this.soundOn = await this.events.sound(); button.innerHTML = icon(this.soundOn ? 'volume-2' : 'volume-x'); button.setAttribute('aria-label', this.soundOn ? 'Mute island sounds' : 'Enable island sounds'); button.setAttribute('aria-pressed', String(this.soundOn)); renderIcons(); }
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
