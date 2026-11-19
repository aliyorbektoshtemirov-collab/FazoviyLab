// src/hooks/usePublishResult.ts
// Simulyatsiya ichidagi hisoblangan qiymatlarni (masalan, hajm, yuza, tezlik)
// har bir o'zgarishda ResultContext'ga "e'lon qiladigan" yordamchi hook.

import { useEffect } from 'react';
import { useResultContext } from '../context/ResultContext';
import type { ResultSummary } from '../types/logs';

export function usePublishResult(result: ResultSummary) {
  const { setCurrentResult } = useResultContext();

  // JSON.stringify orqali chuqur taqqoslash — ortiqcha re-render'larni oldini oladi
  const serialized = JSON.stringify(result);

  useEffect(() => {
    setCurrentResult(JSON.parse(serialized));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}
