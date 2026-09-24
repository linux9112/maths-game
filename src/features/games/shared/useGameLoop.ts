import { useEffect, useRef } from 'react';

export interface GameLoopOptions {
  onUpdate: (deltaTimeSec: number, totalTimeSec: number) => void;
  isPaused: boolean;
  fpsCap?: number;
}

export function useGameLoop({ onUpdate, isPaused, fpsCap }: GameLoopOptions): void {
  const lastTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const frameIdRef = useRef<number | null>(null);
  const isTabActiveRef = useRef<boolean>(true);

  // Tab visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      if (!isTabActiveRef.current) {
        lastTimeRef.current = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // RAF loop
  useEffect(() => {
    if (isPaused) {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      lastTimeRef.current = 0;
      return;
    }

    const minFrameDurationMs = fpsCap ? 1000 / fpsCap : 0;
    let accumulatedDeltaMs = 0;

    const loop = (timestampMs: number) => {
      if (!isTabActiveRef.current) {
        frameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestampMs;
      }

      const elapsedMs = timestampMs - lastTimeRef.current;
      lastTimeRef.current = timestampMs;

      // Delta clamping to prevent huge jumps after lag/freeze
      const clampedDeltaSec = Math.min(elapsedMs / 1000, 0.1);
      totalTimeRef.current += clampedDeltaSec;

      accumulatedDeltaMs += elapsedMs;
      if (minFrameDurationMs === 0 || accumulatedDeltaMs >= minFrameDurationMs) {
        accumulatedDeltaMs = 0;
        onUpdate(clampedDeltaSec, totalTimeRef.current);
      }

      frameIdRef.current = requestAnimationFrame(loop);
    };

    frameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [isPaused, fpsCap, onUpdate]);
}
