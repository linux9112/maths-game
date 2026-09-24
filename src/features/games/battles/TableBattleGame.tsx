import React, { useState, useCallback } from 'react';
import { Swords } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';

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
  const [battleFact, setBattleFact] = useState<ComparisonFact>(() => generateTableBattle());

  const customGenerator = useCallback(
    (_cfg: GameConfig, index: number): Question => {
      const fact = generateTableBattle();
      setBattleFact(fact);
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

  const handleComparison = (code: number) => {
    submitAnswer(code);
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

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {state.status === 'PLAYING' && (
          <div className="w-full space-y-6">
            {/* Duel Arena Card */}
            <div className="p-4 sm:p-8 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl space-y-4 sm:space-y-6 text-center">
              <span className="text-xs uppercase tracking-widest font-black text-amber-400 flex items-center justify-center gap-1.5">
                <Swords className="w-4 h-4" />
                Which Side Is Greater?
              </span>

              {/* Side-by-Side Dual Equation Display */}
              <div className="flex items-center justify-around gap-2 sm:gap-3 py-2 sm:py-4">
                <div className="flex-1 p-2.5 sm:p-5 bg-slate-800/80 rounded-2xl border border-indigo-500/40 font-mono font-black text-lg sm:text-3xl text-indigo-300 shadow-md">
                  {battleFact.leftExpr}
                </div>

                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs sm:text-sm flex-shrink-0">
                  VS
                </div>

                <div className="flex-1 p-2.5 sm:p-5 bg-slate-800/80 rounded-2xl border border-purple-500/40 font-mono font-black text-lg sm:text-3xl text-purple-300 shadow-md">
                  {battleFact.rightExpr}
                </div>
              </div>
            </div>

            {/* 3 Comparison Buttons */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => handleComparison(1)}
                className="py-3.5 sm:py-6 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl rounded-2xl border border-slate-700 hover:border-indigo-400 transition-all shadow-lg flex flex-col items-center justify-center"
              >
                <span>&lt;</span>
                <span className="text-[9px] sm:text-[10px] font-sans text-slate-400 mt-0.5 sm:mt-1 text-center">Left is Smaller</span>
              </button>

              <button
                type="button"
                onClick={() => handleComparison(2)}
                className="py-3.5 sm:py-6 bg-slate-800 hover:bg-amber-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl rounded-2xl border border-slate-700 hover:border-amber-400 transition-all shadow-lg flex flex-col items-center justify-center"
              >
                <span>=</span>
                <span className="text-[9px] sm:text-[10px] font-sans text-slate-400 mt-0.5 sm:mt-1 text-center">Equal</span>
              </button>

              <button
                type="button"
                onClick={() => handleComparison(3)}
                className="py-3.5 sm:py-6 bg-slate-800 hover:bg-purple-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl rounded-2xl border border-slate-700 hover:border-purple-400 transition-all shadow-lg flex flex-col items-center justify-center"
              >
                <span>&gt;</span>
                <span className="text-[9px] sm:text-[10px] font-sans text-slate-400 mt-0.5 sm:mt-1 text-center">Left is Greater</span>
              </button>
            </div>
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Swords className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Table Battle</h2>
            <p className="text-xs text-slate-400">
              Pit times-table facts head-to-head! Determine which calculation product is greater, smaller, or equal.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
            >
              Start Battle
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-amber-400 animate-ping">
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
        icon={<Swords className="w-5 h-5 text-amber-400" />}
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
