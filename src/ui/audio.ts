export class IslandAudio {
  private context: AudioContext | null = null;
  private enabled = false;
  private birdTimer?: ReturnType<typeof setInterval>;
  async toggle(): Promise<boolean> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
    this.enabled = !this.enabled;
    clearInterval(this.birdTimer);
    if (this.enabled) {
      this.chime();
      this.birdTimer = setInterval(() => { if (!document.hidden) { this.tone(1250, 0, 0.15, 0.025, 1750); this.tone(1600, 0.18, 0.18, 0.018, 1300); } }, 7000);
    }
    return this.enabled;
  }
  private tone(frequency: number, delay: number, duration: number, volume: number, end = frequency): void {
    if (!this.context || !this.enabled) return;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    const time = this.context.currentTime + delay;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, time); oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + 0.015); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(time); oscillator.stop(time + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  collect(): void { this.tone(660, 0, 0.18, 0.07); this.tone(880, 0.08, 0.25, 0.045); }
  chime(): void { [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.tone(note, i * 0.13, 0.6, 0.04)); }
}
