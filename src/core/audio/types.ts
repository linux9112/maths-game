/**
 * Procedural Web Audio Synthesizer Types
 */

export type SoundEffectType =
  | 'correct'
  | 'incorrect'
  | 'combo'
  | 'levelUp'
  | 'victory'
  | 'tick'
  | 'tickFinal'
  | 'buttonTap'
  | 'warning'
  | 'gameOver';

export interface AudioSettings {
  /** Whether all audio output is muted (default: false) */
  muted: boolean;
  /** Master volume between 0.0 (silent) and 1.0 (maximum), default: 0.7 */
  volume: number;
}

export interface SynthNote {
  /** Oscillator waveform type */
  type: OscillatorType;
  /** Frequency in Hertz (or start frequency for chirps) */
  freq: number;
  /** Optional ending frequency for pitch sweeps */
  endFreq?: number;
  /** Start delay in seconds from trigger time */
  delaySec: number;
  /** Note active duration in seconds */
  durationSec: number;
  /** Maximum gain / amplitude for this note */
  gain: number;
  /** Pitch bend transition type */
  sweep?: 'exponential' | 'linear';
}

export interface IAudioEngine {
  /** Explicitly initialize or resume the underlying AudioContext upon user gesture */
  init(): Promise<void>;

  /** Retrieve current AudioContext state */
  getState(): AudioContextState | 'unsupported';

  /** Check whether sound is currently muted */
  isMuted(): boolean;

  /** Set muted state */
  setMuted(muted: boolean): void;

  /** Get master volume (0.0 to 1.0) */
  getVolume(): number;

  /** Set master volume (clamped between 0.0 and 1.0) */
  setVolume(volume: number): void;

  /** Play ascending dual-sine correct chime */
  playCorrect(): void;

  /** Play low-frequency descending triangle thud */
  playIncorrect(): void;

  /** Play combo arpeggio with pitch escalation based on multiplier */
  playCombo(comboCount: number): void;

  /** Play celebratory multi-note level-up sequence */
  playLevelUp(): void;

  /** Play game completion / victory fanfare */
  playVictory(): void;

  /** Play countdown tick (regular or final tick) */
  playTick(isFinal?: boolean): void;

  /** Play subtle tactile button tap */
  playButtonTap(): void;

  /** Play alert / life lost warning pulse */
  playWarning(): void;

  /** Play game over descending sequence */
  playGameOver(): void;

  /** Clean up and close AudioContext */
  destroy(): Promise<void>;
}
