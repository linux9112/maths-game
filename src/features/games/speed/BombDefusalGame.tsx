import React, { useState } from 'react';
import { Bomb, Scissors, Flame } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useGameLoop } from '../shared/useGameLoop';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

interface Wire {
  id: number;
  colorName: string;
  colorClass: string;
  isCut: boolean;
}

const WIRE_COLORS = [
  { colorName: 'Crimson Wire', colorClass: 'bg-red-500 border-red-400 text-white' },
  { colorName: 'Cobalt Wire', colorClass: 'bg-blue-500 border-blue-400 text-white' },
  { colorName: 'Emerald Wire', colorClass: 'bg-emerald-500 border-emerald-400 text-white' },
  { colorName: 'Amber Wire', colorClass: 'bg-amber-500 border-amber-400 text-white' },
  { colorName: 'Amethyst Wire', colorClass: 'bg-purple-500 border-purple-400 text-white' },
];

export interface BombDefusalGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const BombDefusalGame: React.FC<BombDefusalGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

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

  const theme = getGameTheme(config.gameId);

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

      {/* Bomb Module Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-lg mx-auto w-full my-auto relative">
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div
            className={`w-full border-2 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl space-y-2.5 sm:space-y-4 backdrop-blur-md transition-colors ${
              isDark
                ? 'bg-slate-900/90 border-slate-700 shadow-slate-950/80'
                : 'bg-white/95 border-slate-200 shadow-xl'
            }`}
          >
            {/* Detonator Digital Ticking Header */}
            <div className={`flex items-center justify-between border-b pb-2 sm:pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Bomb className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 animate-pulse" />
                <span className={`font-mono font-black text-xs sm:text-sm uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {currentWire.colorName}
                </span>
              </div>

              {/* Digital Fuse Clock */}
              <div
                className={`font-mono font-black text-xl sm:text-2xl px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl border shadow-inner ${
                  isDark
                    ? 'bg-slate-950 text-red-400 border-red-900/60'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}
              >
                {wireFuseSec.toFixed(1)}s
              </div>
            </div>

            {/* Spark Fuse Line */}
            <div className="space-y-0.5 sm:space-y-1">
              <div className={`flex justify-between text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Fuse Burn</span>
                <span className="text-red-500 flex items-center gap-1 font-bold">
                  <Flame className="w-3 h-3" />
                  Active
                </span>
              </div>
              <div className={`w-full h-1.5 sm:h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-yellow-300 transition-all duration-100"
                  style={{ width: `${fusePercent}%` }}
                />
              </div>
            </div>

            {/* Wire Visual Representation */}
            <div className="flex justify-between gap-1.5 sm:gap-2 py-1 sm:py-2">
              {wires.map((w) => (
                <div key={w.id} className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1">
                  <div
                    className={`w-full h-6 sm:h-8 rounded-lg border flex items-center justify-center transition-all ${
                      w.isCut
                        ? isDark
                          ? 'bg-slate-800 border-slate-700 opacity-40'
                          : 'bg-slate-200 border-slate-300 opacity-40'
                        : `${w.colorClass} shadow-md`
                    }`}
                  >
                    {w.isCut && <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    #{w.id + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Question Code Matrix */}
            <div
              className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-center shadow-inner ${
                isDark
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className="text-[9px] sm:text-[10px] uppercase tracking-widest font-mono font-bold mb-0.5 sm:mb-1"
                style={{ color: theme.accent }}
              >
                Defusal Code
              </div>
              <div className="font-mono font-black text-2xl sm:text-4xl leading-tight">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {/* Cut Choice Buttons */}
            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCut(opt)}
                    className={`py-2.5 sm:py-3.5 px-2.5 sm:px-3 active:scale-95 font-mono font-black text-base sm:text-xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex items-center justify-center gap-1.5 sm:gap-2 ${
                      isDark
                        ? 'bg-slate-800 hover:bg-red-600 text-white border-slate-700 hover:border-red-400'
                        : 'bg-white hover:bg-red-50 text-slate-900 border-slate-200 hover:border-red-500'
                    }`}
                  >
                    <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-red-500 flex-shrink-0" />
                    <span>Cut: {opt}</span>
                  </button>
                ))}
              </div>
            )}
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
              <Bomb className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Bomb Defusal
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Cut the correct wires before their fuses burn down. Mistakes burn fuses twice as fast!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Arm & Defuse
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
        icon={<Bomb className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Cut arithmetic wires before fuses expire. Fast thinking under countdown pressure."
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
