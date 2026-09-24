import React, { useCallback, useRef } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

export interface VirtualKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onClear?: () => void;
  disabled?: boolean;
  submitLabel?: React.ReactNode;
  className?: string;
  enableHaptics?: boolean;
  onPlaySound?: () => void;
}

export const VirtualKeypad: React.FC<VirtualKeypadProps> = ({
  onDigit,
  onBackspace,
  onSubmit,
  onClear,
  disabled = false,
  submitLabel,
  className = '',
  enableHaptics = true,
  onPlaySound,
}) => {
  const longPressTimerRef = useRef<number | null>(null);

  const triggerHaptic = useCallback(() => {
    if (enableHaptics && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Safe failover if vibration is blocked
      }
    }
  }, [enableHaptics]);

  const handleKeyPress = useCallback((action: () => void) => {
    if (disabled) return;
    triggerHaptic();
    onPlaySound?.();
    action();
  }, [disabled, triggerHaptic, onPlaySound]);

  const handleBackspacePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    handleKeyPress(onBackspace);

    // Setup long press to trigger full clear
    if (onClear) {
      longPressTimerRef.current = window.setTimeout(() => {
        handleKeyPress(onClear);
      }, 500);
    }
  };

  const handleBackspacePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const numKeyClasses =
    'h-14 sm:h-16 text-2xl font-bold rounded-2xl transition-all duration-75 flex items-center justify-center ' +
    'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-300/80 shadow-sm ' +
    'dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 dark:text-slate-100 dark:border-slate-700/80 ' +
    'active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none';

  return (
    <div
      role="group"
      aria-label="Numeric Keypad"
      className={`w-full max-w-xs mx-auto p-2 grid grid-cols-3 gap-2 sm:gap-2.5 select-none ${className}`}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          type="button"
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            handleKeyPress(() => onDigit(String(num)));
          }}
          className={numKeyClasses}
          aria-label={`Digit ${num}`}
        >
          {num}
        </button>
      ))}

      {/* Row 4: Backspace, 0, Enter */}
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handleBackspacePointerDown}
        onPointerUp={handleBackspacePointerUp}
        onPointerLeave={handleBackspacePointerUp}
        className={`${numKeyClasses} text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
        aria-label="Backspace"
      >
        <Delete className="w-6 h-6 stroke-[2.5]" />
      </button>

      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          handleKeyPress(() => onDigit('0'));
        }}
        className={numKeyClasses}
        aria-label="Digit 0"
      >
        0
      </button>

      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          handleKeyPress(onSubmit);
        }}
        className="h-14 sm:h-16 text-xl font-bold rounded-2xl transition-all duration-75 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none"
        aria-label="Submit Answer"
      >
        {submitLabel || <CornerDownLeft className="w-6 h-6 stroke-[2.5]" />}
      </button>
    </div>
  );
};
