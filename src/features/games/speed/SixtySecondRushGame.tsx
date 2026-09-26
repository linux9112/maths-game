import React, { useState } from 'react';
import { Timer } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

export interface SixtySecondRushGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const SixtySecondRushGame: React.FC<SixtySecondRushGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'rush_60',
      title: '60-Second Rush',
      category: 'Speed',
      timeLimitSec: 60,
      mistakeLimit: null, // Timer-based game (no mistake out)
      targetLength: 'endless',
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
    addTimeSec,
    pause,
    resume,
    restart,
    forfeit,
    audio,
  } = engine;

  const theme = getGameTheme(config.gameId);
  const [typedInput, setTypedInput] = useState<string>('');
  const [streakNotification, setStreakNotification] = useState<string | null>(null);

  const handleSubmit = (ans: number) => {
    if (!state.currentQuestion) return;
    const isCorrect = Number(ans) === Number(state.currentQuestion.answer);
    if (isCorrect) {
      const nextCombo = state.combo + 1;
      if (nextCombo > 0 && nextCombo % 5 === 0) {
        addTimeSec(2);
        setStreakNotification('+2s Streak Extension!');
        setTimeout(() => {
          setStreakNotification(null);
        }, 1500);
      }
    }
    submitAnswer(ans);
    setTypedInput('');
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

      {/* Main Rush Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Rush Question Card */}
            <div
              className={`w-full p-8 rounded-3xl text-center border shadow-2xl transition-all relative backdrop-blur-md ${
                state.feedback === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/40 scale-105'
                  : state.feedback === 'incorrect'
                  ? 'bg-red-950/40 border-red-500/60 shadow-red-900/40 animate-shake'
                  : isDark
                  ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                  style={{ color: theme.accent }}
                >
                  <Timer className="w-4 h-4" />
                  Time Attack
                </span>
                {streakNotification && (
                  <span
                    data-testid="streak-extension-badge"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-500 border border-amber-400/50 shadow-lg shadow-amber-500/20 animate-bounce"
                  >
                    ⚡ {streakNotification}
                  </span>
                )}
              </div>
              <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight py-2">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {/* Input Options */}
            {config.inputMode === 'choice' && state.currentQuestion.options ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                {state.currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSubmit(opt)}
                    className={`py-5 px-4 active:scale-95 font-mono font-black text-2xl rounded-2xl border transition-all shadow-lg ${
                      isDark
                        ? 'bg-slate-800/90 hover:bg-amber-600 text-white border-slate-700 hover:border-amber-400'
                        : 'bg-white hover:bg-amber-50 text-slate-900 border-slate-200 hover:border-amber-500 shadow-md'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full flex gap-2">
                <input
                  type="number"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typedInput.trim() !== '') {
                      handleSubmit(Number(typedInput));
                    }
                  }}
                  autoFocus
                  placeholder="Answer..."
                  className={`flex-1 font-mono font-bold text-center text-2xl rounded-2xl px-4 py-4 border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-slate-900 text-white border-slate-700 focus:border-amber-500'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-amber-500 shadow-sm'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (typedInput.trim() !== '') handleSubmit(Number(typedInput));
                  }}
                  className="px-6 py-4 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg transition-all"
                  style={{ backgroundColor: theme.accent }}
                >
                  Submit
                </button>
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
              <Timer className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              60-Second Rush
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Answer as many arithmetic calculations as possible in 60 seconds! Earn speed multipliers
              and streak extensions.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start 60s Rush
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
              {state.countdownValue === 0 ? 'GO!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="rush_60"
        gameTitle="60-Second Rush"
        category="Speed"
        icon={<Timer className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Race against the 60-second clock. Rapid answers award speed bonus points."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="60-Second Rush"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
