// src/simulations/ChemistryReactionLab.tsx
// KIMYO: 3D Kimyoviy Reaksiya va Kolbalar
// Ikki xil rangli suyuqlikka ega shisha kolbalar. Qo'l bilan pinch qilib
// "aralashtirish" effektini ishga tushirish mumkin: suyuqlik rangi aralashadi,
// pufakchalar chiqadi va reaksiya progressi ortadi.

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import SceneCanvas from '../components/SceneCanvas';
import GroundBoundary from '../components/GroundBoundary';
import GltfModel from '../components/GltfModel';
import { FlaskGlass, Liquid, Bubbles, StirringRod } from '../components/chemistry/GlassParts';
import type { UseHandTrackingApi } from '../hooks/useHandTracking';
import { usePublishResult } from '../hooks/usePublishResult';
import type { Simulation } from '../types';
import { FlaskConical, RotateCcw, Sparkles } from 'lucide-react';

interface ChemistryReactionLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

const COLOR_A = new THREE.Color('#22d3ee'); // ko'k reagent
const COLOR_B = new THREE.Color('#f472b6'); // pushti reagent
const COLOR_RESULT = new THREE.Color('#a855f7'); // binafsha mahsulot

export default function ChemistryReactionLab({ hand, simulation }: ChemistryReactionLabProps) {
  const [reactionProgress, setReactionProgress] = useState(0);
  const [isStirring, setIsStirring] = useState(false);
  const stirTimeout = useRef<number | null>(null);

  const onHandStir = (dt:number) => {
    setIsStirring(true);
    setReactionProgress((p) => Math.min(1, p + Math.min(dt,.05)*.24));
    if (stirTimeout.current) window.clearTimeout(stirTimeout.current);
    stirTimeout.current = window.setTimeout(() => setIsStirring(false), 300);
  };
  useEffect(()=>()=>{if(stirTimeout.current)window.clearTimeout(stirTimeout.current);},[]);

  const mixedColor = useMemo(() => {
    const c = new THREE.Color();
    c.lerpColors(COLOR_A, COLOR_RESULT, Math.min(1, reactionProgress * 1.4));
    return c;
  }, [reactionProgress]);

  const reset = () => setReactionProgress(0);

  usePublishResult({
    mavzu: simulation.title,
    "reaksiya foizi (%)": Math.round(reactionProgress * 100),
    aralashtirilmoqda: isStirring,
    mahsulot: reactionProgress > 0.95 ? 'Binafsha birikma hosil bo\u2018ldi' : 'Reaksiya davom etmoqda',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.4, 6.5]} minDistance={3} maxDistance={12} target={[0, 0.3, -1]}>
        <StirController hand={hand} onStir={onHandStir}/>
        <GroundBoundary radius={6} accent="#34d399" />

        {/* Dekorativ probirka shtativi */}
        <group position={[2.6, 0, 0.8]} rotation={[0, -0.4, 0]}>
          <GltfModel url="/models/chemistry/test-tube-rack.glb" center targetSize={1.1} />
        </group>

        {/* Chap kolba: reagent A */}
        <group position={[-1.3, 0, 0]}>
          <FlaskGlass position={[0, 0, 0]} />
          <Liquid position={[0, 0, 0]} color={COLOR_A} fillLevel={0.55} bubbleActivity={0.3} />
          <Bubbles position={[0, 0, 0]} active={isStirring} color={COLOR_A} />
        </group>

        {/* O'ng kolba: reagent B */}
        <group position={[1.3, 0, 0]}>
          <FlaskGlass position={[0, 0, 0]} />
          <Liquid position={[0, 0, 0]} color={COLOR_B} fillLevel={0.55} bubbleActivity={0.3} />
          <Bubbles position={[0, 0, 0]} active={isStirring} color={COLOR_B} />
        </group>

        {/* Markaziy katta kolba: aralashma / reaksiya natijasi */}
        <group position={[0, 0, -2.2]} scale={1.3}>
          <FlaskGlass position={[0, 0, 0]} />
          <Liquid
            position={[0, 0, 0]}
            color={mixedColor}
            fillLevel={0.35 + reactionProgress * 0.35}
            bubbleActivity={0.5 + reactionProgress * 1.5}
          />
          <Bubbles position={[0, 0, 0]} active={isStirring || reactionProgress > 0.05} color={mixedColor} />
          <StirringRod position={[0, 0, 0]} active={isStirring} />
          <group position={[0, -0.5, 0]}>
            <GltfModel url="/models/chemistry/bunsen-burner.glb" center targetSize={0.9} />
          </group>
          <Html position={[0, 2.1, 0]} center distanceFactor={9}>
            <div className="glass-panel rounded-lg px-3 py-1.5 text-[11px] text-fuchsia-200 whitespace-nowrap">
              Reaksiya: {Math.round(reactionProgress * 100)}%
            </div>
          </Html>
        </group>
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
          <FlaskConical size={16} /> {simulation.title}
        </h3>
        <p className="text-[11px] text-slate-400 leading-snug">
          Ikki reagent (ko&apos;k va pushti) markaziy kolbaga quyilgan. Qo&apos;lni pinch
          qilib aylantiring &mdash; aralashtirish tayoqchasi ishga tushadi va reaksiya
          binafsha rangli mahsulot hosil qiladi.
        </p>
        <div className="w-full h-2 rounded-full bg-slate-800/70 overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-fuchsia-400 transition-all duration-200"
            style={{ width: `${reactionProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-4">
        <button
          onClick={() => {
            setIsStirring(true);
            setReactionProgress((p) => Math.min(1, p + 0.12));
            window.setTimeout(() => setIsStirring(false), 500);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/80 text-white hover:bg-emerald-500"
        >
          <Sparkles size={14} /> Aralashtirish
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60"
        >
          <RotateCcw size={13} /> Qayta boshlash
        </button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300">
        Qo&apos;lni qisib (pinch) tuting va aylantiring &mdash; markaziy kolbada aralashtirish boshlanadi.
      </div>
    </div>
  );
}

// Qo'l pinch holatini kuzatib, har frame'da callback chaqiruvchi yordamchi hook.
// useFrame komponent darajasida chaqirilishi shart bo'lgani uchun alohida hook sifatida ajratildi.
function StirController({hand,onStir}:{hand: UseHandTrackingApi; onStir: (dt:number) => void}) {
  useFrame((_,dt) => {
    if (hand.isCameraOn && hand.isPinching) {
      onStir(dt);
    }
  });
  return null;
}
