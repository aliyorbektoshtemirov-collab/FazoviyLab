// src/hooks/useExperimentLogs.ts
// Cloudflare Pages Function (/api/logs) bilan ishlash uchun hook:
// natijalarni o'qish (GET) va yangi natija saqlash (POST).
// Rivojlantirish muhitida (oddiy `vite dev`) backend mavjud bo'lmasa,
// so'rovlar muloyimlik bilan xato holatiga o'tadi va UI buzilmaydi.

import { useCallback, useEffect, useState } from 'react';
import type { CreateLogInput, ExperimentLog } from '../types/logs';

interface UseExperimentLogsApi {
  logs: ExperimentLog[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  storageMode: 'server' | 'local';
  refresh: () => Promise<void>;
  saveLog: (input: CreateLogInput) => Promise<boolean>;
}

export function useExperimentLogs(simulationId?: string): UseExperimentLogsApi {
  const [logs, setLogs] = useState<ExperimentLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'server'|'local'>('server');
  const readLocal = () => {
    const value: unknown = JSON.parse(localStorage.getItem('phazex-experiments-v1') ?? '[]');
    return Array.isArray(value) ? value as ExperimentLog[] : [];
  };

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (simulationId) params.set('simulationId', simulationId);
      params.set('limit', '25');

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; logs: ExperimentLog[]; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Noma'lum xatolik");
      setLogs(data.logs);
      setStorageMode('server');
    } catch {
      setStorageMode('local');
      try { setLogs(readLocal().filter(l => !simulationId || l.simulationId === simulationId).slice(0,25)); }
      catch { setError('Brauzerdagi natijalarni o‘qib bo‘lmadi. Saqlash ruxsatini tekshiring.'); }
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  const saveLog = useCallback(async (input: CreateLogInput): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; log: ExperimentLog; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Noma'lum xatolik");
      setLogs((prev) => [data.log, ...prev].slice(0, 25));
      return true;
    } catch {
      try {
        const entry: ExperimentLog = {...input,id:Date.now(),createdAt:new Date().toISOString()};
        localStorage.setItem('phazex-experiments-v1',JSON.stringify([entry,...readLocal()].slice(0,200)));
        setLogs(prev => [entry,...prev].slice(0,25));
        setStorageMode('local');
        return true;
      } catch {setError('Natijani saqlab bo‘lmadi. Brauzer xotirasi to‘lgan yoki saqlashga ruxsat berilmagan.');return false;}
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  return { logs, isLoading, isSaving, error, storageMode, refresh, saveLog };
}
