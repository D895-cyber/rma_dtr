import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const MOBILE_BREAKPOINT = 640; // tailwind sm

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        (window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    };
    checkStandalone();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const isInstallable = Boolean(deferredPrompt) && !installed;
  const showInstall = isInstallable && !isStandalone;

  return { showInstall, promptInstall, isStandalone, isMobile };
}
