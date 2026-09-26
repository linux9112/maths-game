import React, { useCallback } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { generateArithmeticFact } from '../../../core/math/arithmeticGenerator';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

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
    config.selectedOperators && config.selectedOperators.length > 0
      ? config.selectedOperators
      : ['*', '+'];
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
  const { isDark } = useTheme();

  const customGenerator = useCallback((cfg: GameConfig, index: number): Question => {
    const r = generateMistakeRound(cfg);
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
      metadata: r,
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

  const theme = getGameTheme(config.gameId);
  const round = (state.currentQuestion?.metadata as FindMistakeRound) || null;

  const handleSelectEquation = (idx: number) => {
    submitAnswer(idx);
  };

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
        {state.status === 'PLAYING' && round && (
          <div className="w-full space-y-6">
            <div
              className={`p-4 sm:p-5 rounded-3xl shadow-xl text-center space-y-1 border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-lg'
              }`}
            >
              <span
                className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Search className="w-4 h-4" />
                Error Detection
              </span>
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
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
                  className={`py-4 sm:py-5 px-5 sm:px-6 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-2xl border transition-all shadow-lg flex items-center justify-between group ${
                    isDark
                      ? 'bg-slate-800/90 hover:bg-slate-750 text-white border-slate-700 hover:border-orange-400'
                      : 'bg-white hover:bg-orange-50/60 text-slate-900 border-slate-200 hover:border-orange-500 shadow-md'
                  }`}
                >
                  <span className={`text-xs font-sans font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    #{eq.id + 1}
                  </span>
                  <span className="group-hover:text-orange-500 transition-colors">{eq.text}</span>
                  <AlertCircle
                    className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:text-orange-500 transition-all"
                  />
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
              <Search className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Find the Mistake
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Eagle-eye arithmetic audit! 4 equations are shown simultaneously; spot and click the
              single incorrect equation.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Hunting
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
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
        icon={<Search className="w-5 h-5" style={{ color: theme.accent }} />}
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
