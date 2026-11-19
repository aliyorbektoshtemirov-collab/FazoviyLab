// src/context/ResultContext.tsx
// Har bir faol simulyatsiya o'zining joriy (live) hisob-kitob natijasini
// shu kontekst orqali e'lon qiladi. "Natijalar" paneli esa shu qiymatni
// o'qib, foydalanuvchi xohlasa D1 bazasiga saqlaydi.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ResultSummary } from '../types/logs';

interface ResultContextValue {
  currentResult: ResultSummary;
  setCurrentResult: (result: ResultSummary) => void;
}

const ResultContext = createContext<ResultContextValue | null>(null);

export function ResultProvider({ children }: { children: ReactNode }) {
  const [currentResult, setCurrentResult] = useState<ResultSummary>({});

  const value = useMemo(() => ({ currentResult, setCurrentResult }), [currentResult]);

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResultContext(): ResultContextValue {
  const ctx = useContext(ResultContext);
  if (!ctx) {
    throw new Error('useResultContext faqat <ResultProvider> ichida ishlatilishi kerak');
  }
  return ctx;
}
