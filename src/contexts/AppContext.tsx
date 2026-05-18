import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Lang } from '../content';

interface UIState {
  lang: Lang;
  setLang: (l: Lang) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (b: boolean) => void;
}

const UIContext = createContext<UIState | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('FR');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const value = useMemo<UIState>(
    () => ({ lang, setLang, mobileMenuOpen, setMobileMenuOpen }),
    [lang, mobileMenuOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within AppProvider');
  return ctx;
}
