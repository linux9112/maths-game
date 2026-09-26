import React, { useCallback } from 'react';
import { Compass } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

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

  // The closest candidate is the exact answer
  const closestCandidate = actual;

  // Generate 3 plausible but distant estimates
  const candidatesSet = new Set<number>([closestCandidate]);
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
  const { isDark } = useTheme();

  const customGenerator = useCallback((_cfg: GameConfig, index: number): Question => {
    const r = generateEstimateRound();
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
      metadata: r,
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

  const theme = getGameTheme(config.gameId);
  const round = (state.currentQuestion?.metadata as EstimateRound) || null;
  const options = (state.currentQuestion?.options as number[]) || round?.candidates || [];

  return (
    <div
      className={`flex-1 flex flex-col h-full select-none overflow-hidden relative transition-colors duration-300 ${
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

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl shadow-2xl space-y-3 text-center border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Compass className="w-4 h-4" />
                Rapid Mental Estimation
              </span>

              <div className="text-3xl sm:text-5xl font-black font-mono py-2">
                {state.currentQuestion.promptText} ≈ ?
              </div>

              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Round numbers in your head and select the closest reasonable estimate!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              {options.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => submitAnswer(cand)}
                  className={`py-5 px-4 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-2xl border transition-all shadow-lg ${
                    isDark
                      ? 'bg-slate-800/90 hover:bg-purple-600 text-white border-slate-700 hover:border-purple-400'
                      : 'bg-white hover:bg-purple-50 text-slate-900 border-slate-200 hover:border-purple-500 shadow-md'
                  }`}
                >
                  ≈ {cand.toLocaleString()}
                </button>
              ))}
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
              <Compass className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Closest Answer
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Estimation challenge! Multi-digit calculations that reward fast rounding techniques
              over exact computation.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Estimation
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
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
        icon={<Compass className="w-5 h-5" style={{ color: theme.accent }} />}
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
