import React, { useState, useCallback } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { generateArithmeticFact } from '../../../core/math/arithmeticGenerator';

interface EquationItem {
  id: number;
  text: string;
  isMistake: boolean;
  explanation: string;
}

interface FindMistakeRound {
  equations: EquationItem[];
  mistakeIndex: number;
}

function generateMistakeRound(config: GameConfig): FindMistakeRound {
  const ops: readonly MathOperator[] =
    config.selectedOperators.length > 0 ? config.selectedOperators : ['*', '+'];
  const mistakeIdx = Math.floor(Math.random() * 4); // which one is wrong (0, 1, 2, 3)

  const equations: EquationItem[] = [];

  for (let i = 0; i < 4; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const fact = generateArithmeticFact({ allowedOperators: [op], level: 2 });
    const sym = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';

    if (i === mistakeIdx) {
      // Inject error: off by ±1 to ±10
      const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 5));
      const wrongAnswer = fact.answer + delta;
      equations.push({
        id: i,
        text: `${fact.operandA} ${sym} ${fact.operandB} = ${wrongAnswer}`,
        isMistake: true,
        explanation: `Should be ${fact.operandA} ${sym} ${fact.operandB} = ${fact.answer}`,
      });
    } else {
      equations.push({
        id: i,
        text: `${fact.operandA} ${sym} ${fact.operandB} = ${fact.answer}`,
        isMistake: false,
        explanation: 'Correct equation',
      });
    }
  }

  return {
    equations,
    mistakeIndex: mistakeIdx,
  };
}

export interface FindMistakeGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const FindMistakeGame: React.FC<FindMistakeGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const [round, setRound] = useState<FindMistakeRound>(() =>
    generateMistakeRound({
      gameId: 'find_mistake',
      title: 'Find the Mistake',
      category: 'Challenges',
      selectedOperators: ['*', '+'],
      difficulty: 'normal',
      targetLength: 15,
      timeLimitSec: null,
      mistakeLimit: 3,
      isStressFree: false,
      inputMode: 'choice',
    })
  );

  const customGenerator = useCallback((cfg: GameConfig, index: number): Question => {
    const r = generateMistakeRound(cfg);
    setRound(r);
    return {
      id: `find_mistake_${index}_${r.mistakeIndex}`,
      operator: '*',
      operandA: 1,
      operandB: 1,
      answer: r.mistakeIndex,
      promptText: 'Spot the incorrect equation!',
      displayOperator: '≠',
      options: [0, 1, 2, 3],
      answerStr: `Equation #${r.mistakeIndex + 1}`,
      difficulty: 'normal',
      category: 'game',
    };
  }, []);

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'find_mistake',
      title: 'Find the Mistake',
      category: 'Challenges',
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

  const handleSelectEquation = (idx: number) => {
    submitAnswer(idx);
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
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-3xl shadow-xl text-center space-y-1">
              <span className="text-xs uppercase tracking-widest font-black text-red-400 flex items-center justify-center gap-1.5">
                <Search className="w-4 h-4" />
                Error Detection
              </span>
              <h3 className="text-lg font-bold text-white">
                3 of these are correct. Which ONE is WRONG?
              </h3>
            </div>

            {/* 4 Equation Cards */}
            <div className="grid grid-cols-1 gap-3 w-full">
              {round.equations.map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => handleSelectEquation(eq.id)}
                  className="py-5 px-6 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-red-400 transition-all shadow-lg flex items-center justify-between group"
                >
                  <span className="text-slate-400 text-xs font-sans">#{eq.id + 1}</span>
                  <span className="text-white group-hover:text-red-300">{eq.text}</span>
                  <AlertCircle className="w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Find the Mistake</h2>
            <p className="text-xs text-slate-400">
              Eagle-eye arithmetic audit! 4 equations are shown simultaneously; spot and click the single incorrect equation.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Start Hunting
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-red-400 animate-ping">
              {state.countdownValue === 0 ? 'SPOT IT!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="find_mistake"
        gameTitle="Find the Mistake"
        category="Challenges"
        icon={<Search className="w-5 h-5 text-red-400" />}
        gameDescription="Spot the single flawed equation among 4 arithmetic facts."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Find the Mistake"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
