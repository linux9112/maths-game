import React, { useState, useEffect } from 'react';
import { useTablePractice } from './hooks/useTablePractice';
import { TableSelector } from './components/TableSelector';
import { TableLearnView } from './components/TableLearnView';
import { TablePracticeCard } from './components/TablePracticeCard';
import { TableSummaryModal } from './components/TableSummaryModal';
import { TablePresetId, MultiplierPresetId, TablePracticeInputMode } from './types';
import { BarChart3, Sliders } from 'lucide-react';
import { TableMasteryHeatmap } from '../dashboard/components/TableMasteryHeatmap';

export interface TablesFeatureProps {
  useVirtualKeypad?: boolean;
  onXpEarned?: (xp: number) => void;
  initialSelectedTables?: number[];
  onConsumedInitialTables?: () => void;
}

export const TablesFeature: React.FC<TablesFeatureProps> = ({
  useVirtualKeypad = false,
  onXpEarned,
  initialSelectedTables,
  onConsumedInitialTables,
}) => {
  const practice = useTablePractice({ onXpEarned });
  const [featureTab, setFeatureTab] = useState<'practice' | 'mastery'>('practice');

  useEffect(() => {
    if (initialSelectedTables && initialSelectedTables.length > 0) {
      practice.tableConfigHook.setSelectedTables(initialSelectedTables);
      practice.startPractice({ selectedTables: initialSelectedTables });
      onConsumedInitialTables?.();
    }
  }, [initialSelectedTables]);

  // 1. Learn Mode View
  if (practice.status === 'LEARN') {
    return (
      <TableLearnView
        selectedTables={practice.config.selectedTables}
        multiplierRange={practice.config.multiplierRange}
        initialTable={practice.activeLearnTable}
        onBack={practice.exitToConfig}
        onStartPracticeWithTable={(t) => {
          practice.tableConfigHook.setSelectedTables([t]);
          practice.startPractice({ selectedTables: [t] });
        }}
      />
    );
  }

  // 2. Active Practice Session View
  if (practice.status === 'PRACTICING' && practice.currentQuestion) {
    return (
      <TablePracticeCard
        question={practice.currentQuestion}
        currentIndex={practice.currentIndex}
        totalQuestions={practice.totalQuestions}
        inputMode={practice.config.inputMode}
        combo={practice.currentCombo}
        useVirtualKeypad={useVirtualKeypad}
        onExit={practice.exitToConfig}
        selectedOptionIndex={practice.selectedOptionIndex}
        choiceFeedback={practice.choiceFeedback}
        onSelectOption={practice.handleSelectOption}
        inputValue={practice.inputValue}
        inputFeedback={practice.inputFeedback}
        shakeKey={practice.shakeKey}
        onChangeInput={practice.handleInputChange}
        onDigit={practice.handleDigit}
        onBackspace={practice.handleBackspace}
        onClear={practice.handleClear}
        onSubmit={practice.handleSubmit}
      />
    );
  }

  // 3. Configuring or Summary State
  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Sub-navigation tabs: Practice vs Mastery Overview */}
      <div className="flex items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={() => setFeatureTab('practice')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            featureTab === 'practice'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Practice & Learn</span>
        </button>
        <button
          type="button"
          onClick={() => setFeatureTab('mastery')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            featureTab === 'mastery'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Mastery Overview</span>
        </button>
      </div>

      {featureTab === 'practice' ? (
        <TableSelector
          config={practice.config}
          masteryReports={practice.masteryReports}
          onSelectPreset={(p: TablePresetId) => practice.tableConfigHook.selectPreset(p)}
          onChangeCustomRange={(min, max) => practice.tableConfigHook.setCustomTableRange(min, max)}
          onToggleTable={(t) => practice.tableConfigHook.toggleTable(t)}
          onSetSelectedTables={(ts) => practice.tableConfigHook.setSelectedTables(ts)}
          onSelectMultiplierPreset={(p: MultiplierPresetId) =>
            practice.tableConfigHook.selectMultiplierPreset(p)
          }
          onChangeMultiplierRange={(min, max) =>
            practice.tableConfigHook.setCustomMultiplierRange(min, max)
          }
          onSetInputMode={(mode: TablePracticeInputMode) =>
            practice.tableConfigHook.setInputMode(mode)
          }
          onSetQuestionTarget={(target) => practice.tableConfigHook.setQuestionTarget(target)}
          onStartLearn={(t) => practice.startLearn(t)}
          onStartPractice={() => practice.startPractice()}
        />
      ) : (
        /* Table Selection & Mastery Grid (1–100) */
        <div className="space-y-4 max-w-6xl mx-auto w-full pb-10">
          <TableMasteryHeatmap
            initialSelectedTables={practice.config.selectedTables}
            onPracticeTables={(tables) => {
              practice.tableConfigHook.setSelectedTables(tables);
              practice.startPractice({ selectedTables: tables });
            }}
            onPracticeTable={(t) => {
              practice.tableConfigHook.setSelectedTables([t]);
              practice.startPractice({ selectedTables: [t] });
            }}
          />
        </div>
      )}

      {/* Summary Modal on session finish */}
      <TableSummaryModal
        isOpen={practice.status === 'SUMMARY'}
        summary={practice.summary}
        onRestart={practice.restartSession}
        onClose={practice.exitToConfig}
        onStartWeaknessPractice={practice.startWeaknessPractice}
      />
    </div>
  );
};
