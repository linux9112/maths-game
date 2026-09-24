import { useState, useEffect } from 'react';

export interface PwaRegistrationOptions {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}

export function registerServiceWorker(options: PwaRegistrationOptions = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                options.onNeedRefresh?.();
              } else {
                options.onOfflineReady?.();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.debug('ServiceWorker registration skipped or failed:', error);
      });
  });
}

/**
 * Hook to observe online/offline connectivity transitions.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
