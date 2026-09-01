'use client';

// Taalkeuze die tussen pagina's overeind blijft.
//
// De app heeft twee volwaardige talen; welke je koos moet niet omvallen zodra je
// naar de uitlegpagina navigeert. localStorage is hier genoeg: het is een
// voorkeur van deze bezoeker, geen data die ergens anders heen moet.

import { useEffect, useState } from 'react';
import type { Locale } from './strings';

const KEY = 'acdrs.locale';

export function useLocale(): [Locale, (next: Locale) => void] {
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

  function update(next: Locale) {
    setLocale(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Niet kunnen onthouden is geen reden om niet te kunnen wisselen.
    }
  }

  return [locale, update];
}
