import React from 'react';
import { useOperationPractice } from './hooks/useOperationPractice';
import { OperationSelector } from './components/OperationSelector';
import { LevelSelector } from './components/LevelSelector';
import { ArithmeticPractice } from './components/ArithmeticPractice';
import { OperationSummaryModal } from './components/OperationSummaryModal';
import { Button } from '../../components/common/Button';
import { Play, CheckCircle2, Keyboard } from 'lucide-react';

export interface OperationsFeatureProps {
  useVirtualKeypad: boolean;
  onXpEarned?: (xp: number) => void;
}

export const OperationsFeature: React.FC<OperationsFeatureProps> = ({
  useVirtualKeypad,
  onXpEarned,
}) => {
  const practice = useOperationPractice({ onXpEarned });

  // 1. CONFIGURING VIEW (Session Setup)
  if (practice.status === 'CONFIGURING') {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-2xl lg:max-w-3xl mx-auto w-full my-auto space-y-4 sm:space-y-6 py-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Arithmetic Operations Practice
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Master mental math addition, subtraction, multiplication, and exact division.
          </p>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 rounded-3xl bg-slate-800/90 border border-slate-700/80 shadow-xl space-y-5 sm:space-y-6">
          {/* Operation Selector */}
          <OperationSelector
            selectedOperators={practice.config.selectedOperators}
            onChange={(ops) => practice.updateConfig({ selectedOperators: ops })}
          />

          {/* Level Selector */}
          <LevelSelector
            selectedLevel={practice.config.level}
            selectedOperators={practice.config.selectedOperators}
            onSelectLevel={(lvl) => practice.updateConfig({ level: lvl })}
          />

          {/* Practice Mode Toggle: Mode A vs Mode B */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Input Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => practice.updateConfig({ inputMode: 'choice' })}
                className={`py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 ${
                  practice.config.inputMode === 'choice'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mode A (Choices 1–4)</span>
              </button>

              <button
                type="button"
                onClick={() => practice.updateConfig({ inputMode: 'direct' })}
                className={`py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 ${
                  practice.config.inputMode === 'direct'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>Mode B (Direct Typing)</span>
              </button>
            </div>
          </div>

          {/* Question Count Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Target Questions
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 20, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => practice.updateConfig({ questionCount: n })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    practice.config.questionCount === n
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                  }`}
                >
                  {n} Questions
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Play className="w-5 h-5 fill-current" />}
            onClick={() => practice.startSession()}
            className="w-full font-black text-base shadow-indigo-500/30 shadow-lg"
          >
            Start Operations Practice
          </Button>
        </div>
      </div>
    );
  }

  // 2. ACTIVE PRACTICING VIEW
  if (practice.status === 'PRACTICING' && practice.currentQuestion) {
    return (
      <ArithmeticPractice
        question={practice.currentQuestion}
        currentIndex={practice.currentIndex}
        totalQuestions={practice.totalQuestions}
        inputMode={practice.config.inputMode}
        combo={practice.currentCombo}
        score={practice.currentScore}
        useVirtualKeypad={useVirtualKeypad}
        onExit={practice.resetSession}
        selectedOptionIndex={practice.selectedOptionIndex}
        choiceFeedback={practice.choiceFeedback}
        onSelectOption={practice.handleSelectOption}
        inputValue={practice.inputValue}
        shakeKey={practice.shakeKey}
        inputFeedback={practice.inputFeedback}
        onDigit={practice.handleDigit}
        onBackspace={practice.handleBackspace}
        onClear={practice.handleClear}
        onSubmit={practice.handleSubmit}
        onInputChange={practice.setInputValue}
      />
    );
  }

  // 3. SUMMARY VIEW
  return (
    <OperationSummaryModal
      isOpen={practice.status === 'SUMMARY'}
      summary={practice.summary}
      onPlayAgain={practice.restartSession}
      onChangeSettings={practice.resetSession}
    />
  );
};

// Export alias for compatibility
export const OperationsPracticeView = OperationsFeature;
export type OperationsPracticeViewProps = OperationsFeatureProps;
