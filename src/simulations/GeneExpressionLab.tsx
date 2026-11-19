// src/simulations/GeneExpressionLab.tsx
// BIOLOGIYA (flagship): Gen ekspressiyasi asoslari
// DNK qo'sh spirali asosida transkripsiya (mRNK sintezi) va translyatsiya
// (ribosoma orqali oqsil zanjiri yig'ilishi) jarayonlari vizual tarzda
// ko'rsatiladi. Qo'l bilan pinch qilib yoki sichqoncha bilan spiralni
// aylantirish mumkin.

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import SceneCanvas from '../components/SceneCanvas';
import HandControlledGroup from '../components/HandControlledGroup';
import GltfModel from '../components/GltfModel';
import type { UseHandTrackingApi } from '../hooks/useHandTracking';
import { usePublishResult } from '../hooks/usePublishResult';
import type { Simulation } from '../types';
import { Dna, Gauge, Pause, Play } from 'lucide-react';

interface GeneExpressionLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

const BASE_PAIRS: Array<[string, string, string, string]> = [
  ['A', 'T', '#f87171', '#60a5fa'],
  ['G', 'C', '#34d399', '#fbbf24'],
  ['T', 'A', '#60a5fa', '#f87171'],
  ['C', 'G', '#fbbf24', '#34d399'],
];

const TURNS = 5;
const RUNGS = 42;
const RADIUS = 1.1;
const HEIGHT = 7;

function NucleotideSphere({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} emissive={color} emissiveIntensity={0.25} />
    </mesh>
  );
}

function Rung({ index, speed }: { index: number; speed: number }) {
  const t = index / RUNGS;
  const [base1, base2, color1, color2] = BASE_PAIRS[index % BASE_PAIRS.length];

  const groupRef = useRef<THREE.Group>(null);
  const baseAngle = t * Math.PI * 2 * TURNS;
  const y = t * HEIGHT - HEIGHT / 2;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const angle = baseAngle + clock.elapsedTime * speed;
    const x1 = Math.cos(angle) * RADIUS;
    const z1 = Math.sin(angle) * RADIUS;
    const x2 = Math.cos(angle + Math.PI) * RADIUS;
    const z2 = Math.sin(angle + Math.PI) * RADIUS;

    const left = groupRef.current.children[0] as THREE.Object3D;
    const right = groupRef.current.children[1] as THREE.Object3D;
    const bar = groupRef.current.children[2] as THREE.Mesh;

    left.position.set(x1, 0, z1);
    right.position.set(x2, 0, z2);

    const mid = new THREE.Vector3((x1 + x2) / 2, 0, (z1 + z2) / 2);
    const dist = Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2);
    bar.position.copy(mid);
    bar.scale.set(1, dist, 1);
    bar.rotation.z = Math.PI / 2;
    bar.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  });

  return (
    <group ref={groupRef} position={[0, y, 0]}>
      <NucleotideSphere position={[RADIUS, 0, 0]} color={color1} />
      <NucleotideSphere position={[-RADIUS, 0, 0]} color={color2} />
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.3} />
      </mesh>
      {index % 6 === 0 && (
        <Html position={[0, 0.3, 0]} center distanceFactor={10}>
          <div className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
            {base1}-{base2}
          </div>
        </Html>
      )}
    </group>
  );
}

function Backbone({ speed }: { speed: number }) {
  const { line1, line2 } = useMemo(() => {
    const g1 = new THREE.BufferGeometry();
    const g2 = new THREE.BufferGeometry();
    const posArray1 = new Float32Array((RUNGS + 1) * 3);
    const posArray2 = new Float32Array((RUNGS + 1) * 3);
    g1.setAttribute('position', new THREE.BufferAttribute(posArray1, 3));
    g2.setAttribute('position', new THREE.BufferAttribute(posArray2, 3));
    const m1 = new THREE.LineBasicMaterial({ color: '#22d3ee' });
    const m2 = new THREE.LineBasicMaterial({ color: '#a78bfa' });
    return { line1: new THREE.Line(g1, m1), line2: new THREE.Line(g2, m2) };
  }, []);

  useFrame(({ clock }) => {
    const posAttr1 = line1.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posAttr2 = line2.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i <= RUNGS; i++) {
      const t = i / RUNGS;
      const angle = t * Math.PI * 2 * TURNS + clock.elapsedTime * speed;
      const y = t * HEIGHT - HEIGHT / 2;
      posAttr1.setXYZ(i, Math.cos(angle) * RADIUS, y, Math.sin(angle) * RADIUS);
      posAttr2.setXYZ(i, Math.cos(angle + Math.PI) * RADIUS, y, Math.sin(angle + Math.PI) * RADIUS);
    }
    posAttr1.needsUpdate = true;
    posAttr2.needsUpdate = true;
  });

  return (
    <>
      <primitive object={line1} />
      <primitive object={line2} />
    </>
  );
}

// mRNK zanjiri: transkripsiya progressiga mos holda o'sib boruvchi sariq
// sharchalar qatori (DNK yonida, alohida "sitoplazma" yo'nalishida).
function MessengerRna({ progress }: { progress: number }) {
  const count = Math.round(progress * 24);
  const beads = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <group position={[2.6, -3.2, 0]}>
      {beads.map((i) => (
        <mesh key={i} visible={i < count} position={[i * 0.22, 0, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// Ribosoma: mRNK bo'ylab siljib, protein (oqsil) zanjirini "yig'adi".
function Ribosome({ progress }: { progress: number }) {
  const count = Math.round(progress * 24);
  const x = 2.6 + Math.min(count, 23) * 0.22;
  const beads = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <group>
      <group position={[x, -3.2, 0]}>
        <GltfModel url="/models/biology/ribosome.glb" center targetSize={0.6} />
      </group>
      <group position={[0, -3.8, 0.4]}>
        {beads.map((i) => (
          <mesh key={i} visible={i < count} position={[i * 0.18, -i * 0.02, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function GeneExpressionLab({ hand, simulation }: GeneExpressionLabProps) {
  const [speed, setSpeed] = useState(0.4);
  const [transcribing, setTranscribing] = useState(true);
  const [progress, setProgress] = useState(0.15);

  const rungs = useMemo(() => Array.from({ length: RUNGS }, (_, i) => i), []);

  const onProgress = (dt:number) => {
    setProgress((p) => (p + dt * 0.12 > 1 ? 0 : p + dt * 0.12));
  };

  usePublishResult({
    mavzu: simulation.title,
    'aylanish tezligi': Number(speed.toFixed(2)),
    'transkripsiya foizi (%)': Math.round(progress * 100),
    jarayon: transcribing ? 'faol' : "to'xtatilgan",
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[1, 0, 10]} minDistance={4} maxDistance={18} showStars={false}>
        <ProgressController active={transcribing} onTick={onProgress}/>
        <HandControlledGroup hand={hand} autoRotate={false} sensitivity={2.2}>
          <Backbone speed={speed} />
          {rungs.map((i) => (
            <Rung key={i} index={i} speed={speed} />
          ))}
          <MessengerRna progress={progress} />
          <Ribosome progress={progress} />
        </HandControlledGroup>
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
          <Dna size={16} /> {simulation.title}
        </h3>
        <p className="text-[11px] text-slate-400 leading-snug">
          DNK zanjiridan mRNK sintezlanadi (transkripsiya), so&apos;ngra ribosoma uni
          o&apos;qib oqsil zanjirini yig&apos;adi (translyatsiya).
        </p>
        <div className="w-full h-2 rounded-full bg-slate-800/70 overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex gap-3 pt-1 text-[10px]">
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> A
          </span>
          <span className="flex items-center gap-1 text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> T
          </span>
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> G
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> C
          </span>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-4 flex-wrap justify-center">
        <button
          onClick={() => setTranscribing((t) => !t)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/80 text-white hover:bg-violet-500"
        >
          {transcribing ? <Pause size={14} /> : <Play size={14} />}
          {transcribing ? "To'xtatish" : 'Transkripsiya'}
        </button>
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-slate-400" />
          <label className="text-[11px] text-slate-400">Aylanish tezligi</label>
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-32 accent-violet-400"
          />
          <span className="text-[11px] text-slate-300 font-mono w-10">{speed.toFixed(2)}</span>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300">
        Qo&apos;lni qisib (pinch) spiralni fazoda aylantiring.
      </div>
    </div>
  );
}

function ProgressController({active,onTick}:{active: boolean; onTick: (dt: number) => void}) {
  useFrame((_, dt) => {
    if (active) onTick(dt);
  });
  return null;
}
