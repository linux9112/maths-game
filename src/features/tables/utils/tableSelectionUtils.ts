import {
  TablePresetId,
  TABLE_PRESET_CONFIGS,
  MultiplierPresetId,
  MULTIPLIER_PRESET_CONFIGS,
  NumberRange,
} from '../types';

export const MIN_TABLE = 1;
export const MAX_TABLE = 100;
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 100;

export const PRIMES_UP_TO_100: readonly number[] = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
  31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97,
] as const;

export function clampTable(val: number): number {
  if (isNaN(val)) return 1;
  return Math.max(MIN_TABLE, Math.min(MAX_TABLE, Math.floor(val)));
}

export function clampMultiplier(val: number): number {
  if (isNaN(val)) return 1;
  return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, Math.floor(val)));
}

export function sanitizeRange(min: number, max: number, maxAllowed = 100): NumberRange {
  const cMin = Math.max(1, Math.min(maxAllowed, Math.floor(isNaN(min) ? 1 : min)));
  const cMax = Math.max(1, Math.min(maxAllowed, Math.floor(isNaN(max) ? 1 : max)));
  return {
    min: Math.min(cMin, cMax),
    max: Math.max(cMin, cMax),
  };
}

export function createRangeArray(min: number, max: number): number[] {
  const { min: start, max: end } = sanitizeRange(min, max);
  const arr: number[] = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }
  return arr;
}

export function matchTablePreset(tables: readonly number[]): TablePresetId {
  if (!tables || tables.length === 0) return 'custom';
  const sorted = [...tables].sort((a, b) => a - b);
  for (const preset of TABLE_PRESET_CONFIGS) {
    if (sorted.length === preset.tableCount && sorted[0] === preset.min && sorted[sorted.length - 1] === preset.max) {
      const matchesSequential = sorted.every((v, i) => v === preset.min + i);
      if (matchesSequential) return preset.id;
    }
  }
  return 'custom';
}

export function matchMultiplierPreset(range: NumberRange): MultiplierPresetId {
  for (const preset of MULTIPLIER_PRESET_CONFIGS) {
    if (range.min === preset.min && range.max === preset.max) {
      return preset.id;
    }
  }
  return 'custom';
}

export function toggleTableSelection(current: readonly number[], table: number): number[] {
  const target = clampTable(table);
  const set = new Set(current);
  if (set.has(target)) {
    if (set.size <= 1) {
      return [...set];
    }
    set.delete(target);
  } else {
    set.add(target);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function getPrimeTables(max = 100): number[] {
  return PRIMES_UP_TO_100.filter((p) => p <= max);
}

export function getEvenTables(min = 1, max = 100): number[] {
  const evens: number[] = [];
  for (let i = Math.max(2, min % 2 === 0 ? min : min + 1); i <= max; i += 2) {
    evens.push(i);
  }
  return evens;
}

export function getOddTables(min = 1, max = 100): number[] {
  const odds: number[] = [];
  for (let i = Math.max(1, min % 2 !== 0 ? min : min + 1); i <= max; i += 2) {
    odds.push(i);
  }
  return odds;
}
