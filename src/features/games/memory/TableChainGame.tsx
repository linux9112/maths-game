import React, { useState, useCallback } from 'react';
import { Link2 } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';

interface ChainPattern {
  sequence: (number | '?')[];
  missingIndex: number;
  expectedAnswer: number;
  ruleExplanation: string;
  choices: number[];
}

function generateChainPattern(): ChainPattern {
  const step = 2 + Math.floor(Math.random() * 11); // 2 to 12
  const startMult = 1 + Math.floor(Math.random() * 3);
  const length = 5;
  const missingIndex = 2 + Math.floor(Math.random() * (length - 2)); // position 2 or 3

  const fullSequence: number[] = [];
  for (let i = 0; i < length; i++) {
    fullSequence.push((startMult + i) * step);
  }

  const expectedAnswer = fullSequence[missingIndex];
  const sequence: (number | '?')[] = fullSequence.map((val, idx) =>
    idx === missingIndex ? '?' : val
  );

  // Generate 4 plausible choices
  const choicesSet = new Set<number>([expectedAnswer]);
  choicesSet.add(expectedAnswer + step);
  choicesSet.add(Math.max(1, expectedAnswer - step));
  choicesSet.add(expectedAnswer + step * 2);
  while (choicesSet.size < 4) {
    choicesSet.add(expectedAnswer + Math.floor(Math.random() * 20) - 10);
  }

  const choices = Array.from(choicesSet).sort(() => Math.random() - 0.5);

  return {
    sequence,
    missingIndex,
    expectedAnswer,
    ruleExplanation: `Pattern adds +${step} each step (multiples of ${step})`,
    choices,
  };
}

export interface TableChainGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const TableChainGame: React.FC<TableChainGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const [chainPattern, setChainPattern] = useState<ChainPattern>(() => generateChainPattern());

  // Custom question generator for the engine
  const customGenerator = useCallback(
    (_cfg: GameConfig, index: number): Question => {
      const pattern = generateChainPattern();
      setChainPattern(pattern);
      return {
        id: `chain_${index}_${pattern.expectedAnswer}`,
        operator: '*',
        operandA: pattern.expectedAnswer,
        operandB: 1,
        answer: pattern.expectedAnswer,
        promptText: pattern.sequence.join(' , '),
        displayOperator: '→',
        options: pattern.choices,
        answerStr: String(pattern.expectedAnswer),
        difficulty: 'normal',
        category: 'game',
      };
    },
    []
  );

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'table_chain',
      title: 'Table Chain',
      category: 'Memory',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 15,
      ...initialConfig,
    },
    customQuestionGenerator: customGenerator,
  });

  const {
    state,
    config,
    summaryData,
    openPreFlight,
    closePreFlight,
    startGame,
    submitAnswer,
    pause,
    resume,
    restart,
    forfeit,
    audio,
  } = engine;

  const handleSelectChoice = (ans: number) => {
    submitAnswer(ans);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
      <GameHUD
        state={state}
        config={config}
        onPause={pause}
        onResume={resume}
        onRestart={restart}
        onForfeit={() => {
          forfeit();
          onBackToHub?.();
        }}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl mx-auto w-full relative">
        {state.status === 'PLAYING' && (
          <div className="w-full space-y-6">
            {/* Chain Sequence Display */}
            <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-center space-y-4">
              <span className="text-xs uppercase tracking-widest font-black text-indigo-400 flex items-center justify-center gap-1.5">
                <Link2 className="w-4 h-4" />
                Find The Missing Sequence Value
              </span>

              {/* Chain Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4">
                {chainPattern.sequence.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      className={`px-4 py-3 rounded-2xl font-mono font-black text-xl sm:text-2xl border transition-all ${
                        item === '?'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-4 ring-amber-500/30 animate-pulse'
                          : 'bg-slate-800 border-slate-700 text-white'
                      }`}
                    >
                      {item}
                    </div>
                    {idx < chainPattern.sequence.length - 1 && (
                      <span className="text-slate-600 font-bold text-xl">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <p className="text-xs text-slate-400">
                Identify the table sequence rule and select the number for '?'
              </p>
            </div>

            {/* Answer Choices */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {chainPattern.choices.map((choice, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectChoice(choice)}
                  className="py-5 px-3 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-indigo-400 transition-all shadow-lg"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Link2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Table Chain</h2>
            <p className="text-xs text-slate-400">
              Sequence pattern deduction! Identify the times-table interval rule and select the missing sequence number.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Start Chain Puzzle
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-indigo-400 animate-ping">
              {state.countdownValue === 0 ? 'SOLVE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="table_chain"
        gameTitle="Table Chain"
        category="Memory"
        icon={<Link2 className="w-5 h-5 text-indigo-400" />}
        gameDescription="Sequence pattern puzzle. Deduce times-table rules to find missing terms."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Table Chain"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
