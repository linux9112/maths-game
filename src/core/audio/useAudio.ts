import { useState, useEffect, useCallback } from 'react';
import { soundEngine } from './soundEngine';
import { SettingsStore } from '../storage/settingsStore';

export function useAudio() {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [volume, setVolumeState] = useState<number>(() => soundEngine.getVolume());

  // Listen to SettingsStore changes
  useEffect(() => {
    return SettingsStore.subscribe((settings) => {
      setIsMuted(!settings.soundEnabled);
      setVolumeState(settings.soundVolume);
    });
  }, []);

  // Global user-gesture audio context unlock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unlockAudio = () => {
      void soundEngine.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const toggleMute = useCallback(() => {
    soundEngine.setMuted(!soundEngine.isMuted());
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    soundEngine.setVolume(newVolume);
  }, []);

  return {
    isMuted,
    volume,
    toggleMute,
    setVolume: updateVolume,
    playCorrect: useCallback(() => soundEngine.playCorrect(), []),
    playIncorrect: useCallback(() => soundEngine.playIncorrect(), []),
    playCombo: useCallback((c: number) => soundEngine.playCombo(c), []),
    playLevelUp: useCallback(() => soundEngine.playLevelUp(), []),
    playVictory: useCallback(() => soundEngine.playVictory(), []),
    playTick: useCallback((isFinal?: boolean) => soundEngine.playTick(isFinal), []),
    playButtonTap: useCallback(() => soundEngine.playButtonTap(), []),
    playWarning: useCallback(() => soundEngine.playWarning(), []),
    playGameOver: useCallback(() => soundEngine.playGameOver(), []),
  };
}
