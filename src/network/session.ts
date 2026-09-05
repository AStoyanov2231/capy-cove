import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import { GameEngine } from '../game/engine';
import { SNAPSHOT_RATE, TICK_RATE } from '../game/content';
import { guestMessageSchema, hostMessageSchema, PROTOCOL_VERSION, type GameState, type GuestMessage, type HostMessage, type MoveInput, type PlayerId, type Profile } from '../game/schema';

export interface SessionEvents {
  state: (state: GameState) => void;
  status: (message: string) => void;
  lost: (message: string) => void;
}
function peerOptions(): PeerOptions {
  const env = import.meta.env;
  const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
  if (env.VITE_TURN_URL) iceServers.push({ urls: env.VITE_TURN_URL, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL });
  return {
    debug: 0,
    ...(env.VITE_PEER_HOST ? { host: env.VITE_PEER_HOST, port: Number(env.VITE_PEER_PORT || 443), path: env.VITE_PEER_PATH || '/', secure: env.VITE_PEER_SECURE !== 'false' } : {}),
    config: { iceServers },
  };
}
export function roomFromUrl(): string | null {
  const room = new URL(location.href).searchParams.get('room');
  return room && /^[a-f0-9]{24}$/.test(room) ? room : null;
}
export function inviteUrl(room: string): string {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', room);
  return url.href;
}
export class Session {
  readonly localId: PlayerId;
  readonly room: string;
  private peer: Peer;
  private connection: DataConnection | null = null;
  private engine: GameEngine | null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private tickTimer?: ReturnType<typeof setInterval>;
  private snapshotTimer?: ReturnType<typeof setInterval>;
  private closed = false;
  private handshake = false;
  private lastAction = 0;
  private lastInput = 0;
  private signalRetries = 0;

  constructor(private profile: Profile, room: string | null, private events: SessionEvents) {
    this.localId = room ? 'p2' : 'p1';
    this.room = room || Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
    this.engine = room ? null : new GameEngine(crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff);
    this.engine?.addPlayer('p1', profile);
    this.peer = room ? new Peer(peerOptions()) : new Peer(`capycove-${this.room}`, peerOptions());
  }
  async open(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('The connection took too long. Check your internet and try again.')), 20000);
      this.timers.push(timeout);
      let settled = false;
      this.peer.on('open', () => {
        if (this.closed || settled) return;
        settled = true;
        clearTimeout(timeout);
        this.start();
        resolve();
      });
      this.peer.on('error', error => {
        const message = error.type === 'peer-unavailable'
          ? 'This island is no longer open. Ask your friend for a new invite.'
          : error.type === 'unavailable-id'
            ? 'That island address is busy. Please create a new island.'
            : 'Could not connect. Try another network, or check the connection guide in the README.';
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error(message)); }
        else if (!this.closed) this.events.lost(message);
      });
      this.peer.on('disconnected', () => {
        if (this.closed) return;
        this.events.status('The invite service disconnected. Your existing connection may still work.');
        if (this.signalRetries++ < 3) this.timers.push(setTimeout(() => { if (!this.closed && !this.peer.destroyed) this.peer.reconnect(); }, 1500));
      });
    });
  }
  private start(): void {
    if (this.engine) {
      this.peer.on('connection', connection => this.accept(connection));
      let previous = performance.now(), accumulator = 0;
      this.tickTimer = setInterval(() => {
        const now = performance.now();
        accumulator += Math.min((now - previous) / 1000, 0.25);
        previous = now;
        while (accumulator >= 1 / TICK_RATE) { this.engine?.tick(1 / TICK_RATE); accumulator -= 1 / TICK_RATE; }
      }, 1000 / TICK_RATE);
      this.snapshotTimer = setInterval(() => this.publish(), 1000 / SNAPSHOT_RATE);
      this.publish();
    } else {
      const connection = this.peer.connect(`capycove-${this.room}`, { reliable: true, serialization: 'json' });
      this.connection = connection;
      const timeout = setTimeout(() => {
        if (!this.handshake && !this.closed) this.events.lost('Your friend could not be reached. Keep their island open and try again. Some networks need a TURN relay.');
      }, 20000);
      this.timers.push(timeout);
      connection.on('open', () => this.send({ type: 'hello', version: PROTOCOL_VERSION, profile: this.profile }));
      connection.on('data', raw => {
        const parsed = hostMessageSchema.safeParse(raw);
        if (!parsed.success || this.closed) return;
        const msg = parsed.data;
        if (msg.type === 'rejected') { this.events.lost(msg.reason); return; }
        if (!msg.state.players.p2) return;
        this.handshake = true;
        clearTimeout(timeout);
        this.events.state(msg.state);
      });
      connection.on('close', () => { if (!this.closed) this.events.lost('The host left the island or the connection was lost. Ask them to keep the tab open, then reconnect.'); });
      connection.on('error', () => { if (!this.closed) this.events.lost('The connection was interrupted. Reconnect to try again.'); });
    }
  }
  private accept(connection: DataConnection): void {
    if (this.connection) {
      connection.on('open', () => {
        connection.send({ type: 'rejected', reason: 'This island already has two capybaras. Ask your friend to create another island.' } satisfies HostMessage);
        this.timers.push(setTimeout(() => connection.close(), 500));
      });
      return;
    }
    this.connection = connection;
    let joined = false;
    const timeout = setTimeout(() => { if (!joined) connection.close(); }, 10000);
    this.timers.push(timeout);
    connection.on('data', raw => {
      const parsed = guestMessageSchema.safeParse(raw);
      if (!parsed.success || !this.engine || this.closed) return;
      const msg = parsed.data;
      if (msg.type === 'hello') {
        if (joined) return;
        joined = true;
        clearTimeout(timeout);
        this.engine.addPlayer('p2', msg.profile);
        this.handshake = true;
        this.publish();
        return;
      }
      if (!joined) return;
      const now = performance.now();
      if (msg.type === 'input') {
        if (now - this.lastInput < 20) return;
        this.lastInput = now;
      } else {
        if (now - this.lastAction < 180) return;
        this.lastAction = now;
      }
      this.apply('p2', msg);
    });
    const left = () => {
      if (this.closed || this.connection !== connection) return;
      clearTimeout(timeout);
      this.connection = null;
      this.handshake = false;
      if (joined) this.engine?.disconnect('p2');
      this.publish();
    };
    connection.on('close', left);
    connection.on('error', () => { connection.close(); left(); });
  }
  private publish(): void {
    if (!this.engine || this.closed) return;
    const state = this.engine.state;
    this.events.state(state);
    if (this.connection?.open && this.handshake) this.connection.send({ type: 'state', state } satisfies HostMessage);
  }
  private send(message: GuestMessage): void { if (this.connection?.open) this.connection.send(message); }
  private apply(id: PlayerId, msg: GuestMessage): void {
    if (!this.engine) return;
    switch (msg.type) {
      case 'input': this.engine.setInput(id, msg.input); break;
      case 'ready': this.engine.ready(id, msg.value); break;
      case 'interact': this.engine.interact(id); break;
      case 'emote': this.engine.emote(id); break;
      case 'craft': case 'build': case 'plant': case 'dismantle': this.engine.action(id, msg); break;
    }
    if (msg.type !== 'input') this.publish();
  }
  command(message: GuestMessage): void {
    if (this.engine) this.apply('p1', message); else this.send(message);
  }
  setTestMode(enabled: boolean): void {
    if (!this.engine) return;
    this.engine.setTestMode(enabled);
    this.publish();
  }
  input(input: MoveInput): void { this.command({ type: 'input', input }); }
  close(): void {
    this.closed = true;
    this.timers.forEach(clearTimeout);
    clearInterval(this.tickTimer);
    clearInterval(this.snapshotTimer);
    this.connection?.close();
    this.peer.destroy();
  }
}
