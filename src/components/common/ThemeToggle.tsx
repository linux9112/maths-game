import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './useTheme';

export interface ThemeToggleProps {
  className?: string;
  onToggleSound?: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', onToggleSound }) => {
  const { toggleTheme, isDark } = useTheme();

  const handleClick = () => {
    onToggleSound?.();
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode (T)`}
      className={`p-2 rounded-xl transition-colors duration-150 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
        isDark
          ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 hover:text-amber-300'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
      } ${className}`}
    >
      {isDark ? <Sun className="w-5 h-5 stroke-[2]" /> : <Moon className="w-5 h-5 stroke-[2]" />}
    </button>
  );
};
