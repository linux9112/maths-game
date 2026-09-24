import React, { useState, useCallback } from 'react';
import { Compass } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';

interface EstimateRound {
  promptText: string;
  actualAnswer: number;
  closestCandidate: number;
  candidates: number[];
}

function generateEstimateRound(): EstimateRound {
  // Complex multi-digit multiplication or addition
  const a = 19 + Math.floor(Math.random() * 80); // 19 to 98
  const b = 11 + Math.floor(Math.random() * 88); // 11 to 98
  const actual = a * b;

  // The closest candidate is the exact answer (or rounded to nearest 10)
  const closestCandidate = actual;

  // Generate 3 plausible but distant estimates
  const candidatesSet = new Set<number>([closestCandidate]);
  // Round estimation offsets: e.g. round a and b incorrectly
  candidatesSet.add(Math.round(actual * 0.75));
  candidatesSet.add(Math.round(actual * 1.35));
  candidatesSet.add(Math.round(actual * 1.6));

  while (candidatesSet.size < 4) {
    candidatesSet.add(Math.round(actual * (0.5 + Math.random())));
  }

  const candidates = Array.from(candidatesSet).sort(() => Math.random() - 0.5);

  return {
    promptText: `${a} × ${b}`,
    actualAnswer: actual,
    closestCandidate,
    candidates,
  };
}

export interface ClosestAnswerGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const ClosestAnswerGame: React.FC<ClosestAnswerGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const [round, setRound] = useState<EstimateRound>(() => generateEstimateRound());

  const customGenerator = useCallback((_cfg: GameConfig, index: number): Question => {
    const r = generateEstimateRound();
    setRound(r);
    return {
      id: `closest_estimate_${index}_${r.actualAnswer}`,
      operator: '*',
      operandA: 1,
      operandB: 1,
      answer: r.closestCandidate,
      promptText: r.promptText,
      displayOperator: '≈',
      options: r.candidates,
      answerStr: `≈ ${r.closestCandidate}`,
      difficulty: 'expert',
      category: 'game',
    };
  }, []);

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'closest_answer',
      title: 'Closest Answer',
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
            <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl space-y-3 text-center">
              <span className="text-xs uppercase tracking-widest font-black text-cyan-400 flex items-center justify-center gap-1.5">
                <Compass className="w-4 h-4" />
                Rapid Mental Estimation
              </span>

              <div className="text-4xl sm:text-6xl font-black font-mono text-white py-2">
                {round.promptText} ≈ ?
              </div>

              <p className="text-xs text-slate-400">
                Round numbers in your head and select the closest reasonable estimate!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              {round.candidates.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => submitAnswer(cand)}
                  className="py-5 px-4 bg-slate-800/90 hover:bg-cyan-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-cyan-400 transition-all shadow-lg"
                >
                  ≈ {cand.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Compass className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Closest Answer</h2>
            <p className="text-xs text-slate-400">
              Estimation challenge! Multi-digit calculations that reward fast rounding techniques over exact computation.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
            >
              Start Estimation
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-cyan-400 animate-ping">
              {state.countdownValue === 0 ? 'ESTIMATE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="closest_answer"
        gameTitle="Closest Answer"
        category="Challenges"
        icon={<Compass className="w-5 h-5 text-cyan-400" />}
        gameDescription="Mental rounding & magnitude estimation under pressure."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Closest Answer"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
