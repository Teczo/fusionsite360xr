import { useState, useEffect } from 'react';

/**
 * Returns true when the app is running in standalone/installed PWA mode.
 */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Hook that captures the beforeinstallprompt event (Android/Desktop).
 * Returns { canInstall, promptInstall } for triggering the native install dialog.
 * Note: iOS does not support beforeinstallprompt — show manual instructions instead.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return { canInstall: !!deferredPrompt, promptInstall };
}
