// src/simulations/SolarSystemLab.tsx
// FIZIKA: 3D Quyosh Sistemasi va Gravitatsiya
// Sayyoralar elliptik(doiraviy) orbitalarda, haqiqiy nisbatlarga yaqin tezlikda
// aylanadi. Qo'l bilan pinch qilib butun tizimni aylantirish mumkin, shuningdek
// vaqt tezligini (simulyatsiya tezligi) boshqarish sliderlari mavjud.

import { useFrame } from '@react-three/fiber';
import { Html, Trail } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import SceneCanvas from '../components/SceneCanvas';
import HandControlledGroup from '../components/HandControlledGroup';
import GltfModel from '../components/GltfModel';
import type { UseHandTrackingApi } from '../hooks/useHandTracking';
import { usePublishResult } from '../hooks/usePublishResult';
import type { Simulation } from '../types';
import { Pause, Play, Gauge } from 'lucide-react';

interface SolarSystemLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

interface PlanetDef {
  name: string;
  radius: number;
  distance: number;
  color: string;
  modelUrl: string;
  orbitalSpeed: number; // radian/soniya (relative)
  rotationSpeed: number;
}

const PLANETS: PlanetDef[] = [
  { name: 'Merkuriy', radius: 0.12, distance: 1.6, color: '#b0a89f', modelUrl: '/models/physics/mercury-planet.glb', orbitalSpeed: 1.6, rotationSpeed: 0.6 },
  { name: 'Venera', radius: 0.18, distance: 2.1, color: '#e0c17d', modelUrl: '/models/physics/venus.glb', orbitalSpeed: 1.17, rotationSpeed: 0.4 },
  { name: 'Yer', radius: 0.2, distance: 2.7, color: '#3b82f6', modelUrl: '/models/physics/earth-and-moon.glb', orbitalSpeed: 1.0, rotationSpeed: 1.2 },
  { name: 'Mars', radius: 0.15, distance: 3.3, color: '#dc6b4a', modelUrl: '/models/physics/mars.glb', orbitalSpeed: 0.8, rotationSpeed: 1.1 },
  { name: 'Yupiter', radius: 0.45, distance: 4.3, color: '#d8ae77', modelUrl: '/models/physics/jupiter.glb', orbitalSpeed: 0.43, rotationSpeed: 2.4 },
  { name: 'Saturn', radius: 0.38, distance: 5.4, color: '#e3cf9c', modelUrl: '/models/physics/saturn.glb', orbitalSpeed: 0.32, rotationSpeed: 2.2 },
  { name: 'Uran', radius: 0.26, distance: 6.3, color: '#9fe0e0', modelUrl: '/models/physics/uranus.glb', orbitalSpeed: 0.23, rotationSpeed: 1.6 },
  { name: 'Neptun', radius: 0.25, distance: 7.1, color: '#5b7fe0', modelUrl: '/models/physics/neptune.glb', orbitalSpeed: 0.18, rotationSpeed: 1.6 },
];

function Sun() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.15;
  });
  return (
    <group>
      <group ref={ref}>
        <GltfModel url="/models/physics/sun.glb" center targetSize={1.6} castShadow={false} />
      </group>
      <pointLight color="#fff3d6" intensity={6} distance={30} decay={1.3} />
      <mesh>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: '#334155', transparent: true, opacity: 0.5 });
    return new THREE.Line(geometry, material);
  }, [points]);

  return <primitive object={line} />;
}

function Planet({
  def,
  speedMultiplier,
  onSelect,
  isSelected,
}: {
  def: PlanetDef;
  speedMultiplier: number;
  onSelect: (name: string) => void;
  isSelected: boolean;
}) {
  const orbitRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Group>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    angleRef.current += dt * def.orbitalSpeed * 0.4 * speedMultiplier;
    if (orbitRef.current) {
      orbitRef.current.position.set(
        Math.cos(angleRef.current) * def.distance,
        0,
        Math.sin(angleRef.current) * def.distance,
      );
    }
    if (planetRef.current) {
      planetRef.current.rotation.y += dt * def.rotationSpeed * speedMultiplier;
    }
  });

  return (
    <group>
      <OrbitRing radius={def.distance} />
      <group ref={orbitRef}>
        <Trail width={1.2} length={6} color={def.color} attenuation={(t) => t * t}>
          <group
            ref={planetRef}
            onClick={() => onSelect(def.name)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default';
            }}
          >
            <GltfModel url={def.modelUrl} center targetSize={def.radius * 2} />
          </group>
        </Trail>
        {isSelected && (
          <Html position={[0, def.radius + 0.25, 0]} center distanceFactor={10}>
            <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-sky-200 whitespace-nowrap">
              {def.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

export default function SolarSystemLab({ hand, simulation }: SolarSystemLabProps) {
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const effectiveSpeed = paused ? 0 : speed;

  usePublishResult({
    mavzu: simulation.title,
    'simulyatsiya tezligi': Number(speed.toFixed(2)),
    holat: paused ? "to'xtatilgan" : 'harakatda',
    'tanlangan sayyora': selected ?? '-',
    'sayyoralar soni': PLANETS.length,
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas
        showStars
        cameraPosition={[0, 6, 11]}
        minDistance={4}
        maxDistance={24}
        orbitEnabled={!(hand.isCameraOn && hand.isPinching)}
      >
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.04} sensitivity={2}>
          <Sun />
          {PLANETS.map((p) => (
            <Planet
              key={p.name}
              def={p}
              speedMultiplier={effectiveSpeed}
              onSelect={setSelected}
              isSelected={selected === p.name}
            />
          ))}
        </HandControlledGroup>
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        {selected && (
          <div className="mt-2 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-sky-200">
            Tanlangan: <span className="font-semibold">{selected}</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5">
        <button
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/80 text-white hover:bg-amber-500"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Davom etish' : "To'xtatish"}
        </button>
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-slate-400" />
          <label className="text-[11px] text-slate-400">Tezlik</label>
          <input
            type="range"
            min={0.1}
            max={4}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-32 accent-amber-400"
          />
          <span className="text-[11px] text-slate-300 font-mono w-8">{speed.toFixed(1)}x</span>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300">
        Qo&apos;lni qisib (pinch) butun tizimni aylantiring, sayyorani bosib nomini ko&apos;ring.
      </div>
    </div>
  );
}
