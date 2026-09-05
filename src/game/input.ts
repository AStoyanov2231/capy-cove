import type { MoveInput } from './schema';

/** Controls are camera-relative, so up always moves toward the top of the screen. */
export class InputController {
  private keys = new Set<string>();
  private touch = new Map<number, string>();
  private active = false;
  onInteract?: () => void;
  onEmote?: () => void;
  onMove?: (input: MoveInput) => void;
  constructor() {
    window.addEventListener('keydown', event => {
      if (!this.active || this.editing() || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'h', ' '].includes(key)) event.preventDefault();
      this.keys.add(key);
      this.onMove?.(this.read());
      if (!event.repeat && (key === 'e' || key === ' ')) this.onInteract?.();
      if (!event.repeat && key === 'h') this.onEmote?.();
    });
    window.addEventListener('keyup', event => { this.keys.delete(event.key.toLowerCase()); this.onMove?.(this.read()); });
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    document.addEventListener('pointerdown', event => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-move]');
      if (!button || !this.active) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      this.touch.set(event.pointerId, button.dataset.move!);
      this.onMove?.(this.read());
    });
    const release = (event: PointerEvent) => { this.touch.delete(event.pointerId); this.onMove?.(this.read()); };
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    document.addEventListener('lostpointercapture', release);
  }
  setActive(active: boolean): void { this.active = active; if (!active) this.clear(); }
  clear(): void { this.keys.clear(); this.touch.clear(); this.onMove?.({ x: 0, z: 0 }); }
  private editing(): boolean {
    return !!document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  }
  read(): MoveInput {
    if (!this.active || this.editing() || document.hidden) return { x: 0, z: 0 };
    const pressed = (...keys: string[]) => keys.some(k => this.keys.has(k) || [...this.touch.values()].includes(k));
    const horizontal = Number(pressed('d', 'arrowright')) - Number(pressed('a', 'arrowleft'));
    const vertical = Number(pressed('s', 'arrowdown')) - Number(pressed('w', 'arrowup'));
    const length = Math.max(1, Math.hypot(horizontal, vertical));
    return { x: (horizontal * 0.794 + vertical * 0.607) / length, z: (horizontal * -0.607 + vertical * 0.794) / length };
  }
}
