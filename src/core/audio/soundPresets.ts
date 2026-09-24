import { SynthNote } from './types';

export const EPSILON = 0.0001; // AudioParam safe non-zero floor for exponential ramps

/**
 * Correct answer chime: Ascending two-tone + harmonic sparkle
 * C5 (523.25 Hz) -> E5 (659.25 Hz) + C6 sparkle (1046.50 Hz)
 */
export const CORRECT_CHIME_NOTES: SynthNote[] = [
  { type: 'sine', freq: 523.25, delaySec: 0.00, durationSec: 0.18, gain: 0.30 },
  { type: 'sine', freq: 659.25, delaySec: 0.07, durationSec: 0.25, gain: 0.35 },
  { type: 'sine', freq: 1046.50, delaySec: 0.12, durationSec: 0.18, gain: 0.12 },
];

/**
 * Incorrect answer thud: Soft low-frequency downward sweep
 * Triangle 150 Hz -> 80 Hz with sub-bass sine body 100 Hz -> 50 Hz
 */
export const INCORRECT_THUD_NOTES: SynthNote[] = [
  { type: 'triangle', freq: 150, endFreq: 80, delaySec: 0.00, durationSec: 0.22, gain: 0.35, sweep: 'exponential' },
  { type: 'sine', freq: 100, endFreq: 50, delaySec: 0.00, durationSec: 0.16, gain: 0.22, sweep: 'exponential' },
];

/**
 * Combo arpeggio generator with ascending pitch escalation
 */
export function getComboNotes(comboCount: number): SynthNote[] {
  const k = Math.max(2, comboCount);
  const semitones = Math.min((k - 2) * 2, 16);
  const rootFreq = 523.25 * Math.pow(2, semitones / 12);

  const intervals = [1.0, 1.25992, 1.49831, 2.0, 2.51984];
  const noteCount = k === 2 ? 2 : k < 5 ? 3 : k < 8 ? 4 : 5;
  const stepTime = Math.max(0.035, 0.06 - k * 0.002);

  return Array.from({ length: noteCount }, (_, i) => ({
    type: 'sine' as OscillatorType,
    freq: rootFreq * intervals[i],
    delaySec: i * stepTime,
    durationSec: 0.12,
    gain: 0.28,
  }));
}

/**
 * Level-up / victory fanfare: Brass-style C5 -> E5 -> G5 -> C6 resolved chord
 */
export const LEVEL_UP_FANFARE_NOTES: SynthNote[] = [
  { type: 'triangle', freq: 523.25, delaySec: 0.00, durationSec: 0.10, gain: 0.30 },
  { type: 'triangle', freq: 659.25, delaySec: 0.09, durationSec: 0.10, gain: 0.30 },
  { type: 'triangle', freq: 783.99, delaySec: 0.18, durationSec: 0.10, gain: 0.32 },
  { type: 'triangle', freq: 1046.50, delaySec: 0.27, durationSec: 0.45, gain: 0.38 },
  { type: 'sine', freq: 1318.51, delaySec: 0.27, durationSec: 0.45, gain: 0.22 },
  { type: 'sine', freq: 1567.98, delaySec: 0.27, durationSec: 0.45, gain: 0.18 },
];

/**
 * Countdown tick: short transient clicks for 3, 2, 1
 */
export const COUNTDOWN_TICK_REGULAR: SynthNote[] = [
  { type: 'sine', freq: 1100, endFreq: 900, delaySec: 0.00, durationSec: 0.035, gain: 0.22, sweep: 'exponential' },
];

/**
 * Countdown tick for final GO! / start
 */
export const COUNTDOWN_TICK_FINAL: SynthNote[] = [
  { type: 'sine', freq: 2000, endFreq: 1500, delaySec: 0.00, durationSec: 0.07, gain: 0.32, sweep: 'exponential' },
  { type: 'triangle', freq: 1000, endFreq: 750, delaySec: 0.00, durationSec: 0.07, gain: 0.20, sweep: 'exponential' },
];

/**
 * Button tap: Subtle tactile bubble pop
 */
export const BUTTON_TAP_NOTES: SynthNote[] = [
  { type: 'sine', freq: 420, endFreq: 210, delaySec: 0.00, durationSec: 0.028, gain: 0.12, sweep: 'exponential' },
];

/**
 * Warning pulse: Two alert tones
 */
export const WARNING_NOTES: SynthNote[] = [
  { type: 'square', freq: 440, delaySec: 0.00, durationSec: 0.08, gain: 0.20 },
  { type: 'square', freq: 493.88, delaySec: 0.10, durationSec: 0.08, gain: 0.20 },
];

/**
 * Game over sequence: Descending minor resolution
 */
export const GAME_OVER_NOTES: SynthNote[] = [
  { type: 'triangle', freq: 523.25, delaySec: 0.00, durationSec: 0.12, gain: 0.30 },
  { type: 'triangle', freq: 415.30, delaySec: 0.12, durationSec: 0.12, gain: 0.30 },
  { type: 'triangle', freq: 349.23, delaySec: 0.24, durationSec: 0.14, gain: 0.30 },
  { type: 'triangle', freq: 261.63, delaySec: 0.38, durationSec: 0.30, gain: 0.35 },
];
