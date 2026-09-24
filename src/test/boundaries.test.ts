import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { VirtualKeypad } from '../components/common/VirtualKeypad';
import { useVisualViewport } from '../components/common/useVisualViewport';
import { VisualViewportWrapper } from '../components/common/VisualViewportWrapper';

describe('Boundary & Adversarial Testing Suite - Challenger 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('VirtualKeypad Event Handling: onPointerDown vs onClick (Accessibility & Input Fidelity)', () => {
    it('FAILURE MODE CHECK: buttons ignore onClick event (accessibility failure on keyboard activation)', () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onSubmit = vi.fn();

      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
        })
      );

      const digit5 = screen.getByRole('button', { name: 'Digit 5' });
      const backspaceBtn = screen.getByRole('button', { name: 'Backspace' });
      const submitBtn = screen.getByRole('button', { name: 'Submit Answer' });

      // Standard keyboard activation in browsers (Enter/Space) fires 'click'
      // Assistive technologies (screen readers, switch access) trigger 'click'
      fireEvent.click(digit5);
      expect(onDigit).not.toHaveBeenCalled(); // Demonstrates onClick is unhandled!

      fireEvent.click(backspaceBtn);
      expect(onBackspace).not.toHaveBeenCalled(); // Demonstrates onClick is unhandled!

      fireEvent.click(submitBtn);
      expect(onSubmit).not.toHaveBeenCalled(); // Demonstrates onClick is unhandled!
    });

    it('SUCCESS MODE: onPointerDown correctly handles touch / pointer activation', () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onSubmit = vi.fn();

      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
        })
      );

      const digit5 = screen.getByRole('button', { name: 'Digit 5' });
      fireEvent.pointerDown(digit5);
      expect(onDigit).toHaveBeenCalledWith('5');

      const submitBtn = screen.getByRole('button', { name: 'Submit Answer' });
      fireEvent.pointerDown(submitBtn);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('BOUNDARY & LIFECYCLE: Backspace long press timer leak check when component unmounts within 500ms', () => {
      const onBackspace = vi.fn();
      const onClear = vi.fn();

      const { unmount } = render(
        React.createElement(VirtualKeypad, {
          onDigit: vi.fn(),
          onBackspace,
          onSubmit: vi.fn(),
          onClear,
        })
      );

      const backspaceBtn = screen.getByRole('button', { name: 'Backspace' });
      fireEvent.pointerDown(backspaceBtn);
      expect(onBackspace).toHaveBeenCalledTimes(1);

      // Unmount before 500ms elapsed
      unmount();

      // Fast-forward timers past 500ms
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // If timer is not cleaned up on unmount, onClear is invoked on an unmounted component!
      expect(onClear).toHaveBeenCalledTimes(1); // Leaked timer fires post-unmount!
    });

    it('BOUNDARY: pointercancel on Backspace button should cancel long press timer', () => {
      const onBackspace = vi.fn();
      const onClear = vi.fn();

      render(
        React.createElement(VirtualKeypad, {
          onDigit: vi.fn(),
          onBackspace,
          onSubmit: vi.fn(),
          onClear,
        })
      );

      const backspaceBtn = screen.getByRole('button', { name: 'Backspace' });
      fireEvent.pointerDown(backspaceBtn);
      expect(onBackspace).toHaveBeenCalledTimes(1);

      // System interrupts touch (e.g. phone call, scroll gesture, notification)
      // VirtualKeypad currently only binds onPointerUp and onPointerLeave, NOT onPointerCancel!
      fireEvent.pointerCancel(backspaceBtn);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Because pointercancel is not handled, onClear erroneously fires!
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSS Viewport Defense: --vvh and --vvw Boundaries & Fallbacks', () => {
    function ViewportHarness() {
      useVisualViewport();
      return React.createElement('div', { 'data-testid': 'harness' }, 'Harness');
    }

    it('applies --vvh, --vvw, and --vvo-top to documentElement on mount', () => {
      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        configurable: true,
        value: {
          height: 750,
          width: 412,
          offsetTop: 15,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      });

      render(React.createElement(ViewportHarness));

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('750px');
      expect(document.documentElement.style.getPropertyValue('--vvw')).toBe('412px');
      expect(document.documentElement.style.getPropertyValue('--vvo-top')).toBe('15px');
    });

    it('handles null/undefined window.visualViewport safely with window dimensions', () => {
      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        configurable: true,
        value: null,
      });
      window.innerHeight = 900;
      window.innerWidth = 500;

      render(React.createElement(ViewportHarness));

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('900px');
      expect(document.documentElement.style.getPropertyValue('--vvw')).toBe('500px');
      expect(document.documentElement.style.getPropertyValue('--vvo-top')).toBe('0px');
    });

    it('BOUNDARY: extreme viewport height shrink (virtual keyboard pop-up to 250px)', () => {
      let resizeCb: EventListener = () => {};
      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        configurable: true,
        value: {
          height: 800,
          width: 360,
          offsetTop: 0,
          addEventListener: vi.fn((ev, cb) => {
            if (ev === 'resize') resizeCb = cb;
          }),
          removeEventListener: vi.fn(),
        },
      });
      window.innerHeight = 800;

      const { getByTestId } = render(
        React.createElement(
          VisualViewportWrapper,
          null,
          React.createElement('div', null, 'Child')
        )
      );

      const wrapper = getByTestId('visual-viewport-wrapper');
      expect(wrapper).toHaveAttribute('data-keyboard-open', 'false');

      // Soft keyboard opens, reducing visualViewport height from 800 to 250px
      act(() => {
        (window.visualViewport as any).height = 250;
        resizeCb(new Event('resize'));
      });

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('250px');
      expect(wrapper).toHaveAttribute('data-keyboard-open', 'true');
    });
  });
});
