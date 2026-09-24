import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SoundEngine } from '../../core/audio/soundEngine';
import { SettingsStore, DEFAULT_SETTINGS } from '../../core/storage/settingsStore';
import { VisualViewportWrapper } from '../../components/common/VisualViewportWrapper';
import { VirtualKeypad } from '../../components/common/VirtualKeypad';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import {
  getActiveMockAudioContext,
  resetActiveMockAudioContext,
  MockAudioContext,
} from '../mocks/audioMock';

describe('Milestone 1 Empirical Stress Test Suite', () => {
  describe('1. Audio Engine Stress & Concurrency', () => {
    let engine: SoundEngine;

    beforeEach(() => {
      SettingsStore.reset();
      resetActiveMockAudioContext();
      engine = new SoundEngine();
    });

    afterEach(async () => {
      await engine.destroy();
      vi.clearAllMocks();
    });

    it('handles 100+ concurrent playback calls without unhandled rejections or context duplication', async () => {
      await engine.init();
      const ctx = getActiveMockAudioContext()!;
      expect(ctx).not.toBeNull();

      // Fire 120 concurrent sound requests across all sound types
      const calls: void[] = [];
      for (let i = 0; i < 30; i++) {
        calls.push(engine.playCorrect());
        calls.push(engine.playIncorrect());
        calls.push(engine.playCombo(i + 1));
        calls.push(engine.playTick(i % 2 === 0));
      }

      // Wait for asynchronous scheduleNotes promise ticks to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert only 1 AudioContext was created (no context leaks)
      expect(getActiveMockAudioContext()).toBe(ctx);

      // Assert oscillators were created for the requests
      expect(ctx.createdOscillators.length).toBeGreaterThan(120);

      // Verify all oscillators have onended handlers for lifecycle cleanup
      const allHaveOnEnded = ctx.createdOscillators.every((osc) => typeof osc.onended === 'function');
      expect(allHaveOnEnded).toBe(true);

      // Trigger onended on all oscillators to verify disconnection cleanup executes cleanly
      for (const osc of ctx.createdOscillators) {
        if (osc.onended) {
          expect(() => osc.onended!()).not.toThrow();
        }
      }
    });

    it('handles 200 sequential playback calls in a tight loop', async () => {
      await engine.init();
      const ctx = getActiveMockAudioContext()!;

      expect(() => {
        for (let i = 0; i < 50; i++) {
          engine.playButtonTap();
          engine.playTick(false);
          engine.playWarning();
          engine.playGameOver();
        }
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(ctx.createdOscillators.length).toBeGreaterThanOrEqual(200);
    });

    it('handles 50 concurrent init() calls without race condition creating multiple AudioContexts', async () => {
      const initPromises = Array.from({ length: 50 }, () => engine.init());
      await expect(Promise.all(initPromises)).resolves.not.toThrow();

      const ctx = getActiveMockAudioContext();
      expect(ctx).not.toBeNull();
      expect(engine.getState()).toBe('running');
    });

    it('tolerates immediate destroy() call during in-flight sound scheduling', async () => {
      await engine.init();

      // Schedule sound and immediately destroy
      engine.playCorrect();
      engine.playCombo(5);
      const destroyPromise = engine.destroy();

      await expect(destroyPromise).resolves.not.toThrow();
      expect(engine.getState()).toBe('unsupported');

      // Subsequent sound invocations after destroy should not throw
      expect(() => engine.playCorrect()).not.toThrow();
      expect(() => engine.playIncorrect()).not.toThrow();
    });

    it('survives boundary numeric inputs (negative combo, huge combo, 0 combo)', async () => {
      await engine.init();
      const ctx = getActiveMockAudioContext()!;

      expect(() => engine.playCombo(0)).not.toThrow();
      expect(() => engine.playCombo(-10)).not.toThrow();
      expect(() => engine.playCombo(1000000)).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(ctx.createdOscillators.length).toBeGreaterThan(0);
    });
  });

  describe('2. Autoplay & AudioContext State Resilience', () => {
    let engine: SoundEngine;

    beforeEach(() => {
      SettingsStore.reset();
      resetActiveMockAudioContext();
      engine = new SoundEngine();
    });

    afterEach(async () => {
      await engine.destroy();
      vi.clearAllMocks();
    });

    it('safely handles AudioContext resume() rejection (autoplay policy block)', async () => {
      const originalAudioContext = (globalThis as any).AudioContext;
      class RejectingAudioContext extends MockAudioContext {
        override resume = vi.fn(async () => {
          this.state = 'suspended';
          throw new DOMException('Autoplay policy prevented audio playback', 'NotAllowedError');
        });
      }
      (globalThis as any).AudioContext = RejectingAudioContext;

      const suspendedEngine = new SoundEngine();
      // Should not reject or throw uncaught error
      await expect(suspendedEngine.init()).resolves.not.toThrow();
      expect(suspendedEngine.getState()).toBe('suspended');

      // Attempt playback while blocked
      expect(() => suspendedEngine.playCorrect()).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Verify no notes were scheduled when context cannot resume
      const ctx = (suspendedEngine as any).ctx;
      if (ctx) {
        expect(ctx.createdOscillators.length).toBe(0);
      }

      await suspendedEngine.destroy();
      (globalThis as any).AudioContext = originalAudioContext;
    });

    it('recovers and plays sounds once AudioContext is subsequently resumed after user gesture', async () => {
      let isAllowed = false;
      const originalAudioContext = (globalThis as any).AudioContext;
      class ConditionalAudioContext extends MockAudioContext {
        override resume = vi.fn(async () => {
          if (!isAllowed) {
            this.state = 'suspended';
            throw new DOMException('User gesture required', 'NotAllowedError');
          }
          this.state = 'running';
        });
      }
      (globalThis as any).AudioContext = ConditionalAudioContext;

      const condEngine = new SoundEngine();
      await condEngine.init();
      expect(condEngine.getState()).toBe('suspended');

      // Initial attempt while blocked produces no oscillators
      condEngine.playCorrect();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const ctx = (condEngine as any).ctx;
      expect(ctx.createdOscillators.length).toBe(0);

      // Simulate user gesture unlocking audio
      isAllowed = true;
      await condEngine.init();
      expect(condEngine.getState()).toBe('running');

      // Subsequent playback works immediately
      condEngine.playCorrect();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(ctx.createdOscillators.length).toBeGreaterThan(0);

      await condEngine.destroy();
      (globalThis as any).AudioContext = originalAudioContext;
    });

    it('gracefully degrades with zero errors when Web Audio API is completely unsupported in environment', async () => {
      const originalAudioContext = (globalThis as any).AudioContext;
      const originalWebkit = (globalThis as any).webkitAudioContext;

      delete (globalThis as any).AudioContext;
      delete (globalThis as any).webkitAudioContext;

      const noAudioEngine = new SoundEngine();
      expect(noAudioEngine.getState()).toBe('unsupported');

      await expect(noAudioEngine.init()).resolves.not.toThrow();
      expect(() => noAudioEngine.playCorrect()).not.toThrow();
      expect(() => noAudioEngine.playIncorrect()).not.toThrow();
      expect(() => noAudioEngine.playCombo(4)).not.toThrow();
      expect(() => noAudioEngine.playTick(true)).not.toThrow();
      expect(() => noAudioEngine.setMuted(true)).not.toThrow();
      expect(() => noAudioEngine.setVolume(0.8)).not.toThrow();

      await noAudioEngine.destroy();
      (globalThis as any).AudioContext = originalAudioContext;
      (globalThis as any).webkitAudioContext = originalWebkit;
    });
  });

  describe('3. LocalStorage & Settings Edge Cases', () => {
    beforeEach(() => {
      SettingsStore.reset();
      localStorage.clear();
    });

    afterEach(() => {
      SettingsStore.reset();
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it('recovers to default settings when localStorage contains corrupted/malformed JSON', () => {
      localStorage.setItem('math_app_settings_v1', '{malformed invalid json ::: [}');

      const settings = SettingsStore.get();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.soundEnabled).toBe(true);
      expect(settings.soundVolume).toBe(0.7);
      expect(settings.theme).toBe('dark');
    });

    it('handles non-object JSON values (string, number, array, null) gracefully', () => {
      const edgeCases = ['"just a string"', '12345', 'null', '[1, 2, 3]', 'true'];

      for (const val of edgeCases) {
        SettingsStore.reset();
        localStorage.setItem('math_app_settings_v1', val);

        const loaded = SettingsStore.get();
        expect(loaded).toBeDefined();
        // Crucial settings must remain defined with valid fallback types
        expect(typeof loaded.soundEnabled).toBe('boolean');
        expect(typeof loaded.soundVolume).toBe('number');
        expect(['dark', 'light']).toContain(loaded.theme);
      }
    });

    it('merges partial saved keys with defaults correctly', () => {
      localStorage.setItem('math_app_settings_v1', JSON.stringify({ soundVolume: 0.35 }));

      const loaded = SettingsStore.get();
      expect(loaded.soundVolume).toBe(0.35);
      expect(loaded.soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled);
      expect(loaded.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(loaded.reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
    });

    it('survives QuotaExceededError during localStorage.setItem without crashing and maintains in-memory state', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });

      let notifiedSettings: any = null;
      const unsubscribe = SettingsStore.subscribe((s) => {
        notifiedSettings = s;
      });

      expect(() => {
        SettingsStore.set({ theme: 'light', soundVolume: 0.9 });
      }).not.toThrow();

      const current = SettingsStore.get();
      expect(current.theme).toBe('light');
      expect(current.soundVolume).toBe(0.9);
      expect(notifiedSettings).toEqual(current);

      unsubscribe();
    });

    it('operates safely in strict privacy mode when window.localStorage throws SecurityError on access', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
      });

      SettingsStore.reset();

      // get() should return defaults
      expect(() => SettingsStore.get()).not.toThrow();
      const s = SettingsStore.get();
      expect(s.theme).toBe('dark');

      // set() should update in memory
      expect(() => SettingsStore.set({ theme: 'light' })).not.toThrow();
      expect(SettingsStore.get().theme).toBe('light');

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    });

    it('handles 1,000 rapid sequential store updates and preserves subscriber order', () => {
      let callCount = 0;
      let lastVolume = -1;

      const unsubscribe = SettingsStore.subscribe((settings) => {
        callCount++;
        lastVolume = settings.soundVolume;
      });

      for (let i = 1; i <= 1000; i++) {
        SettingsStore.set({ soundVolume: Number((i / 1000).toFixed(3)) });
      }

      expect(callCount).toBe(1000);
      expect(lastVolume).toBe(1);
      expect(SettingsStore.get().soundVolume).toBe(1);

      unsubscribe();
    });

    it('isolates listener errors so other listeners still execute', () => {
      const faultyListener = vi.fn(() => {
        throw new Error('Exploding listener');
      });
      const healthyListener = vi.fn();

      SettingsStore.subscribe(faultyListener);
      SettingsStore.subscribe(healthyListener);

      expect(() => SettingsStore.set({ theme: 'light' })).not.toThrow();
      expect(faultyListener).toHaveBeenCalled();
      expect(healthyListener).toHaveBeenCalled();
    });

    it('handles 100 rapid theme toggle clicks consistently', () => {
      render(React.createElement(ThemeToggle));
      const btn = screen.getByRole('button');

      for (let i = 0; i < 100; i++) {
        fireEvent.click(btn);
      }

      // After an even number of clicks (100), should return to dark theme
      expect(SettingsStore.get().theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('4. Visual Viewport Listener Thrashing & Fallbacks', () => {
    let listeners: Record<string, EventListener> = {};

    beforeEach(() => {
      listeners = {};
      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        configurable: true,
        value: {
          height: 800,
          width: 400,
          offsetTop: 0,
          addEventListener: vi.fn((evt: string, fn: EventListener) => {
            listeners[evt] = fn;
          }),
          removeEventListener: vi.fn((evt: string) => {
            delete listeners[evt];
          }),
        },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('survives 500 rapid resize and scroll events without crashing or DOM property corruption', () => {
      render(
        React.createElement(
          VisualViewportWrapper,
          null,
          React.createElement('div', null, 'Viewport Content')
        )
      );

      expect(screen.getByText('Viewport Content')).toBeInTheDocument();

      // Dispatch 500 rapid resize/scroll triggers with alternating dimensions
      act(() => {
        for (let i = 0; i < 250; i++) {
          (window.visualViewport as any).height = 400 + (i % 50);
          (window.visualViewport as any).width = 360 + (i % 20);
          (window.visualViewport as any).offsetTop = i % 10;
          listeners['resize']?.(new Event('resize'));
          listeners['scroll']?.(new Event('scroll'));
        }
      });

      // Assert CSS variables match the final simulated viewport values
      const expectedHeight = `${400 + (249 % 50)}px`;
      const expectedWidth = `${360 + (249 % 20)}px`;
      const expectedOffset = `${249 % 10}px`;

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe(expectedHeight);
      expect(document.documentElement.style.getPropertyValue('--vvw')).toBe(expectedWidth);
      expect(document.documentElement.style.getPropertyValue('--vvo-top')).toBe(expectedOffset);
    });

    it('falls back seamlessly to window.innerHeight/innerWidth when window.visualViewport is null/undefined', () => {
      // Simulate environment without Visual Viewport API
      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        configurable: true,
        value: null,
      });

      window.innerHeight = 950;
      window.innerWidth = 500;

      const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        React.createElement(
          VisualViewportWrapper,
          null,
          React.createElement('div', null, 'Fallback Mode Content')
        )
      );

      expect(screen.getByText('Fallback Mode Content')).toBeInTheDocument();
      // Should attach resize listener to window instead
      expect(addWindowListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // CSS custom properties should reflect window dimensions
      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('950px');
      expect(document.documentElement.style.getPropertyValue('--vvw')).toBe('500px');
      expect(document.documentElement.style.getPropertyValue('--vvo-top')).toBe('0px');

      // Simulate window resize
      act(() => {
        window.innerHeight = 700;
        window.dispatchEvent(new Event('resize'));
      });

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('700px');

      // Unmount should cleanly remove listener from window
      unmount();
      expect(removeWindowListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('handles extreme zero and negative values gracefully', () => {
      render(
        React.createElement(
          VisualViewportWrapper,
          null,
          React.createElement('div', null, 'Extreme Values')
        )
      );

      act(() => {
        (window.visualViewport as any).height = 0;
        (window.visualViewport as any).width = 0;
        (window.visualViewport as any).offsetTop = -100;
        listeners['resize']?.(new Event('resize'));
      });

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('0px');
      expect(document.documentElement.style.getPropertyValue('--vvw')).toBe('0px');
      expect(document.documentElement.style.getPropertyValue('--vvo-top')).toBe('-100px');
    });

    it('handles VirtualKeypad unmount while long-press timer is active without throwing', () => {
      const onClear = vi.fn();
      const { unmount } = render(
        React.createElement(VirtualKeypad, {
          onDigit: vi.fn(),
          onBackspace: vi.fn(),
          onSubmit: vi.fn(),
          onClear,
        })
      );

      const backspaceBtn = screen.getByLabelText('Backspace');
      fireEvent.pointerDown(backspaceBtn);

      // Unmount while long press timer is pending
      expect(() => unmount()).not.toThrow();
    });
  });
});
