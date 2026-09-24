import React, { useState } from 'react';
import { useTablePractice } from './hooks/useTablePractice';
import { TableSelector } from './components/TableSelector';
import { TableLearnView } from './components/TableLearnView';
import { TablePracticeCard } from './components/TablePracticeCard';
import { TableSummaryModal } from './components/TableSummaryModal';
import { TableMasteryCard } from './components/TableMasteryCard';
import { TablePresetId, MultiplierPresetId, TablePracticeInputMode } from './types';
import { BarChart3, Sliders, Search } from 'lucide-react';

export interface TablesFeatureProps {
  useVirtualKeypad?: boolean;
  onXpEarned?: (xp: number) => void;
}

export const TablesFeature: React.FC<TablesFeatureProps> = ({
  useVirtualKeypad = false,
  onXpEarned,
}) => {
  const practice = useTablePractice({ onXpEarned });
  const [featureTab, setFeatureTab] = useState<'practice' | 'mastery'>('practice');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      <div className="flex items-center justify-center gap-2 border-b border-slate-800 pb-3 max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={() => setFeatureTab('practice')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            featureTab === 'practice'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
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
              : 'text-slate-400 hover:text-white bg-slate-800/60'
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
        /* Mastery Overview Grid across all 100 tables */
        <div className="space-y-4 max-w-6xl mx-auto w-full pb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table (e.g. 7, 43)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Showing {Object.keys(practice.masteryReports).length} Tables
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Object.values(practice.masteryReports)
              .filter((rep) => (searchQuery ? rep.tableNumber.toString().includes(searchQuery) : true))
              .map((rep) => (
                <TableMasteryCard
                  key={rep.tableNumber}
                  report={rep}
                  compact
                  onLearn={(t) => {
                    practice.startLearn(t);
                  }}
                  onPractice={(t) => {
                    practice.tableConfigHook.setSelectedTables([t]);
                    practice.startPractice({ selectedTables: [t] });
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* Summary Modal on session finish */}
      <TableSummaryModal
        isOpen={practice.status === 'SUMMARY'}
        summary={practice.summary}
        onRestart={practice.restartSession}
        onClose={practice.exitToConfig}
      />
    </div>
  );
};
