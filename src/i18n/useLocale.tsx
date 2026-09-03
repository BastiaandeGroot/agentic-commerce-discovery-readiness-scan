'use client';

// Taalkeuze die tussen pagina's overeind blijft.
//
// De app heeft twee volwaardige talen; welke je koos moet niet omvallen zodra je
// naar de uitlegpagina navigeert. localStorage is hier genoeg: het is een
// voorkeur van deze bezoeker, geen data die ergens anders heen moet.
//
// De keuze staat in een context en niet in losse component-state, omdat de knop
// sinds de shell in de header zit terwijl de tekst in de pagina staat. Twee
// losse hooks zouden pas na een remount weer gelijk lopen.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from './strings';

const KEY = 'acdrs.locale';

type LocaleValue = [Locale, (next: Locale) => void];

const LocaleContext = createContext<LocaleValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('nl');

  // Pas na de eerste render lezen; anders lopen server- en client-HTML uiteen.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === 'nl' || stored === 'en') setLocale(stored);
    } catch {
      // Privémodus of geblokkeerde opslag: de standaardtaal volstaat.
    }
  }, []);

  const value = useMemo<LocaleValue>(() => [
    locale,
    (next: Locale) => {
      setLocale(next);
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        // Niet kunnen onthouden is geen reden om niet te kunnen wisselen.
      }
    },
  ], [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  // Zonder provider blijft de app leesbaar in de standaardtaal in plaats van te
  // crashen; wisselen doet dan niets, en dat is zichtbaar in plaats van stil.
  return value ?? ['nl', () => {}];
}
