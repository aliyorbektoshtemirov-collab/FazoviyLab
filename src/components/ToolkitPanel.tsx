// src/components/ToolkitPanel.tsx
// Har bir fan uchun umumiy "asbob-uskunalar" (toolkit) paneli. Foydalanuvchi
// bu paneldan kerakli asbobni bosib, 3D sahnaga qo'shadi. Mos keladigan fan
// ranggi bilan vizual ravishda moslashtiriladi.

import { getIcon } from './iconRegistry';
import type { ToolDefinition } from '../types';

interface ToolkitPanelProps {
  title: string;
  tools: ToolDefinition[];
  accent: string;
  onAddTool: (toolId: string) => void;
  placedCount: number;
  onClearAll: () => void;
  /** Sahnadagi maksimal obyektlar soni (chegaradan tashqariga chiqmasligi uchun) */
  maxItems?: number;
}

export default function ToolkitPanel({
  title,
  tools,
  accent,
  onAddTool,
  placedCount,
  onClearAll,
  maxItems,
}: ToolkitPanelProps) {
  const atLimit = typeof maxItems === 'number' && placedCount >= maxItems;

  return (
    <aside className="absolute top-4 left-4 z-20 glass-panel neon-ring rounded-2xl w-60 flex flex-col max-h-[calc(100%-2rem)]" style={{ ['--ring-color' as string]: `${accent}33` }}>
      <div className="px-4 py-3.5 border-b border-slate-700/40">
        <h3 className="text-sm font-semibold" style={{ color: accent }}>
          {title}
        </h3>
        <p className="text-[10.5px] text-slate-500 mt-0.5">
          {atLimit ? "Chegaraga yetdingiz — avval tozalang" : "Asbobni bosib sahnaga qo'shing"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1.5">
        {tools.map((tool) => {
          const Icon = getIcon(tool.icon);
          return (
            <button
              key={tool.id}
              onClick={() => onAddTool(tool.id)}
              disabled={atLimit}
              className="w-full flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left glass-card hover:scale-[1.02] transition-transform disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ borderColor: `${accent}30` }}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${accent}22`, color: accent }}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-slate-100">{tool.label}</span>
                <span className="block text-[10px] text-slate-500 leading-snug">{tool.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-slate-700/40 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Sahnada: {placedCount}
          {typeof maxItems === 'number' ? ` / ${maxItems}` : ''} ta
        </span>
        <button
          onClick={onClearAll}
          disabled={placedCount === 0}
          className="text-[11px] font-medium text-rose-300 hover:text-rose-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Tozalash
        </button>
      </div>
    </aside>
  );
}
