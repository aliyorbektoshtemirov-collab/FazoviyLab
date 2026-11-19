// src/components/ResultsPanel.tsx
// "Natijalar" paneli: joriy simulyatsiyaning jonli hisob-kitobini D1 bazasiga
// saqlash va avval saqlangan natijalarni ro'yxat ko'rinishida ko'rish uchun
// kichik slide-over interfeys.

import { useEffect, useState } from 'react';
import { ClipboardList, Loader2, RefreshCw, Save, X } from 'lucide-react';
import { useResultContext } from '../context/ResultContext';
import { useExperimentLogs } from '../hooks/useExperimentLogs';

interface ResultsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  simulationId: string;
  simulationTitle: string;
}

const STUDENT_NAME_KEY = 'phazex-3d-student-name';

export default function ResultsPanel({
  isOpen,
  onClose,
  subjectId,
  simulationId,
  simulationTitle,
}: ResultsPanelProps) {
  const { currentResult } = useResultContext();
  const { logs, isLoading, isSaving, error, storageMode, refresh, saveLog } = useExperimentLogs(simulationId);
  const [studentName, setStudentName] = useState(
    () => localStorage.getItem(STUDENT_NAME_KEY) ?? '',
  );
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STUDENT_NAME_KEY, studentName);
  }, [studentName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const ok = await saveLog({
      studentName: studentName.trim() || 'Mehmon',
      subjectId,
      simulationId,
      simulationTitle,
      resultSummary: currentResult,
    });
    if (ok) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <aside className="relative w-full max-w-sm h-full glass-panel rounded-l-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
          <h2 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
            <ClipboardList size={16} /> Natijalar
          </h2>
          <button
            aria-label="Natijalar panelini yopish"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700/40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-slate-700/40 space-y-3">
          <p className="text-xs text-slate-400">
            Joriy simulyatsiya: <span className="text-slate-200 font-medium">{simulationTitle}</span>
          </p>

          <div className="rounded-xl bg-slate-800/50 px-3.5 py-3 space-y-1.5">
            {Object.keys(currentResult).length === 0 && (
              <p className="text-[11px] text-slate-500">
                Natija hali hisoblanmadi. Simulyatsiyada biror parametrni o&apos;zgartiring.
              </p>
            )}
            {Object.entries(currentResult).map(([key, value]) => (
              <div key={key} className="flex justify-between text-[11.5px]">
                <span className="text-slate-400">{key}</span>
                <span className="text-slate-100 font-mono">{String(value)}</span>
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Ismingiz (ixtiyoriy)"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
          />

          <button
            onClick={handleSave}
            disabled={isSaving || Object.keys(currentResult).length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500/80 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium py-2.5 transition-colors"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {justSaved ? 'Saqlandi!' : 'Natijani saqlash'}
          </button>

          <p className="text-[10.5px] text-slate-400 leading-snug">{storageMode === 'local' ? 'Natijalar shu brauzerda saqlanadi. Brauzer ma’lumotlarini tozalash ularni o‘chiradi.' : 'Natijalar laboratoriya bazasida saqlanadi.'}</p>
          {error && <p className="text-[10.5px] text-rose-300 leading-snug">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <h3 className="text-xs font-semibold text-slate-300">Saqlangan natijalar</h3>
          <button
            aria-label="Natijalarni yangilash"
            onClick={() => void refresh()}
            className="text-slate-400 hover:text-cyan-300 w-6 h-6 flex items-center justify-center rounded-md"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5 space-y-2.5">
          {isLoading && logs.length === 0 && (
            <p className="text-[11px] text-slate-500 text-center py-6">Yuklanmoqda...</p>
          )}
          {!isLoading && logs.length === 0 && !error && (
            <p className="text-[11px] text-slate-500 text-center py-6">
              Hali saqlangan natija yo&apos;q. Birinchi bo&apos;lib siz saqlang!
            </p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="glass-card rounded-xl px-3.5 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-100">{log.studentName}</span>
                <span className="text-[10px] text-slate-500">
                  {new Date(log.createdAt).toLocaleString('uz-UZ')}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400">{log.simulationTitle}</p>
              <div className="space-y-1 pt-1 border-t border-slate-700/40">
                {Object.entries(log.resultSummary).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-[10.5px]">
                    <span className="text-slate-500">{key}</span>
                    <span className="text-slate-200 font-mono">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
