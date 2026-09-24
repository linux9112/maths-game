import { useState, useCallback, useEffect } from 'react';
import {
  TableSessionConfig,
  TablePresetId,
  MultiplierPresetId,
  TablePracticeInputMode,
  TABLE_PRESET_CONFIGS,
  MULTIPLIER_PRESET_CONFIGS,
} from '../types';
import {
  clampTable,
  sanitizeRange,
  createRangeArray,
  matchTablePreset,
  matchMultiplierPreset,
  toggleTableSelection,
} from '../utils/tableSelectionUtils';

const STORAGE_KEY = 'math_mastery_table_config_v1';

export function useTableConfig() {
  const [config, setConfig] = useState<TableSessionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.selectedTables) && parsed.selectedTables.length > 0) {
          const selected = parsed.selectedTables.map(clampTable);
          const range = sanitizeRange(
            parsed.customTableRange?.min ?? 1,
            parsed.customTableRange?.max ?? 10
          );
          const multRange = sanitizeRange(
            parsed.multiplierRange?.min ?? 1,
            parsed.multiplierRange?.max ?? 12
          );

          return {
            selectedTables: selected,
            selectionMode: parsed.selectionMode || 'preset',
            activePreset: parsed.activePreset || matchTablePreset(selected),
            customTableRange: range,
            multiplierPreset: parsed.multiplierPreset || '1-12',
            multiplierRange: multRange,
            difficulty: parsed.difficulty || 'normal',
            inputMode: parsed.inputMode || 'choice',
            questionTarget: parsed.questionTarget || 20,
          };
        }
      }
    } catch {
      // Fallback
    }

    return {
      selectedTables: createRangeArray(1, 10),
      selectionMode: 'preset',
      activePreset: '1-10',
      customTableRange: { min: 1, max: 10 },
      multiplierPreset: '1-12',
      multiplierRange: { min: 1, max: 12 },
      difficulty: 'normal',
      inputMode: 'choice',
      questionTarget: 20,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // LocalStorage quota safety
    }
  }, [config]);

  const selectPreset = useCallback((presetId: TablePresetId) => {
    const found = TABLE_PRESET_CONFIGS.find((p) => p.id === presetId);
    if (!found) return;
    const tables = createRangeArray(found.min, found.max);
    setConfig((prev) => ({
      ...prev,
      selectedTables: tables,
      activePreset: presetId,
      selectionMode: 'preset',
      customTableRange: { min: found.min, max: found.max },
    }));
  }, []);

  const setCustomTableRange = useCallback((min: number, max: number) => {
    const range = sanitizeRange(min, max);
    const tables = createRangeArray(range.min, range.max);
    const matchedPreset = matchTablePreset(tables);
    setConfig((prev) => ({
      ...prev,
      selectedTables: tables,
      selectionMode: 'range',
      activePreset: matchedPreset,
      customTableRange: range,
    }));
  }, []);

  const toggleTable = useCallback((tableNum: number) => {
    setConfig((prev) => {
      const nextTables = toggleTableSelection(prev.selectedTables, tableNum);
      const matchedPreset = matchTablePreset(nextTables);
      return {
        ...prev,
        selectedTables: nextTables,
        selectionMode: 'multi',
        activePreset: matchedPreset,
      };
    });
  }, []);

  const setSelectedTables = useCallback((tables: number[]) => {
    if (!tables || tables.length === 0) return;
    const sorted = Array.from(new Set(tables.map(clampTable))).sort((a, b) => a - b);
    const matchedPreset = matchTablePreset(sorted);
    setConfig((prev) => ({
      ...prev,
      selectedTables: sorted,
      selectionMode: 'multi',
      activePreset: matchedPreset,
    }));
  }, []);

  const selectMultiplierPreset = useCallback((presetId: MultiplierPresetId) => {
    const found = MULTIPLIER_PRESET_CONFIGS.find((p) => p.id === presetId);
    if (!found) return;
    setConfig((prev) => ({
      ...prev,
      multiplierPreset: presetId,
      multiplierRange: { min: found.min, max: found.max },
    }));
  }, []);

  const setCustomMultiplierRange = useCallback((min: number, max: number) => {
    const range = sanitizeRange(min, max);
    const matchedPreset = matchMultiplierPreset(range);
    setConfig((prev) => ({
      ...prev,
      multiplierPreset: matchedPreset,
      multiplierRange: range,
    }));
  }, []);

  const setInputMode = useCallback((inputMode: TablePracticeInputMode) => {
    setConfig((prev) => ({ ...prev, inputMode }));
  }, []);

  const setDifficulty = useCallback((difficulty: TableSessionConfig['difficulty']) => {
    setConfig((prev) => ({ ...prev, difficulty }));
  }, []);

  const setQuestionTarget = useCallback((questionTarget: number) => {
    setConfig((prev) => ({ ...prev, questionTarget }));
  }, []);

  const totalFactsCount =
    config.selectedTables.length * (config.multiplierRange.max - config.multiplierRange.min + 1);

  return {
    config,
    selectPreset,
    setCustomTableRange,
    toggleTable,
    setSelectedTables,
    selectMultiplierPreset,
    setCustomMultiplierRange,
    setInputMode,
    setDifficulty,
    setQuestionTarget,
    totalFactsCount,
  };
}
