import { describe, it, expect } from 'vitest';
import { hashDateSeed, Mulberry32, defaultPrng } from '../../core/math/seedPrng';

describe('Seed PRNG & FNV-1a Hashing Suite', () => {
  describe('hashDateSeed', () => {
    it('produces deterministic identical hashes for identical date strings', () => {
      const h1 = hashDateSeed('2026-09-17');
      const h2 = hashDateSeed('2026-09-17');
      expect(h1).toBe(h2);
      expect(typeof h1).toBe('number');
      expect(h1).toBeGreaterThanOrEqual(0);
      expect(h1).toBeLessThanOrEqual(0xffffffff);
    });

    it('demonstrates avalanche effect on consecutive dates', () => {
      const h1 = hashDateSeed('2026-09-17');
      const h2 = hashDateSeed('2026-09-18');
      expect(h1).not.toBe(h2);
      // Bit difference check
      const xorDiff = (h1 ^ h2) >>> 0;
      const bitCount = xorDiff.toString(2).split('1').length - 1;
      expect(bitCount).toBeGreaterThanOrEqual(8); // Significant bit flip
    });

    it('throws error on invalid date string formats', () => {
      expect(() => hashDateSeed('17-09-2026')).toThrow(/Invalid date format/);
      expect(() => hashDateSeed('2026/09/17')).toThrow(/Invalid date format/);
      expect(() => hashDateSeed('invalid')).toThrow(/Invalid date format/);
    });
  });

  describe('Mulberry32 PRNG', () => {
    it('reproduces exact sequence for identical seed across independent instances', () => {
      const seed = 0x8f3a29b1;
      const rng1 = new Mulberry32(seed);
      const rng2 = new Mulberry32(seed);

      const seq1 = Array.from({ length: 50 }, () => rng1.next());
      const seq2 = Array.from({ length: 50 }, () => rng2.next());
      expect(seq1).toEqual(seq2);
    });

    it('generates uniform numbers strictly in [0, 1)', () => {
      const rng = new Mulberry32(123456789);
      for (let i = 0; i < 10000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('strictly respects nextInt(min, max) bounds inclusive', () => {
      const rng = new Mulberry32(987654321);
      const min = 3;
      const max = 7;
      const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

      for (let i = 0; i < 5000; i++) {
        const n = rng.nextInt(min, max);
        expect(n).toBeGreaterThanOrEqual(min);
        expect(n).toBeLessThanOrEqual(max);
        expect(Number.isInteger(n)).toBe(true);
        counts[n]++;
      }

      // Assert all numbers hit and reasonably balanced
      for (let i = min; i <= max; i++) {
        expect(counts[i]).toBeGreaterThan(700);
      }
    });

    it('shuffles arrays without mutating original and maintains all elements', () => {
      const rng = new Mulberry32(42);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = rng.shuffle(original);

      expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // Unmutated
      expect(shuffled).not.toEqual(original); // Actually shuffled
      expect([...shuffled].sort((a, b) => a - b)).toEqual(original); // Conservation
    });

    it('forks a child generator with independent deterministic state', () => {
      const rng = new Mulberry32(12345);
      const child = rng.fork();
      expect(child.next()).not.toBe(rng.next());
    });
  });

  describe('defaultPrng', () => {
    it('produces valid integers and choices', () => {
      const n = defaultPrng.nextInt(10, 20);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);

      const choice = defaultPrng.nextChoice(['apple', 'banana', 'orange']);
      expect(['apple', 'banana', 'orange']).toContain(choice);
    });
  });
});
