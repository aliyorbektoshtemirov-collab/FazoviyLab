// src/simulations/MathPendulumLab.tsx
// MATEMATIKA (flagship): Matematik mayatnik
// Haqiqiy fizik integratsiya (erkin tushish tezlanishi, uzunlik, ishqalanish)
// asosida tebranuvchi mayatnik. Qo'l bilan "pinch" qilib sharni tortib,
// boshlang'ich burchakni o'rnatish mumkin — qo'l qo'yib yuborilganda
// mayatnik tabiiy tebranishni davom ettiradi.

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import SceneCanvas from '../components/SceneCanvas';
import GroundBoundary from '../components/GroundBoundary';
import type { UseHandTrackingApi } from '../hooks/useHandTracking';
import { usePublishResult } from '../hooks/usePublishResult';
import type { Simulation } from '../types';
import { Activity, Pause, Play, RotateCcw } from 'lucide-react';

interface MathPendulumLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

const GRAVITY_PRESETS: Array<{ label: string; value: number }> = [
  { label: 'Oy', value: 1.62 },
  { label: 'Mars', value: 3.71 },
  { label: 'Yer', value: 9.81 },
  { label: 'Yupiter', value: 24.79 },
];

const METAL_PIVOT = new THREE.MeshPhysicalMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.2 });
const STRING_MAT = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.3, roughness: 0.6 });
const BOB_MAT = new THREE.MeshPhysicalMaterial({
  color: '#22d3ee',
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
});

function PendulumScene({
  length,
  theta,
  stringRef,
  bobRef,
}: {
  length: number;
  theta: number;
  stringRef: RefObject<THREE.Group | null>;
  bobRef: RefObject<THREE.Group | null>;
}) {
  const bobRadius = 0.28;

  return (
    <group position={[0, 2.6, 0]}>
      <mesh position={[-0.9,-4,0]} castShadow receiveShadow><boxGeometry args={[2.8,.16,1.6]}/><meshStandardMaterial color="#354261" metalness={.75} roughness={.24}/></mesh>
      <mesh position={[-1.7,-2,0]} castShadow><cylinderGeometry args={[.045,.065,4,32]}/><meshStandardMaterial color="#b9c5d4" metalness={.95} roughness={.2}/></mesh>
      <mesh position={[-.85,0,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.04,.04,1.8,32]}/><meshStandardMaterial color="#c6d0de" metalness={.95} roughness={.2}/></mesh>
      <mesh position={[-1.7,-.05,0]} castShadow><boxGeometry args={[.2,.3,.25]}/><meshStandardMaterial color="#222a3e" metalness={.8} roughness={.3}/></mesh>
      {/* Tayanch nuqtasi */}
      <mesh material={METAL_PIVOT} castShadow>
        <sphereGeometry args={[0.12, 20, 20]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={METAL_PIVOT}>
        <boxGeometry args={[0.8, 0.06, 0.4]} />
      </mesh>

      <group ref={stringRef} rotation={[0, 0, theta]}>
        <mesh position={[0, -length / 2, 0]} material={STRING_MAT}>
          <cylinderGeometry args={[0.015, 0.015, length, 12]} />
        </mesh>
        <group ref={bobRef} position={[0, -length, 0]}>
          <mesh material={BOB_MAT} castShadow>
            <sphereGeometry args={[bobRadius, 32, 32]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function PhysicsLoop({
  length,
  gravity,
  damping,
  isDragging,
  draggedTheta,
  running,
  onUpdate,
}: {
  length: number;
  gravity: number;
  damping: number;
  isDragging: boolean;
  draggedTheta: number;
  running: boolean;
  onUpdate: (theta: number, omega: number) => void;
}) {
  const thetaRef = useRef(0.5);
  const omegaRef = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);

    if (isDragging) {
      thetaRef.current = draggedTheta;
      omegaRef.current = 0;
      onUpdate(thetaRef.current, omegaRef.current);
      return;
    }

    if (!running) {
      onUpdate(thetaRef.current, omegaRef.current);
      return;
    }

    // Semi-implicit Euler integratsiyasi: theta'' = -(g/L) sin(theta) - damping * theta'
    const angularAccel = -(gravity / length) * Math.sin(thetaRef.current) - damping * omegaRef.current;
    omegaRef.current += angularAccel * dt;
    thetaRef.current += omegaRef.current * dt;

    onUpdate(thetaRef.current, omegaRef.current);
  });

  return null;
}

export default function MathPendulumLab({ hand, simulation }: MathPendulumLabProps) {
  const [length, setLength] = useState(1.8);
  const [gravity, setGravity] = useState(9.81);
  const [running, setRunning] = useState(true);
  const [theta, setTheta] = useState(0.5);
  const [omega, setOmega] = useState(0);
  const [resetVersion,setResetVersion] = useState(0);

  const stringRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);

  const isDragging = hand.isCameraOn && hand.isPinching;
  const draggedTheta = THREE.MathUtils.clamp(hand.pointer.x * 1.3, -1.45, 1.45);

  const theoreticalPeriod = 2 * Math.PI * Math.sqrt(length / gravity);

  const reset = () => {
    setTheta(0.5);
    setOmega(0);
    setResetVersion(v=>v+1);
  };

  usePublishResult({
    mavzu: simulation.title,
    "uzunlik L (m)": Number(length.toFixed(2)),
    'erkin tushish tezlanishi g (m/s\u00b2)': gravity,
    'nazariy davr T (s)': Number(theoreticalPeriod.toFixed(2)),
    "joriy burchak (\u00b0)": Number(((theta * 180) / Math.PI).toFixed(1)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.2, 7]} minDistance={3} maxDistance={13} target={[0, 1, 0]}>
        <GroundBoundary radius={5} accent="#22d3ee" y={-1.5} />
        <PhysicsLoop
          key={resetVersion}
          length={length}
          gravity={gravity}
          damping={0.06}
          isDragging={isDragging}
          draggedTheta={draggedTheta}
          running={running}
          onUpdate={(t, o) => {
            setTheta(t);
            setOmega(o);
          }}
        />
        <PendulumScene length={length} theta={theta} stringRef={stringRef} bobRef={bobRef} />
        <Html position={[0, 1, 0]} center distanceFactor={10}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] text-cyan-200 whitespace-nowrap">
            &omega; = {omega.toFixed(2)} rad/s
          </div>
        </Html>
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-3">
        <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
          <Activity size={16} /> {simulation.title}
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Uzunlik (L)</span>
            <span className="text-slate-200 font-mono">{length.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>g</span>
            <span className="text-slate-200 font-mono">{gravity.toFixed(2)} m/s&sup2;</span>
          </div>
          <div className="h-px bg-slate-700/60 my-1" />
          <div className="flex justify-between text-emerald-300 font-medium">
            <span>Nazariy davr (T)</span>
            <span className="font-mono">{theoreticalPeriod.toFixed(2)} s</span>
          </div>
          <div className="flex justify-between text-amber-300 font-medium">
            <span>Burchak</span>
            <span className="font-mono">{((theta * 180) / Math.PI).toFixed(1)}&deg;</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
          T = 2&pi;&radic;(L/g) &mdash; kichik burchaklar uchun taxminiy formula
        </p>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center">
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/80 text-white hover:bg-cyan-500"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? "To'xtatish" : 'Davom etish'}
        </button>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-14">Uzunlik</label>
          <input
            type="range"
            min={0.6}
            max={3}
            step={0.05}
            value={length}
            onChange={(e) => setLength(parseFloat(e.target.value))}
            className="w-28 accent-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {GRAVITY_PRESETS.map((g) => (
            <button
              key={g.label}
              onClick={() => setGravity(g.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                gravity === g.value ? 'bg-violet-500/80 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60"
        >
          <RotateCcw size={13} /> Qayta
        </button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300">
        Qo&apos;lni qisib (pinch) sharni torting &mdash; qo&apos;yib yuborganda mayatnik tebranadi.
      </div>
    </div>
  );
}
