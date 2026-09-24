import React, { useState } from 'react';
import { Bomb, Scissors, Flame } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useGameLoop } from '../shared/useGameLoop';

interface Wire {
  id: number;
  colorName: string;
  colorClass: string;
  isCut: boolean;
}

const WIRE_COLORS = [
  { colorName: 'Crimson Wire', colorClass: 'bg-red-500 border-red-400' },
  { colorName: 'Cobalt Wire', colorClass: 'bg-blue-500 border-blue-400' },
  { colorName: 'Emerald Wire', colorClass: 'bg-emerald-500 border-emerald-400' },
  { colorName: 'Amber Wire', colorClass: 'bg-amber-500 border-amber-400' },
  { colorName: 'Amethyst Wire', colorClass: 'bg-purple-500 border-purple-400' },
];

export interface BombDefusalGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const BombDefusalGame: React.FC<BombDefusalGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const engine = useGameEngine({
    initialConfig: {
      gameId: 'bomb_defusal',
      title: 'Bomb Defusal',
      category: 'Speed',
      timeLimitSec: null, // Each wire has its own fuse
      mistakeLimit: 3,
      targetLength: 15,
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

  // Active wire timer state (starts at 7.0s per wire)
  const [wireFuseSec, setWireFuseSec] = useState<number>(7.0);
  const [activeWireIndex, setActiveWireIndex] = useState<number>(0);
  const [wires, setWires] = useState<Wire[]>(() =>
    WIRE_COLORS.map((w, idx) => ({ id: idx, ...w, isCut: false }))
  );

  // Wire fuse countdown loop
  useGameLoop({
    isPaused: state.status !== 'PLAYING',
    onUpdate: (deltaSec) => {
      setWireFuseSec((prev) => {
        const next = prev - deltaSec;
        if (next <= 2.5 && next > 0) {
          audio.playTick(false);
        }
        if (next <= 0) {
          // Wire detonated! Submit wrong answer to deduct life or explode
          submitAnswer(-999999);
          return 7.0;
        }
        return next;
      });
    },
  });

  const handleCut = (ans: number) => {
    if (!state.currentQuestion) return;
    const isCorrect = ans === state.currentQuestion.answer;
    submitAnswer(ans);

    if (isCorrect) {
      setWires((prev) =>
        prev.map((w, idx) => (idx === activeWireIndex ? { ...w, isCut: true } : w))
      );
      setActiveWireIndex((prev) => (prev + 1) % WIRE_COLORS.length);
      setWireFuseSec(7.0);
    } else {
      // Mistake burns wire fuse 2x faster (deduct 2s immediately)
      setWireFuseSec((prev) => Math.max(0.5, prev - 2.0));
    }
  };

  const currentWire = WIRE_COLORS[activeWireIndex % WIRE_COLORS.length];
  const fusePercent = Math.max(0, Math.min(100, (wireFuseSec / 7.0) * 100));

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

      {/* Bomb Module Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6">
            {/* Detonator Digital Ticking Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Bomb className="w-6 h-6 text-red-500 animate-pulse" />
                <span className="font-mono font-black text-sm uppercase tracking-widest text-slate-300">
                  {currentWire.colorName}
                </span>
              </div>

              {/* Digital Fuse Clock */}
              <div className="font-mono font-black text-2xl text-red-400 bg-slate-950 px-3 py-1 rounded-xl border border-red-900/60 shadow-inner">
                {wireFuseSec.toFixed(1)}s
              </div>
            </div>

            {/* Spark Fuse Line */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Fuse Burn</span>
                <span className="text-red-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Active
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-yellow-300 transition-all duration-100"
                  style={{ width: `${fusePercent}%` }}
                />
              </div>
            </div>

            {/* Wire Visual Representation */}
            <div className="flex justify-between gap-2 py-2">
              {wires.map((w) => (
                <div key={w.id} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-8 rounded-lg border flex items-center justify-center transition-all ${
                      w.isCut
                        ? 'bg-slate-800 border-slate-700 opacity-40'
                        : `${w.colorClass} shadow-md`
                    }`}
                  >
                    {w.isCut && <Scissors className="w-4 h-4 text-slate-500" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">#{w.id + 1}</span>
                </div>
              ))}
            </div>

            {/* Question Code Matrix */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-inner">
              <div className="text-[10px] uppercase tracking-widest font-mono text-indigo-400 mb-1">
                Defusal Code
              </div>
              <div className="font-mono font-black text-4xl text-white">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {/* Cut Choice Buttons */}
            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-3">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCut(opt)}
                    className="py-4 px-3 bg-slate-800 hover:bg-red-600 active:scale-95 text-white font-mono font-black text-xl rounded-2xl border border-slate-700 hover:border-red-400 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    <span>Cut: {opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <Bomb className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Bomb Defusal</h2>
            <p className="text-xs text-slate-400">
              Cut the correct wires before their fuses burn down. Mistakes burn fuses twice as fast!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Arm & Defuse
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-red-400 animate-ping">
              {state.countdownValue === 0 ? 'DEFUSE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="bomb_defusal"
        gameTitle="Bomb Defusal"
        category="Speed"
        icon={<Bomb className="w-5 h-5 text-red-400" />}
        gameDescription="Fast mental math under ticking wire fuses. Solve equations to snip wires."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Bomb Defusal"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
