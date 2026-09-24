import { useState, useEffect } from 'react';

export interface ViewportMetrics {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
}

export function useVisualViewport(): ViewportMetrics {
  const [metrics, setMetrics] = useState<ViewportMetrics>(() => {
    if (typeof window === 'undefined') {
      return { height: 800, width: 360, offsetTop: 0, isKeyboardOpen: false };
    }
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    const width = vv ? vv.width : window.innerWidth;
    const offsetTop = vv ? vv.offsetTop : 0;
    return {
      height,
      width,
      offsetTop,
      isKeyboardOpen: vv ? window.innerHeight - vv.height > 150 : false,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMetrics = () => {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      const width = vv ? vv.width : window.innerWidth;
      const offsetTop = vv ? vv.offsetTop : 0;
      const isKeyboardOpen = vv ? window.innerHeight - vv.height > 150 : false;

      // Dynamically bind CSS variables to root document
      document.documentElement.style.setProperty('--vvh', `${height}px`);
      document.documentElement.style.setProperty('--vvw', `${width}px`);
      document.documentElement.style.setProperty('--vvo-top', `${offsetTop}px`);

      setMetrics({ height, width, offsetTop, isKeyboardOpen });
    };

    updateMetrics();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateMetrics);
      vv.addEventListener('scroll', updateMetrics);
    } else {
      window.addEventListener('resize', updateMetrics);
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateMetrics);
        vv.removeEventListener('scroll', updateMetrics);
      } else {
        window.removeEventListener('resize', updateMetrics);
      }
    };
  }, []);

  return metrics;
}
