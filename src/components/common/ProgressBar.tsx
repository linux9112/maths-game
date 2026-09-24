import React from 'react';

export interface ProgressBarProps {
  value: number; // Current value
  max?: number; // Maximum value (default: 100)
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const variantGradients: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  indigo: 'bg-indigo-600 dark:bg-indigo-500',
  emerald: 'bg-emerald-600 dark:bg-emerald-500',
  amber: 'bg-amber-500 dark:bg-amber-400',
  rose: 'bg-rose-500 dark:bg-rose-400',
  gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
};

const sizeHeights: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'indigo',
  size = 'md',
  showLabel = false,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
          <span>{label || 'Progress'}</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${sizeHeights[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${variantGradients[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
