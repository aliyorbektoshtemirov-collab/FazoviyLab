// src/components/WorkspaceHeader.tsx
// Simulyatsiya ishchi oynasi tepasidagi yupqa boshqaruv paneli: "Orqaga"
// tugmasi, mavzu nomi va fan belgisi.

import { ArrowLeft, Sparkles } from 'lucide-react';
import { getIcon } from './iconRegistry';
import type { Simulation, Subject } from '../types';

interface WorkspaceHeaderProps {
  subject: Subject;
  simulation: Simulation;
  onBack: () => void;
}

export default function WorkspaceHeader({ subject, simulation, onBack }: WorkspaceHeaderProps) {
  const SubjectIcon = getIcon(subject.icon);

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-slate-800/60 bg-space-950/70 backdrop-blur-md z-30">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        <ArrowLeft size={15} />
        Orqaga
      </button>

      <div className="h-6 w-px bg-slate-700/60" />

      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${subject.accent}22`, color: subject.accent }}
      >
        <SubjectIcon size={14} />
      </span>

      <div className="min-w-0">
        <p className="text-xs text-slate-500 leading-none">{subject.name}</p>
        <h1 className="text-sm font-semibold text-slate-100 truncate leading-tight">{simulation.title}</h1>
      </div>

      {simulation.kind === 'flagship' && (
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-400/90 text-amber-950 rounded-full px-2 py-0.5 ml-1">
          <Sparkles size={10} /> Chuqur tajriba
        </span>
      )}
    </header>
  );
}
