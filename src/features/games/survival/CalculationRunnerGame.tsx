import React, { useState, useEffect } from 'react';
import { Footprints, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useGameLoop } from '../shared/useGameLoop';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

type LaneIndex = 0 | 1 | 2; // 0 = Left, 1 = Center, 2 = Right

interface GateOption {
  lane: LaneIndex;
  value: number;
  isCorrect: boolean;
}

export interface CalculationRunnerGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const CalculationRunnerGame: React.FC<CalculationRunnerGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'calculation_runner',
      title: 'Calculation Runner',
      category: 'Survival',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 20,
      ...initialConfig,
    },
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

  // Runner lane position (0, 1, 2)
  const [runnerLane, setRunnerLane] = useState<LaneIndex>(1);
  const [gateDistance, setGateDistance] = useState<number>(100); // 100% to 0% (approaching)

  // Lane gates with answers
  const [laneGates, setLaneGates] = useState<GateOption[]>([]);

  // Update lane gates when question changes
  useEffect(() => {
    if (state.currentQuestion && state.currentQuestion.options) {
      const correctAns = state.currentQuestion.answer;
      // Pick 3 options for the 3 lanes
      const opts = state.currentQuestion.options.slice(0, 3);
      if (!opts.includes(correctAns)) {
        opts[0] = correctAns;
      }
      // Shuffle options for lanes
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      setLaneGates([
        { lane: 0, value: shuffled[0], isCorrect: shuffled[0] === correctAns },
        { lane: 1, value: shuffled[1], isCorrect: shuffled[1] === correctAns },
        { lane: 2, value: shuffled[2], isCorrect: shuffled[2] === correctAns },
      ]);
      setGateDistance(100);
    }
  }, [state.currentQuestion]);

  // Runner game loop: gates approach runner
  useGameLoop({
    isPaused: state.status !== 'PLAYING',
    onUpdate: (deltaSec) => {
      setGateDistance((prev) => {
        const speed = 25; // % per second
        const next = prev - speed * deltaSec;
        if (next <= 12) {
          // Gate reached runner! Check if runner's lane is correct
          const activeGate = laneGates.find((g) => g.lane === runnerLane);
          if (activeGate) {
            submitAnswer(activeGate.value);
          }
          return 100;
        }
        return next;
      });
    },
  });

  const switchLane = (lane: LaneIndex) => {
    setRunnerLane(lane);
    audio.playButtonTap();
  };

  // Keyboard left/right listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (state.status !== 'PLAYING') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setRunnerLane((prev) => (prev > 0 ? ((prev - 1) as LaneIndex) : prev));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setRunnerLane((prev) => (prev < 2 ? ((prev + 1) as LaneIndex) : prev));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state.status]);

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

      {/* 3-Lane Perspective Runner Track */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-between p-2.5 sm:p-4 min-h-0">
        {/* Active Equation Header */}
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border shadow-xl text-center backdrop-blur-md z-10 transition-colors ${
              isDark
                ? 'bg-slate-900/90 border-slate-700 shadow-slate-950/80'
                : 'bg-white/95 border-slate-200 shadow-lg'
            }`}
          >
            <span
              className="text-[10px] uppercase tracking-widest font-black"
              style={{ color: theme.accent }}
            >
              Solve & Switch To Safe Lane
            </span>
            <div className="text-2xl sm:text-4xl font-black font-mono mt-0.5">
              {state.currentQuestion.promptText}
            </div>
          </div>
        )}

        {/* 3 Lane Track Area */}
        <div
          className={`w-full max-w-md flex-1 relative flex justify-between my-2 border-x-2 rounded-2xl overflow-hidden shadow-inner transition-colors ${
            isDark
              ? 'border-slate-700 bg-slate-900/40'
              : 'border-slate-300 bg-white/40'
          }`}
        >
          {/* Lane dividers */}
          <div className={`absolute inset-y-0 left-1/3 w-0.5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-300'} border-dashed`} />
          <div className={`absolute inset-y-0 left-2/3 w-0.5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-300'} border-dashed`} />

          {/* Approaching Gates */}
          {state.status === 'PLAYING' && (
            <div
              style={{
                bottom: `${100 - gateDistance}%`,
                transition: 'bottom 0.1s linear',
              }}
              className="absolute inset-x-0 flex justify-around items-center z-10 px-2"
            >
              {laneGates.map((gate) => (
                <div
                  key={gate.lane}
                  onClick={() => switchLane(gate.lane)}
                  className="w-20 xs:w-24 sm:w-28 py-2 sm:py-2.5 rounded-xl text-center font-mono font-black text-base sm:text-xl text-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: theme.accent,
                    borderColor: '#FFF',
                  }}
                >
                  {gate.value}
                </div>
              ))}
            </div>
          )}

          {/* Runner Avatar at Bottom */}
          <div className="absolute bottom-4 inset-x-0 flex justify-around items-center z-20 px-2 pointer-events-none">
            {([0, 1, 2] as const).map((lane) => (
              <div key={lane} className="w-20 xs:w-24 sm:w-28 flex justify-center">
                {runnerLane === lane && (
                  <div
                    className="p-2 sm:p-3 rounded-2xl shadow-xl border-2 border-white animate-bounce"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Footprints className="w-6 h-6 sm:w-8 sm:h-8 text-white -rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lane Switch Buttons (Mobile Friendly) */}
        {state.status === 'PLAYING' && (
          <div className="grid grid-cols-3 gap-2 w-full max-w-md z-20">
            <button
              type="button"
              onClick={() => switchLane(0)}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-1 transition-all ${
                runnerLane === 0
                  ? 'text-white font-black shadow-lg'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              style={runnerLane === 0 ? { backgroundColor: theme.accent, borderColor: theme.accent } : {}}
            >
              <ArrowLeft className="w-4 h-4" /> Left
            </button>
            <button
              type="button"
              onClick={() => switchLane(1)}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-1 transition-all ${
                runnerLane === 1
                  ? 'text-white font-black shadow-lg'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              style={runnerLane === 1 ? { backgroundColor: theme.accent, borderColor: theme.accent } : {}}
            >
              Center
            </button>
            <button
              type="button"
              onClick={() => switchLane(2)}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-1 transition-all ${
                runnerLane === 2
                  ? 'text-white font-black shadow-lg'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              style={runnerLane === 2 ? { backgroundColor: theme.accent, borderColor: theme.accent } : {}}
            >
              Right <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm z-30">
            <div
              className={`p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border backdrop-blur-md ${
                isDark
                  ? 'bg-slate-900/95 border-slate-700 text-white shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
              }`}
            >
              <div
                className="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center"
                style={{
                  backgroundColor: `${theme.accent}20`,
                  borderColor: `${theme.accent}40`,
                  color: theme.accent,
                }}
              >
                <Footprints className="w-8 h-8 -rotate-90" />
              </div>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Calculation Runner
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Run along 3 lanes! Solve the equation and steer into the lane gate carrying the
                correct answer before impact.
              </p>
              <button
                type="button"
                onClick={openPreFlight}
                className="w-full py-3 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Start Running
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
              {state.countdownValue === 0 ? 'RUN!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="calculation_runner"
        gameTitle="Calculation Runner"
        category="Survival"
        icon={<Footprints className="w-5 h-5 -rotate-90" style={{ color: theme.accent }} />}
        gameDescription="3-lane math runner. Switch lanes to pass through the correct gate."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Calculation Runner"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
