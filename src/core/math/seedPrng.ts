import { IPRNG } from './types';

/**
 * 32-bit FNV-1a Hash: Converts a date string "YYYY-MM-DD" into an unsigned 32-bit integer seed.
 */
export function hashDateSeed(dateStr: string, salt: string = 'math-daily-v1'): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format for daily seed: "${dateStr}". Expected "YYYY-MM-DD".`);
  }
  const combined = `${salt}:${dateStr}`;
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV 32-bit prime: 16777619
  }
  return hash >>> 0;
}

/**
 * Mulberry32 32-bit PRNG implementing the IPRNG interface.
 */
export class Mulberry32 implements IPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`min (${min}) cannot exceed max (${max})`);
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  public nextChoice<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot select choice from empty array');
    }
    const idx = this.nextInt(0, items.length - 1);
    return items[idx];
  }

  public shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Forks a child generator seeded deterministically from the current state.
   */
  public fork(): Mulberry32 {
    const childSeed = (this.next() * 4294967296) >>> 0;
    return new Mulberry32(childSeed);
  }
}

/**
 * Default fallback PRNG wrapping Math.random.
 */
export const defaultPrng: IPRNG = {
  next: () => Math.random(),
  nextInt: (min: number, max: number) => {
    if (min > max) {
      throw new Error(`min (${min}) cannot exceed max (${max})`);
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  nextChoice: <T>(items: readonly T[]) => {
    if (items.length === 0) {
      throw new Error('Cannot select choice from empty array');
    }
    return items[Math.floor(Math.random() * items.length)];
  },
  shuffle: <T>(array: readonly T[]) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },
};
