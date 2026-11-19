// src/types/index.ts
// "Phazex 3D" platformasi uchun umumiy TypeScript tiplari

export type SubjectId = 'math' | 'physics' | 'chemistry' | 'biology';

// 'flagship'   = chuqur, mavzuga maxsus ishlab chiqilgan to'liq 3D simulyatsiya
// 'sandbox'    = fan bo'yicha umumiy asbob-uskunalar to'plami (toolkit) bilan
//                ishlaydigan interaktiv 3D laboratoriya (mavzuga moslashtirilgan
//                tavsif va boshlang'ich holat bilan)
export type SimulationKind = 'flagship' | 'sandbox';

export interface Simulation {
  id: string;
  title: string;
  shortDescription: string;
  subjectId: SubjectId;
  kind: SimulationKind;
  icon: string; // lucide-react ikonka nomi
}

export interface Subject {
  id: SubjectId;
  name: string;
  colorFrom: string;
  colorTo: string;
  accent: string;
  icon: string;
  simulations: Simulation[];
}

export interface HandLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingState {
  isCameraOn: boolean;
  isLoading: boolean;
  isHandDetected: boolean;
  isPinching: boolean;
  pinchStrength: number; // 0 - 1 oralig'ida, 0 = yopiq (pinch), 1 = ochiq
  // Normallashtirilgan (-1 .. 1) ekran koordinatalari, 3D sahnaga proyeksiya qilish uchun
  pointer: { x: number; y: number };
  // Pinch boshlangan nuqtadan hozirgi nuqtagacha bo'lgan farq (drag effektlari uchun)
  delta: { x: number; y: number };
  error: string | null;
}

export interface GeometrySolidStats {
  type: 'cube' | 'cylinder';
  size: number; // umumiy o'lcham parametri (tomon yoki radius)
  height: number;
  volume: number;
  surfaceArea: number;
}

// --- Fan bo'yicha asbob-uskunalar (toolkit) paneli uchun tiplar ---

export interface ToolDefinition {
  id: string;
  label: string;
  icon: string; // lucide-react ikonka nomi
  description: string;
}

export interface PlacedTool {
  instanceId: string;
  toolId: string;
  position: [number, number, number];
}
