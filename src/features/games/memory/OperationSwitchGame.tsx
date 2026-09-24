import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';

export interface OperationSwitchGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const OperationSwitchGame: React.FC<OperationSwitchGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const engine = useGameEngine({
    initialConfig: {
      gameId: 'operation_switch',
      title: 'Operation Switch',
      category: 'Memory',
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

  // Track operator changes to display visual switch flash
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [switchAlert, setSwitchAlert] = useState<boolean>(false);

  useEffect(() => {
    if (state.currentQuestion) {
      if (lastOperator && lastOperator !== state.currentQuestion.operator) {
        setSwitchAlert(true);
        audio.playWarning();
        const timer = setTimeout(() => setSwitchAlert(false), 1200);
        return () => clearTimeout(timer);
      }
      setLastOperator(state.currentQuestion.operator);
    }
  }, [state.currentQuestion, lastOperator, audio]);

  const handleChoice = (ans: number) => {
    if (!state.currentQuestion) return;
    submitAnswer(ans);
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
        {/* Switch Alert Banner */}
        {switchAlert && (
          <div className="absolute top-2 px-4 py-1.5 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-lg animate-bounce flex items-center gap-1.5 z-30">
            <AlertTriangle className="w-4 h-4" />
            OPERATOR SWITCH! WATCH THE SYMBOL
          </div>
        )}

        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-6">
            <div
              className={`w-full p-8 rounded-3xl text-center border shadow-2xl transition-all ${
                state.feedback === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/40 scale-105'
                  : state.feedback === 'incorrect'
                  ? 'bg-red-950/40 border-red-500/60 shadow-red-900/40 animate-shake'
                  : 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
              }`}
            >
              <span className="text-xs uppercase tracking-widest font-black text-indigo-400 flex items-center justify-center gap-1.5 mb-2">
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                Cognitive Switch
              </span>

              <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white py-2">
                {state.currentQuestion.operandA}{' '}
                <span className="text-amber-400 font-extrabold underline decoration-amber-400/60 underline-offset-8">
                  {state.currentQuestion.displayOperator}
                </span>{' '}
                {state.currentQuestion.operandB}
              </div>
            </div>

            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-3 w-full">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    className="py-5 px-4 bg-slate-800/90 hover:bg-indigo-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-indigo-400 transition-all shadow-lg"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Operation Switch</h2>
            <p className="text-xs text-slate-400">
              Test cognitive flexibility! The active operator dynamically flips between +, −, ×, and ÷. Stay focused and adapt instantly.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Start Switch Drill
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-indigo-400 animate-ping">
              {state.countdownValue === 0 ? 'SWITCH!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="operation_switch"
        gameTitle="Operation Switch"
        category="Memory"
        icon={<RefreshCw className="w-5 h-5 text-indigo-400" />}
        gameDescription="Cognitive flexibility agility test. Dynamically adapt as operators switch unexpectedly."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Operation Switch"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
