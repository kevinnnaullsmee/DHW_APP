'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✓ Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('✗ Error al registrar Service Worker:', error);
        });
    }
  }, []);

  return null;
}
