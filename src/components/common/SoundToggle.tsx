import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../../core/audio/soundEngine';
import { SettingsStore } from '../../core/storage/settingsStore';

export interface SoundToggleProps {
  isMuted?: boolean;
  onToggle?: () => void;
  onPlaySound?: () => void;
  className?: string;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({
  isMuted: propIsMuted,
  onToggle,
  onPlaySound,
  className = '',
}) => {
  const [internalMuted, setInternalMuted] = React.useState(() => soundEngine.isMuted());

  React.useEffect(() => {
    return SettingsStore.subscribe((settings) => {
      setInternalMuted(!settings.soundEnabled);
    });
  }, []);

  const isMuted = propIsMuted !== undefined ? propIsMuted : internalMuted;

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      const nextMuted = !soundEngine.isMuted();
      soundEngine.setMuted(nextMuted);
      setInternalMuted(nextMuted);
    }
    if (isMuted) {
      onPlaySound?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
      title={isMuted ? 'Unmute sound effects (M)' : 'Mute sound effects (M)'}
      className={`p-2 rounded-xl transition-colors duration-150 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
        isMuted
          ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      } ${className}`}
    >
      {isMuted ? <VolumeX className="w-5 h-5 stroke-[2]" /> : <Volume2 className="w-5 h-5 stroke-[2]" />}
    </button>
  );
};
