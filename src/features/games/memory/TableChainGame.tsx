import React, { useCallback } from 'react';
import { Link2 } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

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
  const { isDark } = useTheme();

  // Custom question generator for the engine
  const customGenerator = useCallback(
    (_cfg: GameConfig, index: number): Question => {
      const pattern = generateChainPattern();
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
        metadata: pattern,
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

  const theme = getGameTheme(config.gameId);
  const chainPattern = (state.currentQuestion?.metadata as ChainPattern) || null;
  const choices = (state.currentQuestion?.options as number[]) || chainPattern?.choices || [];

  const handleSelectChoice = (ans: number) => {
    submitAnswer(ans);
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 select-none overflow-y-auto relative transition-colors duration-300 ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}
      style={{
        background: isDark
          ? `linear-gradient(180deg, ${theme.nightTop} 0%, ${theme.nightBottom} 100%)`
          : `linear-gradient(180deg, ${theme.dayTop} 0%, ${theme.dayBottom} 100%)`,
      }}
    >
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

      <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-xl mx-auto w-full my-auto relative min-h-0">
        {state.status === 'PLAYING' && chainPattern && (
          <div className="w-full space-y-3 sm:space-y-5">
            {/* Chain Sequence Display */}
            <div
              className={`p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl text-center space-y-2 sm:space-y-3 border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Link2 className="w-4 h-4" />
                Find The Missing Sequence Value
              </span>

              {/* Chain Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 py-2 sm:py-3">
                {chainPattern.sequence.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl font-mono font-black text-base sm:text-2xl border transition-all ${
                        item === '?'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-500 ring-4 ring-amber-500/30 animate-pulse'
                          : isDark
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      {item}
                    </div>
                    {idx < chainPattern.sequence.length - 1 && (
                      <span className={`${isDark ? 'text-slate-600' : 'text-slate-400'} font-bold text-base sm:text-xl`}>
                        →
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Identify the table sequence rule and select the number for '?'
              </p>
            </div>

            {/* Answer Choices */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectChoice(choice)}
                  className={`py-2.5 sm:py-4 px-3 active:scale-95 font-mono font-black text-lg sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md sm:shadow-lg ${
                    isDark
                      ? 'bg-slate-800/90 hover:bg-indigo-600 text-white border-slate-700 hover:border-indigo-400'
                      : 'bg-white hover:bg-indigo-50 text-slate-900 border-slate-200 hover:border-indigo-500 shadow-sm'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div
            className={`p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border backdrop-blur-md ${
              isDark
                ? 'bg-slate-900/95 border-slate-700 text-white shadow-slate-950/80'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div
              className="w-16 h-16 mx-auto rounded-3xl border flex items-center justify-center"
              style={{
                backgroundColor: `${theme.accent}20`,
                borderColor: `${theme.accent}40`,
                color: theme.accent,
              }}
            >
              <Link2 className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Table Chain
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Sequence pattern deduction! Identify the times-table interval rule and select the
              missing sequence number.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Chain Puzzle
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
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
        icon={<Link2 className="w-5 h-5" style={{ color: theme.accent }} />}
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
