import React, { useState, useEffect, useRef } from 'react';
import { Skull, Swords } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useGameLoop } from '../shared/useGameLoop';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

interface BossProfile {
  name: string;
  title: string;
  maxHp: number;
  avatarIcon: string;
  attackIntervalSec: number;
}

const BOSS_ROSTER: BossProfile[] = [
  {
    name: 'Calculon the Destroyer',
    title: 'Lord of Regrouping',
    maxHp: 500,
    avatarIcon: '👾',
    attackIntervalSec: 8.0,
  },
  {
    name: 'Divisio the Dragon',
    title: 'Keeper of Remainders',
    maxHp: 800,
    avatarIcon: '🐉',
    attackIntervalSec: 7.0,
  },
  {
    name: 'Matrix Titan',
    title: 'Colossus of Dimensions',
    maxHp: 1200,
    avatarIcon: '🤖',
    attackIntervalSec: 6.0,
  },
];

export interface BossBattleGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const BossBattleGame: React.FC<BossBattleGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'boss_battle',
      title: 'Boss Battle Arena',
      category: 'Survival',
      timeLimitSec: null,
      mistakeLimit: 3,
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
    pause,
    resume,
    restart,
    forfeit,
    audio,
  } = engine;

  const theme = getGameTheme(config.gameId);

  const [activeBossIndex, setActiveBossIndex] = useState<number>(0);
  const currentBoss = BOSS_ROSTER[activeBossIndex % BOSS_ROSTER.length];

  const [bossHp, setBossHp] = useState<number>(currentBoss.maxHp);
  const [bossChargeSec, setBossChargeSec] = useState<number>(0);
  const [isBossHurt, setIsBossHurt] = useState<boolean>(false);
  const [isPlayerHurt, setIsPlayerHurt] = useState<boolean>(false);
  const [lastAttackEffect, setLastAttackEffect] = useState<{
    damage: number;
    isCrit: boolean;
  } | null>(null);

  const questionStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [state.currentQuestion, state.status]);

  // Reset Boss HP on start
  useEffect(() => {
    if (state.status === 'PLAYING') {
      setBossHp(currentBoss.maxHp);
      setBossChargeSec(0);
    }
  }, [state.status, currentBoss.maxHp]);

  // Boss ATB charging loop
  useGameLoop({
    isPaused: state.status !== 'PLAYING',
    onUpdate: (deltaSec) => {
      setBossChargeSec((prev) => {
        const next = prev + deltaSec;
        if (next >= currentBoss.attackIntervalSec) {
          // Boss unleashes retaliation attack! Deduct player life
          setIsPlayerHurt(true);
          setTimeout(() => setIsPlayerHurt(false), 600);
          submitAnswer(-999999);
          return 0;
        }
        return next;
      });
    },
  });

  const handleAttack = (ans: number) => {
    if (!state.currentQuestion) return;
    const isCorrect = ans === state.currentQuestion.answer;
    const responseTimeMs = Math.max(50, Date.now() - questionStartTimeRef.current);
    submitAnswer(ans);

    if (isCorrect) {
      // Speed-scaled player attack damage
      const speedMultiplier = responseTimeMs < 1200 ? 1.5 : responseTimeMs < 2000 ? 1.25 : 1.0;
      const damage = Math.round(100 * state.scoreMultiplier * speedMultiplier);
      const isCrit = speedMultiplier >= 1.5;

      setIsBossHurt(true);
      setLastAttackEffect({ damage, isCrit });
      setTimeout(() => setIsBossHurt(false), 500);
      setTimeout(() => setLastAttackEffect(null), 800);

      setBossHp((prevHp) => {
        const remainingHp = Math.max(0, prevHp - damage);
        if (remainingHp <= 0) {
          // Boss Defeated! Advance to next boss
          setTimeout(() => {
            setActiveBossIndex((prev) => prev + 1);
            setBossHp(BOSS_ROSTER[(activeBossIndex + 1) % BOSS_ROSTER.length].maxHp);
          }, 600);
        }
        return remainingHp;
      });

      // Reset boss charge meter on successful player hit
      setBossChargeSec((prev) => Math.max(0, prev - 2.0));
    } else {
      // Mistake: boss charges attack faster
      setIsPlayerHurt(true);
      setTimeout(() => setIsPlayerHurt(false), 500);
      setBossChargeSec((prev) => prev + 2.5);
    }
  };

  const bossHpPercent = Math.max(0, Math.min(100, (bossHp / currentBoss.maxHp) * 100));
  const bossChargePercent = Math.max(
    0,
    Math.min(100, (bossChargeSec / currentBoss.attackIntervalSec) * 100)
  );

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

      {/* RPG Combat Arena */}
      <div className="flex-1 flex flex-col items-center justify-between p-2.5 sm:p-4 max-w-lg mx-auto w-full my-auto relative min-h-0">
        {/* Boss Status Bar Card */}
        <div
          className={`w-full rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-sm space-y-2 sm:space-y-3 border transition-colors ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
              : 'bg-white/95 border-slate-200 shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">{currentBoss.avatarIcon}</span>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  {currentBoss.name}
                </h3>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-rose-500 font-bold">
                  {currentBoss.title}
                </p>
              </div>
            </div>

            <div className="text-right font-mono font-bold text-xs text-rose-500">
              HP: {bossHp} / {currentBoss.maxHp}
            </div>
          </div>

          {/* Boss HP Bar */}
          <div className={`w-full h-2.5 sm:h-3 rounded-full overflow-hidden border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
              style={{ width: `${bossHpPercent}%` }}
            />
          </div>

          {/* Boss Charge Attack Bar */}
          <div className="space-y-0.5 sm:space-y-1">
            <div className={`flex justify-between text-[9px] sm:text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Boss Attack Charge</span>
              <span className="text-amber-500 font-mono font-bold">
                {(currentBoss.attackIntervalSec - bossChargeSec).toFixed(1)}s
              </span>
            </div>
            <div className={`w-full h-1 sm:h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
              <div
                className="h-full bg-amber-400 transition-all duration-100"
                style={{ width: `${bossChargePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Combat Sprite Arena */}
        <div className="my-auto flex items-center justify-center relative py-1 sm:py-3">
          <div
            className={`text-5xl sm:text-7xl md:text-8xl transition-transform ${
              isBossHurt
                ? 'scale-90 opacity-60 animate-shake'
                : isPlayerHurt
                ? 'scale-125 text-red-500'
                : 'animate-pulse'
            }`}
          >
            {currentBoss.avatarIcon}
          </div>
          {lastAttackEffect && (
            <div
              className={`absolute top-0 font-black text-xl sm:text-2xl animate-bounce pointer-events-none ${
                lastAttackEffect.isCrit
                  ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] text-2xl sm:text-3xl'
                  : 'text-red-500'
              }`}
            >
              -{lastAttackEffect.damage} {lastAttackEffect.isCrit ? 'CRIT!' : ''}
            </div>
          )}
        </div>

        {/* Player Attack Equation Card & Choices */}
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-2.5 sm:space-y-3 z-20">
            <div
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-center shadow-xl backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-lg'
              }`}
            >
              <span
                className="text-[9px] sm:text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-1"
                style={{ color: theme.accent }}
              >
                <Swords className="w-3.5 h-3.5" />
                Cast Math Spell
              </span>
              <div className="text-2xl sm:text-4xl font-black font-mono mt-0.5 sm:mt-1">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAttack(opt)}
                    className={`py-2.5 sm:py-3.5 px-2.5 sm:px-3 active:scale-95 font-mono font-black text-base sm:text-xl rounded-xl sm:rounded-2xl border transition-all shadow-md ${
                      isDark
                        ? 'bg-slate-800/90 hover:bg-purple-600 text-white border-slate-700 hover:border-purple-400'
                        : 'bg-white hover:bg-purple-50 text-slate-900 border-slate-200 hover:border-purple-500'
                    }`}
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
              <Skull className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Boss Battle RPG
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Engage legendary math bosses! Answer quickly to deal combo damage before the boss
              charges their retaliation attack.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Challenge Boss
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
              {state.countdownValue === 0 ? 'BATTLE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="boss_battle"
        gameTitle="Boss Battle Arena"
        category="Survival"
        icon={<Skull className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="RPG Active Time Battle against animated math bosses. Attack quickly to prevent retaliations."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Boss Battle Arena"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
