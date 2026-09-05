import './style.css';
import { InputController } from './game/input';
import { bothConnected } from './game/engine';
import type { Profile } from './game/schema';
import { inviteUrl, roomFromUrl, Session } from './network/session';
import { IslandRenderer } from './render/renderer';
import { IslandAudio } from './ui/audio';
import { GameUI } from './ui/interface';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  let renderer: IslandRenderer;
  try {
    await document.fonts.load('500 20px Fredoka');
    renderer = new IslandRenderer(document.getElementById('world') as HTMLCanvasElement);
  } catch {
    root.innerHTML = '<section class="fatal-screen"><h1>This island needs a little more graphics power.</h1><p>Capy Cove needs WebGL. Try a recent version of Chrome, Firefox, Edge, or Safari with hardware acceleration enabled.</p><button class="button primary" onclick="location.reload()">Try again</button></section>';
    return;
  }
  const audio = new IslandAudio();
  const input = new InputController();
  let session: Session | null = null;
  let connecting = false;
  let room = roomFromUrl();
  let attempt = 0;
  let lastNotice = 0, lastQuest = 0, lastCollected = 0;
  const ui = new GameUI(root, room, {
    preview: profile => renderer.preview(profile),
    connect: profile => { void connect(profile); },
    retry: () => { void connect(ui.currentProfile); },
    ready: value => session?.command({ type: 'ready', value }),
    leave: () => {
      attempt++; connecting = false; session?.close(); session = null;
      room = null; history.replaceState({}, '', location.pathname);
      input.setActive(false); renderer.reset(ui.currentProfile); ui.reset(true);
    },
    interact: () => session?.command({ type: 'interact' }),
    emote: () => session?.command({ type: 'emote' }),
    sound: () => audio.toggle(),
  });
  renderer.onFrame = project => ui.positionLabels(project);
  renderer.onContextLost = () => {
    input.setActive(false); session?.input({ x: 0, z: 0 });
    ui.error('The graphics context was lost. Reload this page to restore it. Reloading the host closes the current island.');
  };
  input.onMove = value => session?.input(value);
  input.onInteract = () => session?.command({ type: 'interact' });
  input.onEmote = () => session?.command({ type: 'emote' });

  async function connect(profile: Profile): Promise<void> {
    if (connecting) return;
    connecting = true; const current = ++attempt;
    session?.close(); input.setActive(false);
    lastNotice = 0; lastQuest = 0; lastCollected = 0;
    ui.connecting();
    const next = new Session(profile, room, {
      state: state => {
        if (current !== attempt) return;
        connecting = false;
        ui.update(state, next.localId); renderer.update(state, next.localId);
        input.setActive(state.phase !== 'lobby' && bothConnected(state));
        if (state.noticeId > lastNotice) { lastNotice = state.noticeId; ui.toast(state.notice); }
        if (state.quest > lastQuest) audio.chime();
        else if (state.collected.length > lastCollected) audio.collect();
        lastQuest = state.quest; lastCollected = state.collected.length;
      },
      status: message => { if (current === attempt) ui.toast(message); },
      lost: message => {
        if (current !== attempt) return;
        attempt++; connecting = false; next.close(); input.setActive(false); ui.error(message);
      },
    });
    session = next;
    ui.setInvite(inviteUrl(next.room));
    try { await next.open(); }
    catch (error) {
      if (current !== attempt) return;
      connecting = false; next.close();
      ui.error(error instanceof Error ? error.message : 'Could not open the island. Please try again.');
    }
  }
  setInterval(() => { session?.input(input.read()); }, 50);
  window.addEventListener('pagehide', () => session?.close());
  window.addEventListener('beforeunload', event => {
    if (!session || !root.classList.contains('game-screen')) return;
    event.preventDefault();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) session?.input({ x: 0, z: 0 });
    else if (session?.localId === 'p1' && root.classList.contains('game-screen')) ui.toast('Welcome back. Keep this tab visible for the smoothest adventure.');
  });
}
void boot();
