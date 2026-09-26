import React, { useCallback } from 'react';
import { Swords } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

interface ComparisonFact {
  leftExpr: string;
  leftVal: number;
  rightExpr: string;
  rightVal: number;
  relation: '<' | '=' | '>';
  expectedAnswerCode: number; // 1: '<', 2: '=', 3: '>'
}

function generateTableBattle(): ComparisonFact {
  const t1 = 3 + Math.floor(Math.random() * 10);
  const m1 = 3 + Math.floor(Math.random() * 10);
  const t2 = 3 + Math.floor(Math.random() * 10);
  const m2 = 3 + Math.floor(Math.random() * 10);

  const leftVal = t1 * m1;
  const rightVal = t2 * m2;

  let relation: '<' | '=' | '>' = '=';
  let expectedAnswerCode = 2;

  if (leftVal < rightVal) {
    relation = '<';
    expectedAnswerCode = 1;
  } else if (leftVal > rightVal) {
    relation = '>';
    expectedAnswerCode = 3;
  }

  return {
    leftExpr: `${t1} × ${m1}`,
    leftVal,
    rightExpr: `${t2} × ${m2}`,
    rightVal,
    relation,
    expectedAnswerCode,
  };
}

export interface TableBattleGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const TableBattleGame: React.FC<TableBattleGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const customGenerator = useCallback(
    (_cfg: GameConfig, index: number): Question => {
      const fact = generateTableBattle();
      return {
        id: `table_battle_${index}_${fact.leftVal}_${fact.rightVal}`,
        operator: '*',
        operandA: fact.leftVal,
        operandB: fact.rightVal,
        answer: fact.expectedAnswerCode,
        promptText: `${fact.leftExpr}  vs  ${fact.rightExpr}`,
        displayOperator: 'vs',
        options: [1, 2, 3], // 1: <, 2: =, 3: >
        answerStr: fact.relation,
        difficulty: 'normal',
        category: 'game',
        metadata: fact,
      };
    },
    []
  );

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'table_battle',
      title: 'Table Battle',
      category: 'Battles',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 20,
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
  const battleFact = (state.currentQuestion?.metadata as ComparisonFact) || null;

  const handleComparison = (code: number) => {
    submitAnswer(code);
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

      <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-lg mx-auto w-full my-auto relative min-h-0">
        {state.status === 'PLAYING' && battleFact && (
          <div className="w-full space-y-3 sm:space-y-5">
            {/* Duel Arena Card */}
            <div
              className={`p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl space-y-2.5 sm:space-y-4 text-center border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-[10px] sm:text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Which Side Is Greater?
              </span>

              {/* Side-by-Side Dual Equation Display */}
              <div className="flex items-center justify-around gap-2 sm:gap-3 py-1.5 sm:py-3">
                <div
                  className={`flex-1 p-2 sm:p-4 rounded-xl sm:rounded-2xl border font-mono font-black text-base sm:text-2xl shadow-md ${
                    isDark
                      ? 'bg-slate-800/80 border-indigo-500/40 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-300 text-indigo-900'
                  }`}
                >
                  {battleFact.leftExpr}
                </div>

                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-400'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                >
                  VS
                </div>

                <div
                  className={`flex-1 p-2 sm:p-4 rounded-xl sm:rounded-2xl border font-mono font-black text-base sm:text-2xl shadow-md ${
                    isDark
                      ? 'bg-slate-800/80 border-purple-500/40 text-purple-300'
                      : 'bg-purple-50 border-purple-300 text-purple-900'
                  }`}
                >
                  {battleFact.rightExpr}
                </div>
              </div>
            </div>

            {/* 3 Comparison Buttons */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => handleComparison(1)}
                className={`py-2.5 sm:py-4 px-1 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-indigo-600 text-white border-slate-700 hover:border-indigo-400'
                    : 'bg-white hover:bg-indigo-50 text-slate-900 border-slate-200 hover:border-indigo-500 shadow-sm'
                }`}
              >
                <span>&lt;</span>
                <span
                  className={`text-[8px] sm:text-[10px] font-sans mt-0.5 text-center leading-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Left Smaller
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleComparison(2)}
                className={`py-2.5 sm:py-4 px-1 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-amber-600 text-white border-slate-700 hover:border-amber-400'
                    : 'bg-white hover:bg-amber-50 text-slate-900 border-slate-200 hover:border-amber-500 shadow-sm'
                }`}
              >
                <span>=</span>
                <span
                  className={`text-[8px] sm:text-[10px] font-sans mt-0.5 text-center leading-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Equal
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleComparison(3)}
                className={`py-2.5 sm:py-4 px-1 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-purple-600 text-white border-slate-700 hover:border-purple-400'
                    : 'bg-white hover:bg-purple-50 text-slate-900 border-slate-200 hover:border-purple-500 shadow-sm'
                }`}
              >
                <span>&gt;</span>
                <span
                  className={`text-[8px] sm:text-[10px] font-sans mt-0.5 text-center leading-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Left Greater
                </span>
              </button>
            </div>
          </div>
        )}

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
              <Swords className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Table Battle
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Pit times-table facts head-to-head! Determine which calculation product is greater,
              smaller, or equal.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Battle
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
              {state.countdownValue === 0 ? 'BATTLE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="table_battle"
        gameTitle="Table Battle"
        category="Battles"
        icon={<Swords className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Compare times-table facts head-to-head. Determine greater, lesser, or equal."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Table Battle"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
