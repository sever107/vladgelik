export type SoundType = 'click' | 'select' | 'start' | 'win' | 'lose' | 'tick';

type Voice = {
  oscillator: OscillatorNode;
  gain: GainNode;
  spin: boolean;
};

/** All audio is synthesized locally. A context is created only by unlock(). */
export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private enabled = false;
  private closed = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setValueAtTime(enabled ? 0.48 : 0, this.context.currentTime);
    }
  }

  /** Call directly from an actual click/key event, never from a mount effect. */
  async unlock(): Promise<void> {
    if (this.closed) return;
    try {
      if (!this.context) {
        const AudioContextClass = window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = this.enabled ? 0.48 : 0;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Missing devices and browser policies must never interrupt the game.
    }
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    options: {
      delay?: number;
      endFrequency?: number;
      type?: OscillatorType;
      attack?: number;
      spin?: boolean;
    } = {},
  ) {
    const context = this.context;
    if (!this.enabled || !context || !this.master || context.state !== 'running') return;
    try {
      const at = context.currentTime + (options.delay ?? 0);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const voice: Voice = { oscillator, gain, spin: options.spin ?? false };
      oscillator.type = options.type ?? 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      if (options.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, at + duration);
      }
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(volume, at + Math.min(options.attack ?? 0.008, duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.00001, at + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      this.voices.add(voice);
      oscillator.onended = () => this.release(voice);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.025);
    } catch {
      // Audio is enhancement-only, including under browser resource limits.
    }
  }

  play(type: SoundType) {
    switch (type) {
      case 'click':
        this.tone(610, 0.045, 0.06, { endFrequency: 430, type: 'triangle' });
        break;
      case 'select':
        this.tone(510, 0.08, 0.07, { endFrequency: 650 });
        this.tone(1020, 0.11, 0.025, { delay: 0.025 });
        break;
      case 'start':
        this.tone(130, 0.22, 0.13, { endFrequency: 245, type: 'triangle', attack: 0.025 });
        this.tone(490, 0.18, 0.045, { delay: 0.05, endFrequency: 735 });
        break;
      case 'tick':
        this.tone(1250, 0.022, 0.035, { endFrequency: 690, type: 'triangle', spin: true });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.tone(frequency, 0.56, 0.065, { delay: index * 0.085, attack: 0.012 });
          this.tone(frequency / 2, 0.64, 0.025, { delay: index * 0.085, type: 'triangle', attack: 0.02 });
        });
        this.tone(130.81, 0.8, 0.06, { attack: 0.04 });
        break;
      case 'lose':
        this.tone(246.94, 0.28, 0.065, { endFrequency: 220, attack: 0.015 });
        this.tone(196, 0.42, 0.055, { delay: 0.16, endFrequency: 164.81, attack: 0.02 });
        break;
    }
  }

  startSpin(durationMs: number) {
    this.stopSpin();
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const duration = Math.max(0.05, durationMs / 1000);
    this.play('start');
    if (duration < 0.7) return;

    // Invert the integral of a smooth velocity envelope: zero speed at each end,
    // a short acceleration, then a long, clearly audible deceleration.
    const progress = (t: number) => 10 * t ** 2 - 20 * t ** 3 + 15 * t ** 4 - 4 * t ** 5;
    const ticks = Math.max(12, Math.round(duration * 12));
    for (let index = 1; index <= ticks; index += 1) {
      const target = index / (ticks + 1);
      let low = 0;
      let high = 1;
      for (let pass = 0; pass < 18; pass += 1) {
        const mid = (low + high) / 2;
        if (progress(mid) < target) low = mid;
        else high = mid;
      }
      const position = (low + high) / 2;
      this.tone(1100 - position * 310, 0.026 + position * 0.015, 0.035, {
        delay: position * duration,
        endFrequency: 480,
        type: 'triangle',
        spin: true,
        attack: 0.002,
      });
    }
    this.rotor(duration);
  }

  private rotor(duration: number) {
    const context = this.context;
    if (!context || !this.master) return;
    try {
      const at = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const voice: Voice = { oscillator, gain, spin: true };
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(48, at);
      oscillator.frequency.exponentialRampToValueAtTime(115, at + duration * 0.23);
      oscillator.frequency.exponentialRampToValueAtTime(42, at + duration);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.022, at + duration * 0.15);
      gain.gain.setValueAtTime(0.022, at + duration * 0.46);
      gain.gain.exponentialRampToValueAtTime(0.00001, at + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      this.voices.add(voice);
      oscillator.onended = () => this.release(voice);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.025);
    } catch {
      // A suspended or closing context is harmless.
    }
  }

  private release(voice: Voice) {
    voice.oscillator.onended = null;
    voice.oscillator.disconnect();
    voice.gain.disconnect();
    this.voices.delete(voice);
  }

  private stopVoice(voice: Voice) {
    try {
      const at = this.context?.currentTime ?? 0;
      voice.gain.gain.cancelScheduledValues(at);
      voice.gain.gain.setValueAtTime(0, at);
      voice.oscillator.stop(at);
    } catch {
      // Stopping an already-ended oscillator is safe to ignore.
    }
    this.release(voice);
  }

  stopSpin() {
    for (const voice of this.voices) if (voice.spin) this.stopVoice(voice);
  }

  stopAll() {
    for (const voice of this.voices) this.stopVoice(voice);
  }

  dispose() {
    this.closed = true;
    this.stopAll();
    this.master?.disconnect();
    const context = this.context;
    this.context = null;
    this.master = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }
}
