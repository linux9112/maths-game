import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { VisualViewportWrapper } from '../../components/common/VisualViewportWrapper';

describe('Mobile Viewport Defense System', () => {
  let listeners: Record<string, EventListener> = {};

  beforeEach(() => {
    listeners = {};
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: {
        height: 600,
        width: 380,
        offsetTop: 0,
        addEventListener: vi.fn((event: string, cb: EventListener) => {
          listeners[event] = cb;
        }),
        removeEventListener: vi.fn((event: string) => {
          delete listeners[event];
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets initial --vvh CSS custom property on documentElement', () => {
    render(
      React.createElement(
        VisualViewportWrapper,
        null,
        React.createElement('div', null, 'Content Inside Viewport')
      )
    );

    expect(screen.getByText('Content Inside Viewport')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('600px');
    expect(document.documentElement.style.getPropertyValue('--vvw')).toBe('380px');
  });

  it('updates --vvh and data-keyboard-open when visualViewport fires resize event', () => {
    render(
      React.createElement(
        VisualViewportWrapper,
        null,
        React.createElement('div', null, 'Content Inside Viewport')
      )
    );

    // Simulate keyboard popping up: viewport shrinks to 350px (window.innerHeight default is 768)
    act(() => {
      (window.visualViewport as any).height = 350;
      listeners['resize']?.(new Event('resize'));
    });

    expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('350px');
    const wrapper = screen.getByTestId('visual-viewport-wrapper');
    expect(wrapper).toHaveAttribute('data-keyboard-open', 'true');
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(
      React.createElement(
        VisualViewportWrapper,
        null,
        React.createElement('div', null, 'Content')
      )
    );

    unmount();
    expect(window.visualViewport?.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
    expect(window.visualViewport?.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
  });
});
