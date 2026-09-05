import { ITEM_LABELS, QUESTS } from '../game/content';
import { bothConnected, nearestInteraction } from '../game/engine';
import { profileSchema, type GameState, type PlayerId, type Profile } from '../game/schema';
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
  private completionShown = false;
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
    this.state = null; this.screen = 'setup'; this.signature = ''; this.completionShown = false;
    this.root.className = 'setup-screen';
    this.root.innerHTML = `${this.header()}
      <section class="welcome" aria-labelledby="welcome-title">
        <h1 id="welcome-title">Little island.<br>Big <span>capy energy.</span></h1>
        <p class="intro">A pocket of paradise, made for two.<br>Bring a friend. Leave the hurry behind.</p>
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
      <footer class="landing-footer"><span>${icon('users')}2 players</span><span>${icon('sprout')}3 shared adventures</span><span class="footer-right">A little adventure for two.</span></footer>
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
    if (state.phase === 'complete' && !this.completionShown) { this.completionShown = true; this.showCompletion(); }
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
      <section class="quest-panel" aria-label="Current shared quest"><button class="quest-heading" data-action="journal"><span class="quest-counter" id="quest-counter"></span><span>Island journal</span>${icon('chevron-right')}</button><h2 id="quest-title"></h2><p id="quest-description"></p><div class="quest-progress"><span id="quest-progress-text"></span><span id="quest-count"></span></div><div class="progress-track" role="progressbar" aria-label="Quest items collected" aria-valuemin="0"><div id="quest-fill"></div></div><p id="quest-hint" class="quest-hint"></p></section>
      <aside class="map-panel" aria-label="Island map"><div class="map-heading"><span>CAPY COVE</span>${icon('map')}</div><canvas id="minimap" width="220" height="220" aria-label="Map showing your position, your friend, quest items, and destination"></canvas><div class="map-legend"><span><i class="dot you"></i>You</span><span><i class="dot friend"></i>Friend</span><span><i class="dot destination"></i>Quest</span></div></aside>
      <div id="connection-banner" class="connection-banner" role="status" hidden>${icon('radio')}Your friend disconnected. The island is paused.<button data-action="copy">Copy invite</button></div>
      <div id="player-labels" aria-hidden="true"><div id="label-p1" class="player-label"></div><div id="label-p2" class="player-label"></div></div>
      <aside class="inventory" aria-label="Shared backpack"><span class="inventory-title">${icon('package')}Shared bag</span><span title="Oranges"><span class="orange-icon"></span><b id="bag-orange">0</b></span><span title="Seeds">${icon('sprout')}<b id="bag-seed">0</b></span><span title="Smooth stones"><span class="stone-icon"></span><b id="bag-stone">0</b></span></aside>
      <div class="interaction-area"><button id="interact-button" class="interact-button" data-action="interact" disabled><kbd>E</kbd><span id="interact-label">Find something lovely</span></button><span class="desktop-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><span>Scroll to zoom</span></span></div>
      <button class="emote-button icon-button" data-action="emote" aria-label="Send a heart (H)">${icon('heart')}<kbd>H</kbd></button>
      <div class="touch-controls" aria-label="Movement controls"><button data-move="w" class="up" aria-label="Move up">${icon('arrow-right')}</button><button data-move="a" class="left" aria-label="Move left">${icon('arrow-right')}</button><span>${icon('leaf')}</span><button data-move="d" class="right" aria-label="Move right">${icon('arrow-right')}</button><button data-move="s" class="down" aria-label="Move down">${icon('arrow-right')}</button></div>
      <div class="world-coordinate" id="world-coordinate" aria-hidden="true"></div><div id="dialogs"></div>`;
    renderIcons();
  }
  private text(id: string, value: string): void { const element = document.getElementById(id); if (element && element.textContent !== value) element.textContent = value; }
  private updateGame(): void {
    const state = this.state!;
    const quest = QUESTS[state.quest];
    const local = state.players[this.localId];
    this.text('quest-counter', `${Math.min(state.quest + 1, 3)} / 3`);
    this.text('quest-title', quest?.title || 'A very good day.');
    this.text('quest-description', quest ? `Find ${quest.amount} ${ITEM_LABELS[quest.kind]}, then meet at ${quest.station.toLowerCase()}.` : 'Picnic shared. Garden blooming. Spring bubbling. This happy place is yours.');
    const amount = quest ? Math.min(state.inventory[quest.kind], quest.amount) : 1;
    this.text('quest-progress-text', quest ? ITEM_LABELS[quest.kind] : 'Made together');
    this.text('quest-count', quest ? `${amount} / ${quest.amount}` : '3 / 3');
    const track = this.root.querySelector<HTMLElement>('.progress-track')!;
    track.setAttribute('aria-valuenow', String(amount)); track.setAttribute('aria-valuemax', String(quest?.amount || 1));
    (document.getElementById('quest-fill') as HTMLElement).style.transform = `scaleX(${amount / (quest?.amount || 1)})`;
    this.text('quest-hint', quest ? amount >= quest.amount ? `Meet at the diamond on your map. Both press E.${state.activated.includes(this.localId) ? ' Your part is done!' : ''}` : `Each capy collects at least one. ${local?.contributions ? 'You’ve helped!' : 'Your turn to find something.'}` : 'Stay awhile. You’ve earned a little nothing.');
    for (const kind of ['orange', 'seed', 'stone'] as const) this.text(`bag-${kind}`, String(state.inventory[kind]));
    const interaction = nearestInteraction(state, this.localId);
    const interactButton = document.getElementById('interact-button') as HTMLButtonElement;
    interactButton.disabled = !interaction || !bothConnected(state);
    this.text('interact-label', interaction?.label || (quest ? 'Get close to a glowing item' : 'Nothing to do. Nowhere to rush.'));
    const banner = document.getElementById('connection-banner')!; banner.hidden = bothConnected(state);
    for (const id of ['p1', 'p2'] as const) {
      const p = state.players[id]; const label = document.getElementById(`label-${id}`)!;
      label.textContent = p?.connected ? `${p.profile.name}${id === this.localId ? ' · you' : ''}` : '';
      label.dataset.player = id;
      label.dataset.x = String(p?.x ?? 0); label.dataset.z = String(p?.z ?? 0);
      label.classList.toggle('is-you', id === this.localId);
    }
    drawMinimap(document.getElementById('minimap') as HTMLCanvasElement, state, this.localId);
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
    this.dialog(`<div class="dialog-symbol">${icon('leaf')}</div><h2>A slow little adventure.</h2><p>You’re two capybaras with a whole island and absolutely no deadlines.</p><dl class="controls-guide"><div><dt><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd></dt><dd>Wander around</dd></div><div><dt><kbd>E</kbd> / <kbd>Space</kbd></dt><dd>Collect or help at a destination</dd></div><div><dt><kbd>H</kbd></dt><dd>Send a little love</dd></div><div><dt>Mouse wheel</dt><dd>Zoom in or out</dd></div></dl><p>On a phone? Use the direction pad and tap the action button. Crossing the river automatically makes you swim.</p><h3>Good things take two.</h3><p>Follow the glowing items and the diamond on your map. Each of you collects at least one item per quest. Then meet at the destination and both interact.</p><p class="small-print">The host must keep their tab open. If a friend disconnects, the game pauses and they can rejoin with the same link. Host reloads end the session. Peer-to-peer connections may not work on restrictive networks without a TURN relay.</p><button class="button primary" data-action="close-dialog">Got it. Let’s go slowly.${icon('arrow-right')}</button>`, 'How to play');
  }
  private showJournal(): void {
    const state = this.state!;
    this.dialog(`<div class="dialog-symbol">${icon('sprout')}</div><h2>Little things, together.</h2><p>Three good reasons to take the scenic route.</p><ol class="journal-list">${QUESTS.map((q, i) => `<li class="${state.quest > i ? 'done' : ''}"><span class="journal-icon">${icon(state.quest > i ? 'check' : ['sun', 'flower-2', 'waves'][i])}</span><div><h3>${q.title}</h3><p>${q.description}</p><span>${state.quest > i ? 'Made together' : state.quest === i ? 'Your current adventure' : 'Up next'} · ${q.station}</span></div></li>`).join('')}</ol><button class="button primary" data-action="close-dialog">Back to the good life${icon('arrow-right')}</button>`, 'Island journal');
  }
  private showCompletion(): void {
    this.dialog(`<div class="completion-art">${capyMark}${icon('heart')}${capyMark}</div><h2>Turns out, this<br>is the good life.</h2><p>A picnic. A little garden. A warm place to do nothing. You made this island happier, together.</p><div class="completion-rewards"><span>${icon('sun')}Picnic pals</span><span>${icon('flower-2')}Garden keepers</span><span>${icon('waves')}Expert relaxers</span></div><button class="button primary" data-action="close-dialog">Stay a little longer${icon('heart')}</button><p class="form-note">There’s no timer on a very good day.</p>`, 'Adventure complete');
  }
  private async click(event: MouseEvent): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button, a[data-action]'); if (!button) return;
    const action = button.dataset.action;
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
      case 'journal': this.showJournal(); break;
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
