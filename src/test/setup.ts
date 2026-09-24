import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { setupAudioMock } from './mocks/audioMock';

// 1. Initialize Web Audio API Mock
setupAudioMock();

// 2. Mock navigator.vibrate
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(true),
  });
}

// 3. Mock window.matchMedia (for theme & prefers-color-scheme)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 4. Mock window.visualViewport (for mobile keyboard occlusion defense)
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  configurable: true,
  value: {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  },
});

// 5. Mock HTMLCanvasElement.getContext('2d')
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
  if (contextId === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
    };
  }
  return null;
}) as any;

// 6. Mock Element.prototype.scrollIntoView
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
