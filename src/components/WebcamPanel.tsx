// src/components/WebcamPanel.tsx
// Ekranning yuqori o'ng burchagidagi kichik veb-kamera oynasi va
// "Kamera boshqaruvini yoqish/o'chirish" tugmasi.

import { Camera, CameraOff, Hand, Loader2 } from 'lucide-react';
import type { UseHandTrackingApi } from '../hooks/useHandTracking';

interface WebcamPanelProps {
  hand: UseHandTrackingApi;
}

export default function WebcamPanel({ hand }: WebcamPanelProps) {
  const { videoRef, isCameraOn, isLoading, isHandDetected, isPinching, toggleCamera, error } = hand;

  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
      <div className="glass-panel rounded-2xl overflow-hidden w-56 aspect-video relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover -scale-x-100"
          muted
          playsInline
        />
        {!isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-space-900/80 text-slate-400 text-xs text-center px-3">
            <CameraOff size={22} className="opacity-60" />
            <span>Kamera o&apos;chirilgan</span>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-space-900/80 text-cyan-300 text-xs">
            <Loader2 size={22} className="animate-spin" />
            <span>Model yuklanmoqda...</span>
          </div>
        )}
        {isCameraOn && !isLoading && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                isHandDetected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-slate-700/40 text-slate-300 border border-slate-500/30'
              }`}
            >
              <Hand size={11} />
              {isHandDetected ? "Qo'l aniqlandi" : 'Qo\u2018l topilmadi'}
            </span>
            {isPinching && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 animate-pulse-glow">
                Ushlandi
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={toggleCamera}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all glass-panel hover:scale-[1.03] active:scale-95 ${
          isCameraOn ? 'text-rose-300' : 'text-cyan-300'
        }`}
      >
        {isCameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
        {isCameraOn ? "Kamerani o'chirish" : 'Kamera boshqaruvini yoqish'}
      </button>

      {error && (
        <div className="glass-panel rounded-xl px-3 py-2 text-[11px] text-rose-300 max-w-56 text-right">
          {error}
        </div>
      )}
    </div>
  );
}
