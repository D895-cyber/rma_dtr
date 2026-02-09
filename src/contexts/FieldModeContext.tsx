import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'crm-field-mode';

interface FieldModeContextType {
  isFieldMode: boolean;
  setFieldMode: (value: boolean) => void;
}

const FieldModeContext = createContext<FieldModeContextType | null>(null);

export function FieldModeProvider({ children }: { children: React.ReactNode }) {
  const [isFieldMode, setFieldModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setFieldMode = (value: boolean) => {
    setFieldModeState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch (_) {}
  };

  // Optional: auto-enable on narrow viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = () => {
      if (mq.matches && !localStorage.getItem(STORAGE_KEY)) setFieldModeState(true);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <FieldModeContext.Provider value={{ isFieldMode, setFieldMode }}>
      {children}
    </FieldModeContext.Provider>
  );
}

export function useFieldMode() {
  const ctx = useContext(FieldModeContext);
  return ctx ?? { isFieldMode: false, setFieldMode: () => {} };
}
