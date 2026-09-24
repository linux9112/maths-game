import { IAudioEngine, SynthNote } from './types';
import {
  EPSILON,
  CORRECT_CHIME_NOTES,
  INCORRECT_THUD_NOTES,
  getComboNotes,
  LEVEL_UP_FANFARE_NOTES,
  COUNTDOWN_TICK_REGULAR,
  COUNTDOWN_TICK_FINAL,
  BUTTON_TAP_NOTES,
  WARNING_NOTES,
  GAME_OVER_NOTES,
} from './soundPresets';
import { SettingsStore } from '../storage/settingsStore';

export class SoundEngine implements IAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private unsubscribeSettings: (() => void) | null = null;

  constructor() {
    this.unsubscribeSettings = SettingsStore.subscribe(() => {
      this.updateMasterGainRamped();
    });
  }

  /**
   * Lazily retrieve or initialize AudioContext and master gain node.
   */
  public async getContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.updateMasterGainImmediately();
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Will resume on subsequent user gesture
      }
    }

    return this.ctx;
  }

  public async init(): Promise<void> {
    await this.getContext();
  }

  public getState(): AudioContextState | 'unsupported' {
    if (!this.ctx) return 'unsupported';
    return this.ctx.state;
  }

  public isMuted(): boolean {
    return !SettingsStore.get().soundEnabled;
  }

  public setMuted(muted: boolean): void {
    SettingsStore.set({ soundEnabled: !muted });
    this.updateMasterGainRamped();
  }

  public getVolume(): number {
    return SettingsStore.get().soundVolume;
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    SettingsStore.set({ soundVolume: clamped });
    this.updateMasterGainRamped();
  }

  public applySettings(): void {
    this.updateMasterGainImmediately();
  }

  private updateMasterGainImmediately(): void {
    if (!this.masterGain || !this.ctx) return;
    const settings = SettingsStore.get();
    const target = settings.soundEnabled ? settings.soundVolume : 0;
    this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
  }

  private updateMasterGainRamped(): void {
    if (!this.masterGain || !this.ctx) return;
    const settings = SettingsStore.get();
    const target = settings.soundEnabled ? settings.soundVolume : 0;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + 0.03); // 30ms anti-pop de-zippering
  }

  /**
   * Internal scheduler that creates oscillators and executes ADSR envelopes.
   */
  private scheduleNotes(notes: SynthNote[]): void {
    const settings = SettingsStore.get();
    if (!settings.soundEnabled) return; // Skip scheduling if muted

    void this.getContext().then((ctx) => {
      if (!ctx || !this.masterGain || ctx.state !== 'running') return;

      const startTime = ctx.currentTime;

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = note.type;
        const noteStart = startTime + note.delaySec;
        const noteEnd = noteStart + note.durationSec;

        // Frequency scheduling & sweeps
        osc.frequency.setValueAtTime(note.freq, noteStart);
        if (note.endFreq) {
          if (note.sweep === 'exponential') {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, note.endFreq), noteEnd);
          } else {
            osc.frequency.linearRampToValueAtTime(note.endFreq, noteEnd);
          }
        }

        // ADSR Envelope Configuration (attack -> decay/release)
        const attackDuration = Math.min(0.008, note.durationSec * 0.2);
        noteGain.gain.setValueAtTime(EPSILON, noteStart);
        noteGain.gain.linearRampToValueAtTime(note.gain, noteStart + attackDuration);
        noteGain.gain.exponentialRampToValueAtTime(EPSILON, noteEnd);

        // Connect graph: Osc -> NoteGain -> MasterGain -> Destination
        osc.connect(noteGain);
        noteGain.connect(this.masterGain);

        // Playback lifecycle
        osc.start(noteStart);
        osc.stop(noteEnd + 0.02);

        // Memory cleanup on playback end
        osc.onended = () => {
          try {
            osc.disconnect();
            noteGain.disconnect();
          } catch {
            // Already disconnected
          }
        };
      }
    });
  }

  public playCorrect(): void {
    this.scheduleNotes(CORRECT_CHIME_NOTES);
  }

  public playIncorrect(): void {
    this.scheduleNotes(INCORRECT_THUD_NOTES);
  }

  public playCombo(comboCount: number): void {
    this.scheduleNotes(getComboNotes(comboCount));
  }

  public playLevelUp(): void {
    this.scheduleNotes(LEVEL_UP_FANFARE_NOTES);
  }

  public playVictory(): void {
    this.scheduleNotes(LEVEL_UP_FANFARE_NOTES);
  }

  public playTick(isFinal: boolean = false): void {
    this.scheduleNotes(isFinal ? COUNTDOWN_TICK_FINAL : COUNTDOWN_TICK_REGULAR);
  }

  public playButtonTap(): void {
    this.scheduleNotes(BUTTON_TAP_NOTES);
  }

  public playWarning(): void {
    this.scheduleNotes(WARNING_NOTES);
  }

  public playGameOver(): void {
    this.scheduleNotes(GAME_OVER_NOTES);
  }

  public async destroy(): Promise<void> {
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      await this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

/** Global singleton instance */
export const soundEngine = new SoundEngine();
