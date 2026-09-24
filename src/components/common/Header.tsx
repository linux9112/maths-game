import React, { useState } from 'react';
import { Calculator, Flame, Zap, Keyboard, Grid3X3, Gamepad2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

export interface HeaderProps {
  title?: string;
  xp?: number;
  level?: number;
  levelTitle?: string;
  streakDays?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onPlaySound?: () => void;
  useVirtualKeypad?: boolean;
  onToggleVirtualKeypad?: () => void;
  onHomeClick?: () => void;
  onGamesClick?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'MathMastery',
  xp = 0,
  level = 1,
  levelTitle = 'Beginner',
  streakDays = 0,
  isMuted,
  onToggleMute,
  onPlaySound,
  useVirtualKeypad = false,
  onToggleVirtualKeypad,
  onHomeClick,
  onGamesClick,
  className = '',
}) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <header
        role="banner"
        className={`w-full h-14 sm:h-16 px-2.5 sm:px-6 border-b flex-shrink-0 select-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 transition-colors ${className}`}
      >
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-1 sm:gap-4 h-full">
          {/* Left: Brand */}
          <div
            onClick={onHomeClick}
            className="flex items-center gap-1.5 sm:gap-3 cursor-pointer group flex-shrink-0"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onHomeClick?.()}
            aria-label="Return to main dashboard"
          >
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Calculator className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
                {title}
              </span>
              <span className="hidden xs:block text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Practice & Games
              </span>
            </div>
          </div>

          {/* Middle: Live Progression Badges */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* XP & Level Badge */}
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs"
              title={`Level ${level} (${levelTitle}) - Total XP: ${xp}`}
            >
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500" />
              <span>Lv.{level}</span>
              <span className="hidden sm:inline text-indigo-400 dark:text-indigo-500">•</span>
              <span className="hidden sm:inline font-mono">{xp} XP</span>
            </div>

            {/* Daily Streak Badge */}
            {streakDays > 0 && (
              <div
                className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs"
                title={`${streakDays}-day practice streak!`}
              >
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                <span>{streakDays}d</span>
              </div>
            )}
          </div>

          {/* Right: Quick Settings & Shortcut Trigger */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Games Arcade Shortcut (Visible on tablet/desktop, mobile uses nav bar) */}
            {onGamesClick && (
              <button
                type="button"
                onClick={onGamesClick}
                title="Arcade Games"
                aria-label="Open Arcade Games"
                className="hidden sm:flex p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
              </button>
            )}

            {/* Mobile Keypad Mode Toggle */}
            {onToggleVirtualKeypad && (
              <button
                type="button"
                onClick={onToggleVirtualKeypad}
                title={`Virtual Keypad: ${useVirtualKeypad ? 'Enabled' : 'Disabled'}`}
                aria-label={`Toggle virtual keypad, currently ${useVirtualKeypad ? 'enabled' : 'disabled'}`}
                className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
                  useVirtualKeypad
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
              </button>
            )}

            {/* Audio Mute Toggle */}
            <SoundToggle isMuted={isMuted} onToggle={onToggleMute} onPlaySound={onPlaySound} />

            {/* Light/Dark Theme Switch */}
            <ThemeToggle onToggleSound={onPlaySound} />

            {/* Keyboard Shortcuts Trigger (Desktop only) */}
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard shortcuts (?)"
              aria-label="View keyboard shortcuts"
              className="hidden md:flex p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Keyboard className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
};
