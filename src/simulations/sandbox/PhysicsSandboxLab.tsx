// src/simulations/sandbox/PhysicsSandboxLab.tsx
// FIZIKA — 9 ta "sandbox" mavzu uchun yagona kirish nuqtasi. `simulation.id`
// bo'yicha tarmoqlanadi: ikki mavzu ("Elektr zanjiri..." va "Om qonuni")
// umumiy zanjir konstruktorini ishlatadi (batareyka/sim/rezistor/lampochka/
// voltmetr/magnet, haqiqiy U=IR hisob-kitobi bilan) — bu xatti-harakat
// o'zgarishsiz saqlanadi. Qolgan 7 mavzu esa har biri o'ziga xos, haqiqiy
// fizik formulaga asoslangan mini-simulyatsiyaga ega: Suzuvchanlik (Arximed),
// Ovoz to'lqinlari, Skeyt parkda energiya saqlanishi, To'qnashuv fizikasi
// (impuls saqlanishi), Zaryadlar va maydonlar (Kulon qonuni), Yorug'likning
// sinishi (Snell qonuni) va Faradey qonuni (induksiya EYUK).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import SceneCanvas from '../../components/SceneCanvas';
import HandControlledGroup from '../../components/HandControlledGroup';
import ToolkitPanel from '../../components/ToolkitPanel';
import GroundBoundary, { clampedCircleLayout, clampedRowLayout } from '../../components/GroundBoundary';
import GltfModel from '../../components/GltfModel';
import { createBattery, createBulb } from '../../components/labObjects';
import type { UseHandTrackingApi } from '../../hooks/useHandTracking';
import { usePublishResult } from '../../hooks/usePublishResult';
import type { PlacedTool, Simulation, ToolDefinition } from '../../types';

interface PhysicsSandboxLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}



/* ------------------------------------------------------------------------ */
/* 1) ELEKTR ZANJIRI KONSTRUKTORI — physics-circuit-construction-dc        */
/*    va physics-ohms-law uchun. Mavjud xatti-harakat o'zgarishsiz.        */
/* ------------------------------------------------------------------------ */

const CIRCUIT_TOOLS: ToolDefinition[] = [
  { id: 'battery', label: 'Batareyka', icon: 'Battery', description: '9V kuchlanish manbai' },
  { id: 'wire', label: 'Sim', icon: 'Cable', description: 'O‘tkazgich ulovchi element' },
  { id: 'resistor', label: 'Rezistor', icon: 'CircuitBoard', description: 'Qarshilik qo‘shadi (15Ω)' },
  { id: 'bulb', label: 'Lampochka', icon: 'Lightbulb', description: 'Tok o‘tsa yonadi' },
  { id: 'voltmeter', label: 'Voltmetr', icon: 'Gauge', description: 'Kuchlanish va tokni o‘lchaydi' },
  { id: 'magnet', label: 'Magnit', icon: 'Magnet', description: 'Magnit maydon chiziqlari' },
];

function CircuitBatteryMesh() {
  const model=useMemo(()=>createBattery(),[]);
  return <primitive object={model} scale={0.85}/>;
}

function CircuitWireMesh() {
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f97316', metalness: 0.3, roughness: 0.4 }), []);
  return (
    <mesh rotation={[0, 0, Math.PI / 2]} material={material} castShadow>
      <cylinderGeometry args={[0.05, 0.05, 0.9, 16]} />
    </mesh>
  );
}

function CircuitResistorMesh() {
  return <GltfModel url="/models/physics/resistor.glb" center targetSize={0.55} />;
}

function CircuitBulbMesh({ brightness }: { brightness: number }) {
  const model=useMemo(()=>createBulb(brightness>0.05),[brightness>0.05]);
  return <group scale={0.9}><primitive object={model}/>{brightness>0.05&&<pointLight position={[0,.8,0]} color="#ffbd60" intensity={brightness*5} distance={4}/>}</group>;
}

function CircuitVoltmeterMesh({ voltage, current }: { voltage: number; current: number }) {
  return (
    <group>
      <GltfModel url="/models/physics/voltmeter.glb" center targetSize={0.7} />
      <Html position={[0, 0.5, 0]} center distanceFactor={8}>
        <div className="glass-panel rounded-md px-2 py-1 text-[10px] text-emerald-300 font-mono whitespace-nowrap">
          {voltage.toFixed(1)} V &middot; {current.toFixed(2)} A
        </div>
      </Html>
    </group>
  );
}

function CircuitMagnetMesh() {
  const ringRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ringRef.current) ringRef.current.rotation.z += dt * 0.6;
  });
  return (
    <group>
      <GltfModel url="/models/physics/magnet-bar.glb" center targetSize={0.8} />
      <group ref={ringRef}>
        {[0.6, 0.9, 1.2].map((r) => (
          <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.01, 8, 48]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function CircuitPartMesh({ tool, circuit }: { tool: PlacedTool; circuit: { brightness: number; voltage: number; current: number } }) {
  switch (tool.toolId) {
    case 'battery':
      return <CircuitBatteryMesh />;
    case 'wire':
      return <CircuitWireMesh />;
    case 'resistor':
      return <CircuitResistorMesh />;
    case 'bulb':
      return <CircuitBulbMesh brightness={circuit.brightness} />;
    case 'voltmeter':
      return <CircuitVoltmeterMesh voltage={circuit.voltage} current={circuit.current} />;
    case 'magnet':
      return <CircuitMagnetMesh />;
    default:
      return null;
  }
}

const CIRCUIT_GROUND_RADIUS = 5.2;
const CIRCUIT_MAX_PARTS = 10;

function circuitLayoutPosition(index: number, total: number): [number, number, number] {
  const [x, , z] = clampedRowLayout(index, total, CIRCUIT_GROUND_RADIUS, 1.3);
  return [x, 0.5, z];
}

function CircuitBuilderLab({ simulation, hand }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [placed, setPlaced] = useState<PlacedTool[]>(() => ['battery','wire','bulb','wire'].map((toolId,i) => ({instanceId:`initial-${i}`,toolId,position:circuitLayoutPosition(i,4)})));
  const [switchClosed, setSwitchClosed] = useState(true);
  const [batteryVoltage, setBatteryVoltage] = useState(9);
  const [resistorOhms, setResistorOhms] = useState(15);

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= CIRCUIT_MAX_PARTS) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => ({ ...p, position: circuitLayoutPosition(i, next.length) }));
    });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    placed.forEach((p) => {
      c[p.toolId] = (c[p.toolId] ?? 0) + 1;
    });
    return c;
  }, [placed]);

  const batteryCount = counts.battery ?? 0;
  const wireCount = counts.wire ?? 0;
  const resistorCount = counts.resistor ?? 0;
  const bulbCount = counts.bulb ?? 0;

  const circuitComplete = switchClosed && batteryCount >= 1 && wireCount >= 2 && bulbCount >= 1;
  const voltage = batteryCount * batteryVoltage;
  const resistance = 5 + resistorCount * resistorOhms + (bulbCount > 0 ? 8 : 0);
  const current = circuitComplete ? voltage / resistance : 0;
  const brightness = THREE.MathUtils.clamp(current / 1.5, 0, 1);

  usePublishResult({
    mavzu: simulation.title,
    'zanjir holati': circuitComplete ? 'yopiq (ishlayapti)' : 'ochiq',
    'kuchlanish U (V)': Number(voltage.toFixed(1)),
    'qarshilik R (Ω)': Number(resistance.toFixed(1)),
    'tok kuchi I (A)': Number(current.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 3.2, 6.5]} minDistance={3} maxDistance={13}>
        <GroundBoundary radius={CIRCUIT_GROUND_RADIUS} accent="#fbbf24" />
        <HandControlledGroup hand={hand} autoRotate={false}>
          {placed.length >= 2 && <Line points={placed.map(p => p.position)} color={circuitComplete ? '#ef575f' : '#63718c'} lineWidth={4} />}
          {placed.length >= 2 && <Line points={[placed[0].position,[placed[0].position[0],0.22,0.8],[placed[placed.length-1].position[0],0.22,0.8],placed[placed.length-1].position]} color="#404b60" lineWidth={4} />}
          {placed.map((p) => (
            <group key={p.instanceId} position={p.position}>
              <CircuitPartMesh tool={p} circuit={{ brightness, voltage, current }} />
            </group>
          ))}
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title="Fizika asboblari"
        tools={CIRCUIT_TOOLS}
        accent="#fbbf24"
        placedCount={placed.length}
        maxItems={CIRCUIT_MAX_PARTS}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Zanjir</span>
            <span className={circuitComplete ? 'text-emerald-300' : 'text-rose-300'}>
              {circuitComplete ? 'Ulangan' : 'Uzilgan'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">U</span>
            <span className="text-slate-200 font-mono">{voltage.toFixed(1)} V</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">R</span>
            <span className="text-slate-200 font-mono">{resistance.toFixed(1)} Ω</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">I</span>
            <span className="text-slate-200 font-mono">{current.toFixed(2)} A</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-2xl">
        <button className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white" onClick={() => setSwitchClosed(v => !v)} aria-pressed={switchClosed}>{switchClosed ? 'Zanjirni uzish' : 'Zanjirni ulash'}</button>
        <div className="flex items-center gap-2">
          <label htmlFor="battery-voltage" className="text-[11px] text-slate-400 whitespace-nowrap">
            Batareya (V)
          </label>
          <input
            id="battery-voltage"
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={batteryVoltage}
            onChange={(e) => setBatteryVoltage(THREE.MathUtils.clamp(parseFloat(e.target.value) || 0, 1, 24))}
            className="w-16 rounded-lg bg-slate-800/70 border border-amber-400/30 px-2 py-1 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400/70"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="resistor-ohms" className="text-[11px] text-slate-400 whitespace-nowrap">
            Rezistor (&Omega;)
          </label>
          <input
            id="resistor-ohms"
            type="number"
            min={1}
            max={200}
            step={1}
            value={resistorOhms}
            onChange={(e) => setResistorOhms(THREE.MathUtils.clamp(parseFloat(e.target.value) || 0, 1, 200))}
            className="w-16 rounded-lg bg-slate-800/70 border border-amber-400/30 px-2 py-1 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400/70"
          />
        </div>
        <span className="text-[11px] text-slate-500 border-l border-slate-700/60 pl-4">
          Batareyka + 2 ta sim + lampochka qo&apos;yib zanjirni yoping
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 2) SUZUVCHANLIK — physics-buoyancy (Arximed kuchi)                      */
/* ------------------------------------------------------------------------ */

interface BuoyancyMaterial {
  label: string;
  icon: string;
  density: number; // kg/m^3
}

const BUOYANCY_MATERIALS: Record<string, BuoyancyMaterial> = {
  cork: { label: 'Probka', icon: 'Leaf', density: 240 },
  wood: { label: 'Yog‘och', icon: 'TreePine', density: 600 },
  ice: { label: 'Muz', icon: 'Snowflake', density: 920 },
  plastic: { label: 'Plastik', icon: 'Box', density: 950 },
  aluminum: { label: 'Alyuminiy', icon: 'Hexagon', density: 2700 },
  steel: { label: 'Po‘lat', icon: 'Gem', density: 7800 },
};

const BUOYANCY_TOOLS: ToolDefinition[] = Object.entries(BUOYANCY_MATERIALS).map(([id, m]) => ({
  id,
  label: m.label,
  icon: m.icon,
  description: `ρ ≈ ${m.density} kg/m³`,
}));

const BUOYANCY_FLUIDS: Array<{ id: string; label: string; density: number }> = [
  { id: 'water', label: 'Suv', density: 1000 },
  { id: 'oil', label: 'Yog‘', density: 920 },
  { id: 'saltwater', label: 'Sho‘r suv', density: 1030 },
  { id: 'honey', label: 'Asal', density: 1420 },
];

const BUOYANCY_GROUND_RADIUS = 4.6;
const BUOYANCY_MAX_OBJECTS = 5;
const BUOYANCY_SIDE = 0.6; // m (demo kub tomoni)
const BUOYANCY_VOLUME = BUOYANCY_SIDE ** 3; // m^3
const BUOYANCY_G = 9.81;
const BUOYANCY_WATER_TOP = 1.5;
const BUOYANCY_POOL_BOTTOM = 0;

function buoyancyLayoutX(index: number, total: number): number {
  const [x] = clampedRowLayout(index, total, BUOYANCY_GROUND_RADIUS, 1.4);
  return x;
}

function BuoyancyObject({
  materialId,
  x,
  fluidDensity,
}: {
  materialId: string;
  x: number;
  fluidDensity: number;
}) {
  const material = BUOYANCY_MATERIALS[materialId];
  const fraction = THREE.MathUtils.clamp(material.density / fluidDensity, 0, 1);
  const sinking = material.density >= fluidDensity;
  const centerY = sinking
    ? BUOYANCY_POOL_BOTTOM + BUOYANCY_SIDE / 2
    : BUOYANCY_WATER_TOP - fraction * BUOYANCY_SIDE + BUOYANCY_SIDE / 2;

  const submergedVolume = sinking ? BUOYANCY_VOLUME : fraction * BUOYANCY_VOLUME;
  const buoyantForce = fluidDensity * submergedVolume * BUOYANCY_G;
  const weight = material.density * BUOYANCY_VOLUME * BUOYANCY_G;

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, centerY, 4, dt);
    }
  });

  return (
    <group ref={groupRef} position={[x, centerY, 0]}>
      <GltfModel url="/models/physics/floating-cube.glb" center targetSize={BUOYANCY_SIDE} />
      <Html position={[0, BUOYANCY_SIDE / 2 + 0.3, 0]} center distanceFactor={9}>
        <div className="glass-panel rounded-md px-2 py-1 text-[10px] text-sky-200 font-mono whitespace-nowrap">
          {sinking ? "cho'kadi" : `${(fraction * 100).toFixed(0)}% botgan`} &middot; Fₕ {buoyantForce.toFixed(1)} N
        </div>
      </Html>
      {/* og'irlik va Arximed kuchi o'qlari */}
      <Line points={[[0, 0, 0], [0, -Math.min(weight / 180, 1.1), 0]]} color="#f87171" lineWidth={2.5} />
      <Line points={[[0.18, 0, 0], [0.18, Math.min(buoyantForce / 180, 1.1), 0]]} color="#38bdf8" lineWidth={2.5} />
    </group>
  );
}

function BuoyancyLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([]);
  const [fluidId, setFluidId] = useState('water');
  const fluid = BUOYANCY_FLUIDS.find((f) => f.id === fluidId) ?? BUOYANCY_FLUIDS[0];

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= BUOYANCY_MAX_OBJECTS) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => ({ ...p, position: [buoyancyLayoutX(i, next.length), 0, 0] as [number, number, number] }));
    });
  };

  const floatingCount = placed.filter((p) => BUOYANCY_MATERIALS[p.toolId].density < fluid.density).length;
  const sinkingCount = placed.length - floatingCount;

  usePublishResult({
    mavzu: simulation.title,
    'suyuqlik': fluid.label,
    'suyuqlik zichligi (kg/m³)': fluid.density,
    "suzayotgan jismlar": floatingCount,
    "cho‘kkan jismlar": sinkingCount,
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.6, 7]} minDistance={3.5} maxDistance={13} target={[0, 1, 0]}>
        <GroundBoundary radius={BUOYANCY_GROUND_RADIUS} accent="#38bdf8" />
        <group position={[0, 0.75, 0]} scale={[3.4, 1.2, 2.2]}>
          <GltfModel url="/models/physics/beaker-water.glb" center targetSize={1} castShadow={false} />
        </group>
        <mesh position={[0, BUOYANCY_WATER_TOP, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[BUOYANCY_GROUND_RADIUS - 0.3, 48]} />
          <meshPhysicalMaterial
            color={fluid.id === 'honey' ? '#f59e0b' : '#38bdf8'}
            transparent
            opacity={0.32}
            roughness={0.05}
            transmission={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        {placed.map((p) => (
          <BuoyancyObject key={p.instanceId} materialId={p.toolId} x={p.position[0]} fluidDensity={fluid.density} />
        ))}
      </SceneCanvas>

      <ToolkitPanel
        title="Jism materiallari"
        tools={BUOYANCY_TOOLS}
        accent="#fbbf24"
        placedCount={placed.length}
        maxItems={BUOYANCY_MAX_OBJECTS}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Suzayotgan</span>
            <span className="text-emerald-300 font-mono">{floatingCount} ta</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Cho&apos;kkan</span>
            <span className="text-rose-300 font-mono">{sinkingCount} ta</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
            Fₕ = ρₒₒₒ·Vₛᵤᵇ·g &mdash; qizil o&apos;q og&apos;irlik, ko&apos;k o&apos;q Arximed kuchi
          </p>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-2 flex-wrap justify-center max-w-2xl">
        <span className="text-[11px] text-slate-400 mr-1">Suyuqlik:</span>
        {BUOYANCY_FLUIDS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFluidId(f.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              f.id === fluidId ? 'bg-sky-500/80 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            {f.label} ({f.density})
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 3) OVOZ TO'LQINLARI — physics-sound-waves                               */
/* ------------------------------------------------------------------------ */

const SOUND_GROUND_RADIUS = 4.6;
const SOUND_SPEED = 343; // m/s (havoda tovush tezligi)

const SOUND_TOOLS: ToolDefinition[] = [
  { id: 'speaker', label: 'Karnay', icon: 'AudioWaveform', description: 'Tovush manbai' },
  { id: 'tuning-fork', label: 'Diapazon', icon: 'Waves', description: 'Rezonans tebranish manbai' },
];

function SoundPhysicsLoop({ onTick }: { onTick: (t: number) => void }) {
  const tRef = useRef(0);
  useFrame((_, dt) => {
    tRef.current += Math.min(dt, 1 / 30);
    onTick(tRef.current);
  });
  return null;
}

function SoundRings({ active, frequency, amplitude, time }: { active: boolean; frequency: number; amplitude: number; time: number }) {
  const ringCount = 4;
  const speedVisual = THREE.MathUtils.clamp(frequency / 260, 0.35, 3.2);
  return (
    <group position={[-2.6, 0.6, 0]}>
      {active &&
        Array.from({ length: ringCount }).map((_, i) => {
          const phase = ((time * speedVisual + i / ringCount) % 1);
          const radius = 0.25 + phase * 2.1;
          const opacity = amplitude * (1 - phase) * 0.8;
          return (
            <mesh key={i} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[radius, radius + 0.035, 40]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={Math.max(opacity, 0)} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
    </group>
  );
}

function TuningForkMesh({ amplitude, frequency, time }: { amplitude: number; frequency: number; time: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(time * frequency * 0.35) * amplitude * 0.12;
    }
  });
  return (
    <group ref={groupRef} position={[2.6, 0.7, 0]}>
      <GltfModel url="/models/physics/tuning-fork.glb" center targetSize={1} />
    </group>
  );
}

function SoundWaveform({ frequency, amplitude, time }: { frequency: number; amplitude: number; time: number }) {
  const points = useMemo(() => {
    const visualFreq = THREE.MathUtils.clamp(frequency / 180, 0.6, 7);
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const x = -2.1 + (i / 64) * 4.2;
      const y = 1.55 + amplitude * 0.55 * Math.sin(visualFreq * x * 2.4 - time * visualFreq * 4.5);
      pts.push([x, y, 0]);
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, amplitude, time]);

  return <Line points={points} color="#fbbf24" lineWidth={2.5} />;
}

function SoundWavesLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([]);
  const [frequency, setFrequency] = useState(440);
  const [amplitude, setAmplitude] = useState(0.6);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const hasSpeaker = placed.some((p) => p.toolId === 'speaker');
  const hasFork = placed.some((p) => p.toolId === 'tuning-fork');

  const addTool = (toolId: string) => {
    setPlaced((prev) => (prev.some((p) => p.toolId === toolId) ? prev : [...prev, { instanceId: toolId, toolId, position: [0, 0, 0] }]));
  };

  useEffect(() => {
    if (playing) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = amplitude * 0.2;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      audioCtxRef.current = ctx;
      oscRef.current = osc;
      gainRef.current = gain;
      return () => {
        osc.stop();
        ctx.close();
        audioCtxRef.current = null;
        oscRef.current = null;
        gainRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    if (oscRef.current) oscRef.current.frequency.value = frequency;
    if (gainRef.current) gainRef.current.gain.value = amplitude * 0.2;
  }, [frequency, amplitude]);

  const wavelength = SOUND_SPEED / frequency;
  const period = 1 / frequency;

  usePublishResult({
    mavzu: simulation.title,
    'chastota f (Hz)': frequency,
    "to'lqin uzunligi λ (m)": Number(wavelength.toFixed(2)),
    'davr T (ms)': Number((period * 1000).toFixed(2)),
    'amplituda': Number(amplitude.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.2, 7]} minDistance={3.5} maxDistance={13} target={[0, 1, 0]}>
        <GroundBoundary radius={SOUND_GROUND_RADIUS} accent="#38bdf8" />
        <SoundPhysicsLoop onTick={setTime} />
        <group position={[-2.6, 0.6, 0]}>
          <GltfModel url="/models/physics/speaker.glb" center targetSize={1.1} />
        </group>
        <SoundRings active={hasSpeaker && playing} frequency={frequency} amplitude={amplitude} time={time} />
        {hasFork && <TuningForkMesh amplitude={amplitude} frequency={frequency} time={time} />}
        <SoundWaveform frequency={frequency} amplitude={amplitude} time={time} />
        <Html position={[0, 2.3, 0]} center distanceFactor={10}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] text-amber-200 whitespace-nowrap">
            λ = v/f = {wavelength.toFixed(2)} m
          </div>
        </Html>
      </SceneCanvas>

      <ToolkitPanel
        title="Ovoz asboblari"
        tools={SOUND_TOOLS}
        accent="#fbbf24"
        placedCount={placed.length}
        maxItems={SOUND_TOOLS.length}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">f</span>
            <span className="text-slate-200 font-mono">{frequency} Hz</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">λ</span>
            <span className="text-slate-200 font-mono">{wavelength.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">T</span>
            <span className="text-slate-200 font-mono">{(period * 1000).toFixed(2)} ms</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-2xl">
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={!hasSpeaker}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/80 text-white hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {playing ? "To'xtatish" : "Ovoz chiqarish"}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-20">Chastota</label>
          <input
            type="range"
            min={50}
            max={2000}
            step={10}
            value={frequency}
            onChange={(e) => setFrequency(parseFloat(e.target.value))}
            className="w-32 accent-amber-400"
          />
          <span className="text-[11px] text-slate-300 font-mono w-14">{frequency} Hz</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-16">Amplituda</label>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={amplitude}
            onChange={(e) => setAmplitude(parseFloat(e.target.value))}
            className="w-28 accent-amber-400"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 4) SKEYT PARKDA ENERGIYA — physics-energy-skate-park                    */
/* ------------------------------------------------------------------------ */

const SKATE_GROUND_RADIUS = 5.4;
const SKATE_BOWL_RADIUS = 3.2; // "idish" egriligi R (parabolik chuqurlik y = x^2 / 2R)
const SKATE_G = 9.81;

function skateHeightAt(x: number) {
  return (x * x) / (2 * SKATE_BOWL_RADIUS);
}

function SkatePhysicsLoop({
  running,
  friction,
  resetSignal,
  initialX,
  onUpdate,
}: {
  running: boolean;
  friction: boolean;
  resetSignal: number;
  initialX: number;
  onUpdate: (x: number, v: number) => void;
}) {
  const xRef = useRef(initialX);
  const vRef = useRef(0);

  useEffect(() => {
    xRef.current = initialX;
    vRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    if (running) {
      const damping = friction ? 0.22 : 0;
      // Parabolik chuqurlikda tangensial tenglama mayatnikka o'xshash:
      // x'' = -(g/R) x - damping * x' (kichik-o'rta tebranishlar uchun yaxshi yaqinlashish)
      const accel = -(SKATE_G / SKATE_BOWL_RADIUS) * xRef.current - damping * vRef.current;
      vRef.current += accel * dt;
      xRef.current += vRef.current * dt;
    }
    onUpdate(xRef.current, vRef.current);
  });

  return null;
}

function SkateScene({ x }: { x: number }) {
  const y = skateHeightAt(x);
  const slope = x / SKATE_BOWL_RADIUS;
  const angle = Math.atan(slope);
  return (
    <group>
      <group position={[0, -0.05, 0]} scale={1.15}>
        <GltfModel url="/models/physics/skate-ramp.glb" center targetSize={6.2} />
      </group>
      <group position={[x, y + 0.42, 0]} rotation={[0, 0, -angle]}>
        <GltfModel url="/models/physics/skateboard.glb" center targetSize={0.75} />
        <group position={[0, 0.55, 0]}>
          <GltfModel url="/models/physics/skater-character.glb" center targetSize={1.1} />
        </group>
      </group>
    </group>
  );
}

function EnergySkateParkLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [heightSlider, setHeightSlider] = useState(1.6);
  const [mass, setMass] = useState(4);
  const [friction, setFriction] = useState(false);
  const [running, setRunning] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [x, setX] = useState(0);
  const [v, setV] = useState(0);

  const maxX = Math.sqrt(2 * SKATE_BOWL_RADIUS * heightSlider) * Math.sign(1);
  const initialX = -maxX;

  const reset = () => setResetSignal((s) => s + 1);

  const y = skateHeightAt(x);
  const slope = x / SKATE_BOWL_RADIUS;
  const speed = Math.abs(v) * Math.sqrt(1 + slope * slope);
  const pe = mass * SKATE_G * y;
  const ke = 0.5 * mass * speed * speed;
  const totalE = pe + ke;
  const initialE = mass * SKATE_G * heightSlider;

  usePublishResult({
    mavzu: simulation.title,
    "potensial energiya PE (J)": Number(pe.toFixed(1)),
    "kinetik energiya KE (J)": Number(ke.toFixed(1)),
    "to'liq energiya E (J)": Number(totalE.toFixed(1)),
    'tezlik v (m/s)': Number(speed.toFixed(2)),
  });

  const peRatio = THREE.MathUtils.clamp(pe / Math.max(initialE, 0.001), 0, 1) * 100;
  const keRatio = THREE.MathUtils.clamp(ke / Math.max(initialE, 0.001), 0, 1) * 100;

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 3, 8]} minDistance={4} maxDistance={15} target={[0, 1, 0]}>
        <GroundBoundary radius={SKATE_GROUND_RADIUS} accent="#fbbf24" y={-1.2} />
        <SkatePhysicsLoop running={running} friction={friction} resetSignal={resetSignal} initialX={initialX} onUpdate={(nx, nv) => { setX(nx); setV(nv); }} />
        <SkateScene x={x} />
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-3">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-emerald-300">
            <span>PE</span>
            <span className="font-mono">{pe.toFixed(1)} J</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${peRatio}%` }} />
          </div>
          <div className="flex justify-between text-sky-300">
            <span>KE</span>
            <span className="font-mono">{ke.toFixed(1)} J</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-sky-400" style={{ width: `${keRatio}%` }} />
          </div>
          <div className="flex justify-between text-slate-300 font-medium pt-1 border-t border-slate-700/50">
            <span>E = PE + KE</span>
            <span className="font-mono">{totalE.toFixed(1)} J</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-3xl">
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/80 text-white hover:bg-amber-500"
        >
          {running ? "To'xtatish" : 'Davom etish'}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-20">Balandlik h</label>
          <input type="range" min={0.3} max={2.8} step={0.1} value={heightSlider} onChange={(e) => { setHeightSlider(parseFloat(e.target.value)); reset(); }} className="w-28 accent-amber-400" />
          <span className="text-[11px] text-slate-300 font-mono w-12">{heightSlider.toFixed(1)} m</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-14">Massa</label>
          <input type="range" min={1} max={10} step={0.5} value={mass} onChange={(e) => setMass(parseFloat(e.target.value))} className="w-24 accent-amber-400" />
          <span className="text-[11px] text-slate-300 font-mono w-10">{mass} kg</span>
        </div>
        <button
          onClick={() => setFriction((f) => !f)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${friction ? 'bg-rose-500/80 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`}
        >
          Ishqalanish: {friction ? 'yoqilgan' : "o'chirilgan"}
        </button>
        <button onClick={reset} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60">
          Qayta
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 5) TO'QNASHUV FIZIKASI LABORATORIYASI — physics-collision-lab           */
/* ------------------------------------------------------------------------ */

const COLLISION_GROUND_RADIUS = 5.2;
const COLLISION_RAIL_HALF = 4.4;
const COLLISION_BALL_GAP = 0.55; // to'qnashuv deb hisoblanadigan masofa

type CollisionMode = 'elastic' | 'inelastic';

function CollisionPhysicsLoop({
  running,
  mode,
  m1,
  m2,
  launchSignal,
  v1Initial,
  v2Initial,
  onUpdate,
}: {
  running: boolean;
  mode: CollisionMode;
  m1: number;
  m2: number;
  launchSignal: number;
  v1Initial: number;
  v2Initial: number;
  onUpdate: (state: { x1: number; x2: number; v1: number; v2: number; collided: boolean }) => void;
}) {
  const x1Ref = useRef(-COLLISION_RAIL_HALF * 0.75);
  const x2Ref = useRef(COLLISION_RAIL_HALF * 0.75);
  const v1Ref = useRef(v1Initial);
  const v2Ref = useRef(v2Initial);
  const collidedRef = useRef(false);

  useEffect(() => {
    x1Ref.current = -COLLISION_RAIL_HALF * 0.75;
    x2Ref.current = COLLISION_RAIL_HALF * 0.75;
    v1Ref.current = v1Initial;
    v2Ref.current = v2Initial;
    collidedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchSignal]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    if (running) {
      x1Ref.current += v1Ref.current * dt;
      x2Ref.current += v2Ref.current * dt;

      if (!collidedRef.current && x2Ref.current - x1Ref.current <= COLLISION_BALL_GAP && v1Ref.current > v2Ref.current) {
        collidedRef.current = true;
        if (mode === 'elastic') {
          const u1 = v1Ref.current;
          const u2 = v2Ref.current;
          v1Ref.current = ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2);
          v2Ref.current = ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2);
        } else {
          const vf = (m1 * v1Ref.current + m2 * v2Ref.current) / (m1 + m2);
          v1Ref.current = vf;
          v2Ref.current = vf;
        }
      }

      x1Ref.current = THREE.MathUtils.clamp(x1Ref.current, -COLLISION_RAIL_HALF, COLLISION_RAIL_HALF);
      x2Ref.current = THREE.MathUtils.clamp(x2Ref.current, -COLLISION_RAIL_HALF, COLLISION_RAIL_HALF);
    }
    onUpdate({ x1: x1Ref.current, x2: x2Ref.current, v1: v1Ref.current, v2: v2Ref.current, collided: collidedRef.current });
  });

  return null;
}

function CollisionLabLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(5);
  const [v1Initial, setV1Initial] = useState(2.4);
  const [v2Initial, setV2Initial] = useState(-1.2);
  const [mode, setMode] = useState<CollisionMode>('elastic');
  const [running, setRunning] = useState(false);
  const [launchSignal, setLaunchSignal] = useState(0);
  const [live, setLive] = useState({ x1: -3.3, x2: 3.3, v1: v1Initial, v2: v2Initial, collided: false });

  const launch = () => {
    setLaunchSignal((s) => s + 1);
    setRunning(true);
  };

  const momentumBefore = m1 * v1Initial + m2 * v2Initial;
  const momentumNow = m1 * live.v1 + m2 * live.v2;
  const keBefore = 0.5 * m1 * v1Initial ** 2 + 0.5 * m2 * v2Initial ** 2;
  const keNow = 0.5 * m1 * live.v1 ** 2 + 0.5 * m2 * live.v2 ** 2;
  const keLossPct = keBefore > 0 ? THREE.MathUtils.clamp((1 - keNow / keBefore) * 100, 0, 100) : 0;

  usePublishResult({
    mavzu: simulation.title,
    'to‘qnashuv turi': mode === 'elastic' ? 'elastik' : 'noelastik',
    "impuls p (kg·m/s)": Number(momentumNow.toFixed(2)),
    'kinetik energiya yo‘qolishi (%)': Number(keLossPct.toFixed(1)),
    'holat': live.collided ? "to'qnashdi" : 'yaqinlashmoqda',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.4, 8]} minDistance={4} maxDistance={16} target={[0, 0.6, 0]}>
        <GroundBoundary radius={COLLISION_GROUND_RADIUS} accent="#fbbf24" />
        <CollisionPhysicsLoop running={running} mode={mode} m1={m1} m2={m2} launchSignal={launchSignal} v1Initial={v1Initial} v2Initial={v2Initial} onUpdate={setLive} />
        <group position={[0, 0.15, 0]} scale={[1.9, 1, 1]}>
          <GltfModel url="/models/physics/track-rail.glb" center targetSize={5.2} />
        </group>
        <group position={[live.x1, 0.45, 0]}>
          <GltfModel url="/models/physics/collision-ball-set.glb" center targetSize={0.35 + m1 * 0.045} />
          <Html position={[0, 0.5, 0]} center distanceFactor={9}>
            <div className="glass-panel rounded-md px-2 py-0.5 text-[10px] text-amber-200 font-mono whitespace-nowrap">
              m₁={m1} v={live.v1.toFixed(1)}
            </div>
          </Html>
        </group>
        <group position={[live.x2, 0.45, 0]}>
          <GltfModel url="/models/physics/collision-ball-set.glb" center targetSize={0.35 + m2 * 0.045} />
          <Html position={[0, 0.5, 0]} center distanceFactor={9}>
            <div className="glass-panel rounded-md px-2 py-0.5 text-[10px] text-sky-200 font-mono whitespace-nowrap">
              m₂={m2} v={live.v2.toFixed(1)}
            </div>
          </Html>
        </group>
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">p (boshlang&apos;ich)</span>
            <span className="text-slate-200 font-mono">{momentumBefore.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">p (hozir)</span>
            <span className="text-emerald-300 font-mono">{momentumNow.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">KE yo&apos;qolishi</span>
            <span className="text-rose-300 font-mono">{keLossPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-4 flex-wrap justify-center max-w-4xl">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-400">m₁</label>
          <input type="range" min={1} max={10} step={0.5} value={m1} onChange={(e) => setM1(parseFloat(e.target.value))} className="w-16 accent-amber-400" />
          <label className="text-[11px] text-slate-400">v₁</label>
          <input type="range" min={-6} max={6} step={0.2} value={v1Initial} onChange={(e) => setV1Initial(parseFloat(e.target.value))} className="w-16 accent-amber-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-400">m₂</label>
          <input type="range" min={1} max={10} step={0.5} value={m2} onChange={(e) => setM2(parseFloat(e.target.value))} className="w-16 accent-amber-400" />
          <label className="text-[11px] text-slate-400">v₂</label>
          <input type="range" min={-6} max={6} step={0.2} value={v2Initial} onChange={(e) => setV2Initial(parseFloat(e.target.value))} className="w-16 accent-amber-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMode('elastic')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${mode === 'elastic' ? 'bg-emerald-500/80 text-white' : 'bg-slate-800/60 text-slate-300'}`}>Elastik</button>
          <button onClick={() => setMode('inelastic')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${mode === 'inelastic' ? 'bg-emerald-500/80 text-white' : 'bg-slate-800/60 text-slate-300'}`}>Noelastik</button>
        </div>
        <button onClick={launch} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/80 text-white hover:bg-amber-500">
          Ishga tushirish
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 6) ZARYADLAR VA MAYDONLAR — physics-charges-and-fields (Kulon qonuni)   */
/* ------------------------------------------------------------------------ */

const CHARGE_GROUND_RADIUS = 4.6;
const CHARGE_MAX = 6;
const COULOMB_K = 4.2; // vizualizatsiya uchun shartli konstanta

const CHARGE_TOOLS: ToolDefinition[] = [
  { id: 'positive', label: 'Musbat zaryad (+)', icon: 'CircleDot', description: 'q = +1 birlik zaryad' },
  { id: 'negative', label: 'Manfiy zaryad (−)', icon: 'CircleDotDashed', description: 'q = −1 birlik zaryad' },
];

function coulombFieldAt(point: THREE.Vector2, charges: Array<{ pos: THREE.Vector2; sign: number }>): THREE.Vector2 {
  const field = new THREE.Vector2(0, 0);
  for (const c of charges) {
    const diff = point.clone().sub(c.pos);
    const r = Math.max(diff.length(), 0.35);
    const magnitude = (COULOMB_K * c.sign) / (r * r);
    field.add(diff.normalize().multiplyScalar(magnitude));
  }
  return field;
}

function FieldArrow({ x, z, vec }: { x: number; z: number; vec: THREE.Vector2 }) {
  const mag = vec.length();
  if (mag < 0.03) return null;
  const angle = Math.atan2(vec.y, vec.x);
  const scale = THREE.MathUtils.clamp(0.4 + mag * 0.35, 0.4, 1.3);
  return (
    <group position={[x, 0.08, z]} rotation={[0, -angle, 0]}>
      <GltfModel url="/models/physics/field-arrow.glb" center targetSize={scale} castShadow={false} />
    </group>
  );
}

function ChargesFieldsLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([]);

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= CHARGE_MAX) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => {
        const [x, , z] = clampedCircleLayout(i, next.length, CHARGE_GROUND_RADIUS);
        return { ...p, position: [x, 0, z] as [number, number, number] };
      });
    });
  };

  const charges = useMemo(
    () =>
      placed.map((p) => ({
        pos: new THREE.Vector2(p.position[0], p.position[2]),
        sign: p.toolId === 'positive' ? 1 : -1,
      })),
    [placed],
  );

  const gridPoints = useMemo(() => {
    const pts: Array<[number, number]> = [];
    const n = 5;
    const extent = CHARGE_GROUND_RADIUS - 0.6;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = -extent + (i / (n - 1)) * extent * 2;
        const z = -extent + (j / (n - 1)) * extent * 2;
        pts.push([x, z]);
      }
    }
    return pts;
  }, []);

  const netCharge = charges.reduce((sum, c) => sum + c.sign, 0);
  const fieldAtCenter = coulombFieldAt(new THREE.Vector2(0, 0), charges);

  usePublishResult({
    mavzu: simulation.title,
    'musbat zaryadlar': charges.filter((c) => c.sign > 0).length,
    'manfiy zaryadlar': charges.filter((c) => c.sign < 0).length,
    'natijaviy zaryad (q)': netCharge,
    "markazdagi maydon |E|": Number(fieldAtCenter.length().toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 4.2, 6.2]} minDistance={3.5} maxDistance={14}>
        <GroundBoundary radius={CHARGE_GROUND_RADIUS} accent="#fbbf24" />
        {gridPoints.map(([x, z], i) => {
          const vec = coulombFieldAt(new THREE.Vector2(x, z), charges);
          const nearCharge = charges.some((c) => c.pos.distanceTo(new THREE.Vector2(x, z)) < 0.55);
          if (nearCharge) return null;
          return <FieldArrow key={i} x={x} z={z} vec={vec} />;
        })}
        {placed.map((p) => (
          <group key={p.instanceId} position={p.position}>
            <GltfModel
              url={p.toolId === 'positive' ? '/models/physics/charge-sphere-positive.glb' : '/models/physics/charge-sphere-negative.glb'}
              center
              targetSize={0.55}
            />
          </group>
        ))}
      </SceneCanvas>

      <ToolkitPanel
        title="Zaryadlar"
        tools={CHARGE_TOOLS}
        accent="#fbbf24"
        placedCount={placed.length}
        maxItems={CHARGE_MAX}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Natijaviy zaryad</span>
            <span className="text-slate-200 font-mono">{netCharge > 0 ? `+${netCharge}` : netCharge}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Markazda |E|</span>
            <span className="text-slate-200 font-mono">{fieldAtCenter.length().toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
            E = k·q/r² &mdash; har bir zaryaddan kelgan maydonlar vektor yig&apos;indisi
          </p>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300">
        Zaryadlarni qo&apos;yib, atrofdagi elektr maydon chiziqlarining yo&apos;nalishi va kuchini kuzating.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 7) YORUG'LIKNING SINISHI — physics-refraction (Snell qonuni)            */
/* ------------------------------------------------------------------------ */

const REFRACTION_MEDIA: Array<{ id: string; label: string; n: number }> = [
  { id: 'water', label: 'Suv (n=1.33)', n: 1.33 },
  { id: 'glass', label: 'Shisha (n=1.5)', n: 1.5 },
  { id: 'diamond', label: 'Olmos (n=2.42)', n: 2.42 },
];

const REFRACTION_TOOLS: ToolDefinition[] = [
  { id: 'prism', label: 'Prizma', icon: 'Gem', description: "Uchburchak shishadan nur o'tishi" },
  { id: 'lens', label: 'Linza', icon: 'Eye', description: "Qavariq linza" },
];

function RefractionLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [incidenceDeg, setIncidenceDeg] = useState(40);
  const [mediumId, setMediumId] = useState('water');
  const [placed, setPlaced] = useState<PlacedTool[]>([]);
  const medium = REFRACTION_MEDIA.find((m) => m.id === mediumId) ?? REFRACTION_MEDIA[0];

  const addTool = (toolId: string) => {
    setPlaced((prev) => (prev.some((p) => p.toolId === toolId) ? prev.filter((p) => p.toolId !== toolId) : [...prev, { instanceId: toolId, toolId, position: [0, 0, 0] }]));
  };

  const n1 = 1.0;
  const n2 = medium.n;
  const theta1 = (incidenceDeg * Math.PI) / 180;
  const sinTheta2 = THREE.MathUtils.clamp((n1 / n2) * Math.sin(theta1), -1, 1);
  const theta2 = Math.asin(sinTheta2);
  const theta2Deg = (theta2 * 180) / Math.PI;

  const rayLength = 2.6;
  const sourcePos: [number, number, number] = [-Math.sin(theta1) * rayLength, Math.cos(theta1) * rayLength, 0];
  const refractedEnd: [number, number, number] = [Math.sin(theta2) * rayLength, -Math.cos(theta2) * rayLength, 0];
  const reflectedEnd: [number, number, number] = [Math.sin(theta1) * rayLength * 0.55, Math.cos(theta1) * rayLength * 0.55, 0];

  usePublishResult({
    mavzu: simulation.title,
    'muhit': medium.label,
    'tushish burchagi θ₁ (°)': incidenceDeg,
    'sinish burchagi θ₂ (°)': Number(theta2Deg.toFixed(1)),
    'sindirish ko‘rsatkichi n₂': n2,
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.4, 7.5]} minDistance={3.5} maxDistance={13} target={[0, 0, 0]}>
        <GroundBoundary radius={4.6} accent="#fbbf24" y={-2.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.6, 48]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.28} roughness={0.05} transmission={0.5} side={THREE.DoubleSide} />
        </mesh>
        <group position={sourcePos}>
          <GltfModel url="/models/physics/light-bulb.glb" center targetSize={0.45} />
        </group>
        <Line points={[sourcePos, [0, 0, 0]]} color="#fde047" lineWidth={2.5} />
        <Line points={[[0, 0, 0], reflectedEnd]} color="#fde047" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} />
        <Line points={[[0, 0, 0], refractedEnd]} color="#38bdf8" lineWidth={2.5} />
        <Html position={[0, 0.25, 0]} center distanceFactor={10}>
          <div className="glass-panel rounded-md px-2 py-0.5 text-[10px] text-amber-200 whitespace-nowrap">
            θ₁={incidenceDeg}°
          </div>
        </Html>
        <Html position={refractedEnd} center distanceFactor={10}>
          <div className="glass-panel rounded-md px-2 py-0.5 text-[10px] text-sky-200 whitespace-nowrap">
            θ₂={theta2Deg.toFixed(1)}°
          </div>
        </Html>
        {placed.some((p) => p.toolId === 'prism') && (
          <group position={[2, -0.6, 0]}>
            <GltfModel url="/models/physics/glass-prism.glb" center targetSize={1.1} />
          </group>
        )}
        {placed.some((p) => p.toolId === 'lens') && (
          <group position={[-2, -0.6, 0]}>
            <GltfModel url="/models/physics/lens-convex.glb" center targetSize={1} />
          </group>
        )}
      </SceneCanvas>

      <ToolkitPanel
        title="Optik elementlar"
        tools={REFRACTION_TOOLS}
        accent="#fbbf24"
        placedCount={placed.length}
        maxItems={REFRACTION_TOOLS.length}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">n₁ (havo)</span>
            <span className="text-slate-200 font-mono">1.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">n₂ ({medium.label.split(' ')[0]})</span>
            <span className="text-slate-200 font-mono">{n2.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
            n₁sinθ₁ = n₂sinθ₂ (Snell qonuni)
          </p>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-2xl">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-24">Tushish burchagi</label>
          <input type="range" min={1} max={85} step={1} value={incidenceDeg} onChange={(e) => setIncidenceDeg(parseFloat(e.target.value))} className="w-32 accent-amber-400" />
          <span className="text-[11px] text-slate-300 font-mono w-10">{incidenceDeg}°</span>
        </div>
        <div className="flex items-center gap-1.5">
          {REFRACTION_MEDIA.map((m) => (
            <button
              key={m.id}
              onClick={() => setMediumId(m.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                mediumId === m.id ? 'bg-sky-500/80 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 8) FARADEY QONUNI — physics-faradays-law (induksiya EYUK)               */
/* ------------------------------------------------------------------------ */

const FARADAY_AMPLITUDE = 3.2;
const FARADAY_COIL_SCALE = 0.65; // dipol maydon "radiusi" a

function FaradayPhysicsLoop({
  running,
  speed,
  turns,
  resistance,
  onUpdate,
}: {
  running: boolean;
  speed: number;
  turns: number;
  resistance: number;
  onUpdate: (state: { x: number; emf: number; current: number }) => void;
}) {
  const tRef = useRef(0);
  const prevFluxRef = useRef(0);

  const fluxAt = (x: number) => {
    const b = 1 / Math.pow(1 + (x / FARADAY_COIL_SCALE) ** 2, 1.5);
    return b; // per-loop fluks (shartli birliklarda, A=1)
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    if (running) tRef.current += dt;
    const x = FARADAY_AMPLITUDE * Math.sin(tRef.current * speed);
    const flux = fluxAt(x);
    const dPhiDt = running && dt > 0 ? (flux - prevFluxRef.current) / dt : 0;
    prevFluxRef.current = flux;
    const emf = -turns * dPhiDt;
    const current = emf / resistance;
    onUpdate({ x, emf, current });
  });

  return null;
}

function GalvanometerNeedle({ current }: { current: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      const target = THREE.MathUtils.clamp(current * 0.6, -1, 1) * (Math.PI / 3);
      ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, target, 6, dt);
    }
  });
  return (
    <group ref={ref} position={[0, 0.22, 0]}>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.025, 0.36, 0.025]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function FaradaysLawLab({ simulation }: { simulation: Simulation; hand: UseHandTrackingApi }) {
  const [turns, setTurns] = useState(120);
  const [speed, setSpeed] = useState(1.1);
  const [resistance, setResistance] = useState(6);
  const [running, setRunning] = useState(true);
  const [live, setLive] = useState({ x: 0, emf: 0, current: 0 });

  usePublishResult({
    mavzu: simulation.title,
    "o'ramlar soni N": turns,
    'induksiya EYUK (V)': Number(live.emf.toFixed(2)),
    'tok kuchi I (A)': Number(live.current.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2, 7.5]} minDistance={3.5} maxDistance={14} target={[0, 0.8, 0]}>
        <GroundBoundary radius={5} accent="#fbbf24" />
        <FaradayPhysicsLoop running={running} speed={speed} turns={turns} resistance={resistance} onUpdate={setLive} />

        <group position={[0, 0.8, 0]}>
          <GltfModel url="/models/physics/coil-wire.glb" center targetSize={1.5} />
        </group>
        <group position={[live.x, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <GltfModel url="/models/physics/magnet-bar.glb" center targetSize={1} />
        </group>
        <Html position={[0, 1.9, 0]} center distanceFactor={10}>
          <div className={`glass-panel rounded-lg px-2.5 py-1 text-[10.5px] whitespace-nowrap ${live.current >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            EYUK = {live.emf.toFixed(2)} V &middot; I = {live.current.toFixed(2)} A
          </div>
        </Html>

        <group position={[-3.4, 0.5, 0]}>
          <GltfModel url="/models/physics/galvanometer.glb" center targetSize={1.1} />
          <GalvanometerNeedle current={live.current} />
        </group>
        <Line points={[[-2.9, 0.5, 0], [-1.1, 0.8, 0]]} color="#94a3b8" lineWidth={1.5} />
        <Line points={[[-2.9, 0.4, 0], [-1.1, 0.75, 0.15]]} color="#94a3b8" lineWidth={1.5} />
      </SceneCanvas>

      <div className="absolute top-4 left-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-3">
        <h3 className="text-sm font-semibold text-amber-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Magnit holati x</span>
            <span className="text-slate-200 font-mono">{live.x.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between text-emerald-300 font-medium">
            <span>EYUK (ε)</span>
            <span className="font-mono">{live.emf.toFixed(2)} V</span>
          </div>
          <div className="flex justify-between text-amber-300 font-medium">
            <span>Tok (I)</span>
            <span className="font-mono">{live.current.toFixed(2)} A</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
          ε = −N·dΦ/dt &mdash; magnit tezroq harakatlansa EYUK ortadi (Faradey-Lens qonuni)
        </p>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-3xl">
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/80 text-white hover:bg-amber-500"
        >
          {running ? "To'xtatish" : 'Davom etish'}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-20">O&apos;ramlar N</label>
          <input type="range" min={10} max={300} step={5} value={turns} onChange={(e) => setTurns(parseFloat(e.target.value))} className="w-28 accent-amber-400" />
          <span className="text-[11px] text-slate-300 font-mono w-10">{turns}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-20">Tezlik</label>
          <input type="range" min={0.2} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-24 accent-amber-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 w-24">Qarshilik R</label>
          <input type="range" min={1} max={20} step={0.5} value={resistance} onChange={(e) => setResistance(parseFloat(e.target.value))} className="w-24 accent-amber-400" />
          <span className="text-[11px] text-slate-300 font-mono w-12">{resistance} Ω</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Dispatcher                                                               */
/* ------------------------------------------------------------------------ */

export default function PhysicsSandboxLab({ hand, simulation }: PhysicsSandboxLabProps) {
  switch (simulation.id) {
    case 'physics-buoyancy':
      return <BuoyancyLab hand={hand} simulation={simulation} />;
    case 'physics-sound-waves':
      return <SoundWavesLab hand={hand} simulation={simulation} />;
    case 'physics-energy-skate-park':
      return <EnergySkateParkLab hand={hand} simulation={simulation} />;
    case 'physics-collision-lab':
      return <CollisionLabLab hand={hand} simulation={simulation} />;
    case 'physics-charges-and-fields':
      return <ChargesFieldsLab hand={hand} simulation={simulation} />;
    case 'physics-refraction':
      return <RefractionLab hand={hand} simulation={simulation} />;
    case 'physics-faradays-law':
      return <FaradaysLawLab hand={hand} simulation={simulation} />;
    case 'physics-circuit-construction-dc':
    case 'physics-ohms-law':
    default:
      return <CircuitBuilderLab hand={hand} simulation={simulation} />;
  }
}

