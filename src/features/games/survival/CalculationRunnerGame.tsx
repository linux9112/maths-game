import React, { useState, useEffect } from 'react';
import { Footprints, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useGameLoop } from '../shared/useGameLoop';

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

      {/* 3-Lane Perspective Runner Track */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-between p-4">
        {/* Active Equation Header */}
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="px-6 py-3 bg-slate-900/90 rounded-2xl border border-slate-700 shadow-xl text-center backdrop-blur-sm z-10">
            <span className="text-[10px] uppercase tracking-widest font-black text-cyan-400">
              Solve & Switch To Safe Lane
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-white mt-0.5">
              {state.currentQuestion.promptText}
            </div>
          </div>
        )}

        {/* 3 Lane Track Area */}
        <div className="w-full max-w-md flex-1 relative flex justify-between my-2 border-x-2 border-slate-700 bg-slate-900/40 rounded-2xl overflow-hidden shadow-inner">
          {/* Lane dividers */}
          <div className="absolute inset-y-0 left-1/3 w-0.5 bg-slate-700/60 border-dashed" />
          <div className="absolute inset-y-0 left-2/3 w-0.5 bg-slate-700/60 border-dashed" />

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
                  className="w-20 xs:w-24 sm:w-28 py-2 sm:py-2.5 bg-indigo-600/90 border-2 border-cyan-400 rounded-xl text-center font-mono font-black text-base sm:text-xl text-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
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
                  <div className="p-2 sm:p-3 bg-cyan-500 rounded-2xl shadow-xl shadow-cyan-500/50 border-2 border-white animate-bounce">
                    <Footprints className="w-6 h-6 sm:w-8 sm:h-8 text-slate-950 -rotate-90" />
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
              className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-1 transition-all ${
                runnerLane === 0
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Left
            </button>
            <button
              type="button"
              onClick={() => switchLane(1)}
              className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-1 transition-all ${
                runnerLane === 1
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Center
            </button>
            <button
              type="button"
              onClick={() => switchLane(2)}
              className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-1 transition-all ${
                runnerLane === 2
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Right <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm z-30">
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Footprints className="w-8 h-8 -rotate-90" />
              </div>
              <h2 className="text-xl font-black text-white">Calculation Runner</h2>
              <p className="text-xs text-slate-400">
                Run along 3 lanes! Solve the equation and steer into the lane gate carrying the correct answer before impact.
              </p>
              <button
                type="button"
                onClick={openPreFlight}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
              >
                Start Running
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-cyan-400 animate-ping">
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
        icon={<Footprints className="w-5 h-5 text-cyan-400 -rotate-90" />}
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
