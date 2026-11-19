// src/simulations/sandbox/BiologySandboxLab.tsx
// BIOLOGIYA — 9 "sandbox" mavzusi uchun mavzuga moslashtirilgan kichik
// simulyatsiyalar to'plami. Har bir mavzu (`simulation.id`) o'zining asbob
// to'plami, 3D sahnasi va jonli hisob-kitob qoidasiga ega — generik hujayra
// qismlari o'rniga. "Neyron" mavzusi mavjud neuron-cell.glb asosidagi
// kontentni qayta ishlatadi, qolgan 8 tasi mavzuga xos yangi vizuallar va
// qoidalar bilan ishlaydi (public/models/biology/ ostidagi haqiqiy .glb
// assetlar asosida).

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Pause, Play, RotateCcw, Zap } from 'lucide-react';
import SceneCanvas from '../../components/SceneCanvas';
import HandControlledGroup from '../../components/HandControlledGroup';
import ToolkitPanel from '../../components/ToolkitPanel';
import GroundBoundary, { clampedRowLayout } from '../../components/GroundBoundary';
import GltfModel from '../../components/GltfModel';
import type { UseHandTrackingApi } from '../../hooks/useHandTracking';
import { usePublishResult } from '../../hooks/usePublishResult';
import type { PlacedTool, Simulation, ToolDefinition } from '../../types';

interface BiologySandboxLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

const ACCENT = '#a78bfa';

// ---------------------------------------------------------------------------
// Umumiy UI yordamchilari (barcha mavzular shu patternlarni qayta ishlatadi)
// ---------------------------------------------------------------------------

function InfoCard({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
      <h3 className="text-sm font-semibold text-violet-300">{title}</h3>
      <p className="text-[11px] text-slate-400 leading-snug">{description}</p>
      {children}
    </div>
  );
}

function HintBar({ text }: { text: string }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300 whitespace-nowrap max-w-[90vw] overflow-x-auto">
      {text}
    </div>
  );
}

function ControlBar({ children }: { children: ReactNode }) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-3xl">
      {children}
    </div>
  );
}

function ToggleButton({ active, onClick, activeLabel, idleLabel }: { active: boolean; onClick: () => void; activeLabel: string; idleLabel: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/80 text-white hover:bg-violet-500"
    >
      {active ? <Pause size={14} /> : <Play size={14} />}
      {active ? activeLabel : idleLabel}
    </button>
  );
}

function ResetButton({ onClick, label = 'Qayta' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60"
    >
      <RotateCcw size={13} /> {label}
    </button>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  width = 'w-32',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  width?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-slate-400 whitespace-nowrap">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`${width} accent-violet-400`}
      />
      <span className="text-[11px] text-slate-300 font-mono w-16 text-right">{display}</span>
    </div>
  );
}

function ReadoutTag({ position, color = '#ddd6fe', children }: { position: [number, number, number]; color?: string; children: ReactNode }) {
  return (
    <Html position={position} center distanceFactor={9}>
      <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] font-mono whitespace-nowrap" style={{ color }}>
        {children}
      </div>
    </Html>
  );
}

function useToolCounts(placed: PlacedTool[]) {
  return useMemo(() => {
    const c: Record<string, number> = {};
    placed.forEach((p) => {
      c[p.toolId] = (c[p.toolId] ?? 0) + 1;
    });
    return c;
  }, [placed]);
}

function fibonacciScatter(index: number, total: number, radius: number): [number, number, number] {
  const i = index + 1;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const r = radius * Math.sqrt(i / Math.max(total, 1)) * 0.88;
  const theta = i * golden;
  return [Math.cos(theta) * r, 0, Math.sin(theta) * r];
}

// ---------------------------------------------------------------------------
// Rang/fizika yordamchi formulalari
// ---------------------------------------------------------------------------

/** Ko'rinadigan spektr to'lqin uzunligini (nm) taxminiy RGB rangga aylantiradi. */
function wavelengthToColor(nmRaw: number): string {
  const nm = THREE.MathUtils.clamp(nmRaw, 380, 700);
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = -(nm - 440) / (440 - 380);
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
  } else {
    r = 1;
  }
  let factor = 1;
  if (nm < 420) factor = 0.3 + (0.7 * (nm - 380)) / (420 - 380);
  else if (nm > 700) factor = 0.3 + (0.7 * (780 - nm)) / (780 - 700);
  const toHex = (c: number) => {
    const v = c <= 0 ? 0 : Math.round(255 * Math.pow(c * factor, 0.8));
    return v.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function gaussianResponse(x: number, mean: number, sigma: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma));
}

const PH_STOPS: Array<[number, THREE.Color]> = [
  [0, new THREE.Color('#ef4444')],
  [2, new THREE.Color('#f97316')],
  [4, new THREE.Color('#facc15')],
  [6, new THREE.Color('#a3e635')],
  [7, new THREE.Color('#4ade80')],
  [8, new THREE.Color('#22d3ee')],
  [10, new THREE.Color('#3b82f6')],
  [12, new THREE.Color('#8b5cf6')],
  [14, new THREE.Color('#a21caf')],
];

function phToColor(ph: number): string {
  const clamped = THREE.MathUtils.clamp(ph, 0, 14);
  for (let i = 0; i < PH_STOPS.length - 1; i++) {
    const [p0, c0] = PH_STOPS[i];
    const [p1, c1] = PH_STOPS[i + 1];
    if (clamped >= p0 && clamped <= p1) {
      const t = (clamped - p0) / (p1 - p0 || 1);
      return `#${c0.clone().lerp(c1, t).getHexString()}`;
    }
  }
  return `#${PH_STOPS[PH_STOPS.length - 1][1].getHexString()}`;
}

const PH_EXAMPLES: Array<{ label: string; ph: number }> = [
  { label: 'oshqozon kislotasi', ph: 1.8 },
  { label: 'siydik', ph: 6 },
  { label: 'so‘lak', ph: 6.8 },
  { label: 'qon plazmasi', ph: 7.4 },
  { label: 'oshqozonosti bezi suyuqligi', ph: 8.1 },
  { label: 'o‘t suyuqligi', ph: 8.8 },
];

function nearestPhExample(ph: number) {
  return PH_EXAMPLES.reduce((best, cur) => (Math.abs(cur.ph - ph) < Math.abs(best.ph - ph) ? cur : best), PH_EXAMPLES[0]);
}

// ===========================================================================
// 1) TABIIY TANLANISH — populyatsiya genetikasi (diskret avlodlar)
// ===========================================================================

const RABBIT_CAPACITY = 30;
const RABBIT_TOOLS: ToolDefinition[] = [
  { id: 'rabbit-brown', label: 'Jigarrang quyon', icon: 'Rabbit', description: 'Quruq/tuproqli muhitda yashirinadi' },
  { id: 'rabbit-white', label: 'Oq quyon', icon: 'Rabbit', description: 'Qorli muhitda yashirinadi' },
  { id: 'habitat', label: 'Yashash muhiti', icon: 'TreePine', description: 'Populyatsiya uchun relyef sahnani qo‘shadi' },
];

function RabbitInstance({ color, position }: { color: 'brown' | 'white'; position: [number, number, number] }) {
  return (
    <group position={position} scale={0.75}>
      <GltfModel url={`/models/biology/rabbit-${color}.glb`} center targetSize={0.9} />
    </group>
  );
}

function simulateGeneration(brown: number, white: number, advantage: number) {
  const base = 0.5;
  const survivalBrown = THREE.MathUtils.clamp(base + advantage * 0.4, 0.05, 0.95);
  const survivalWhite = THREE.MathUtils.clamp(base - advantage * 0.4, 0.05, 0.95);
  let nextBrown = Math.round(brown * survivalBrown * 1.8);
  let nextWhite = Math.round(white * survivalWhite * 1.8);
  const total = nextBrown + nextWhite;
  if (total > RABBIT_CAPACITY && total > 0) {
    const scale = RABBIT_CAPACITY / total;
    nextBrown = Math.round(nextBrown * scale);
    nextWhite = Math.round(nextWhite * scale);
  }
  if (nextBrown + nextWhite === 0) {
    nextBrown = 1;
    nextWhite = 1;
  }
  return { brown: nextBrown, white: nextWhite };
}

function NaturalSelectionLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([
    { instanceId: 'brown-0', toolId: 'rabbit-brown', position: [0, 0, 0] },
    { instanceId: 'white-0', toolId: 'rabbit-white', position: [0, 0, 0] },
  ]);
  const [hasHabitat, setHasHabitat] = useState(true);
  const [advantage, setAdvantage] = useState(0);
  const [generation, setGeneration] = useState(0);

  const counts = useToolCounts(placed);
  const brownCount = counts['rabbit-brown'] ?? 0;
  const whiteCount = counts['rabbit-white'] ?? 0;
  const totalCount = brownCount + whiteCount;

  const addTool = (toolId: string) => {
    if (toolId === 'habitat') {
      setHasHabitat(true);
      return;
    }
    setPlaced((prev) => {
      if (prev.length >= RABBIT_CAPACITY) return prev;
      return [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] }];
    });
  };

  const nextGeneration = () => {
    const { brown, white } = simulateGeneration(brownCount, whiteCount, advantage);
    const nextPlaced: PlacedTool[] = [];
    for (let i = 0; i < brown; i++) nextPlaced.push({ instanceId: `brown-g${generation + 1}-${i}`, toolId: 'rabbit-brown', position: [0, 0, 0] });
    for (let i = 0; i < white; i++) nextPlaced.push({ instanceId: `white-g${generation + 1}-${i}`, toolId: 'rabbit-white', position: [0, 0, 0] });
    setPlaced(nextPlaced);
    setGeneration((g) => g + 1);
  };

  const reset = () => {
    setPlaced([
      { instanceId: 'brown-0', toolId: 'rabbit-brown', position: [0, 0, 0] },
      { instanceId: 'white-0', toolId: 'rabbit-white', position: [0, 0, 0] },
    ]);
    setGeneration(0);
    setAdvantage(0);
  };

  const brownPct = totalCount > 0 ? Math.round((brownCount / totalCount) * 100) : 0;

  usePublishResult({
    mavzu: simulation.title,
    avlod: generation,
    'jigarrang quyonlar': brownCount,
    'oq quyonlar': whiteCount,
    'jigarrang ulushi (%)': brownPct,
    'muhit afzalligi': Number(advantage.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 3.6, 8]} minDistance={3.5} maxDistance={16} showStars={false} target={[0, 0, 0]}>
        <GroundBoundary radius={5.5} accent={ACCENT} y={-1.1} />
        {hasHabitat && (
          <group position={[0, -1.08, 0]}>
            <GltfModel url="/models/biology/habitat-terrain.glb" center targetSize={9} />
          </group>
        )}
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.05}>
          {placed.map((p, i) => {
            const [x, , z] = fibonacciScatter(i, placed.length, 3.6);
            return <RabbitInstance key={p.instanceId} color={p.toolId === 'rabbit-brown' ? 'brown' : 'white'} position={[x, -0.55, z]} />;
          })}
        </HandControlledGroup>
        <ReadoutTag position={[0, 2.4, 0]}>
          {generation}-avlod &middot; {brownCount} jigarrang / {whiteCount} oq
        </ReadoutTag>
      </SceneCanvas>

      <ToolkitPanel
        title="Tabiiy tanlanish asboblari"
        tools={RABBIT_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={RABBIT_CAPACITY}
        onAddTool={addTool}
        onClearAll={reset}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Avlod</span>
            <span className="text-slate-200 font-mono">{generation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-300">Jigarrang</span>
            <span className="text-slate-200 font-mono">{brownCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Oq</span>
            <span className="text-slate-200 font-mono">{whiteCount}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900/70 overflow-hidden mt-1">
            <div className="h-full bg-amber-400" style={{ width: `${brownPct}%` }} />
          </div>
        </div>
      </InfoCard>

      <ControlBar>
        <SliderControl
          label="Muhit afzalligi"
          value={advantage}
          min={-1}
          max={1}
          step={0.05}
          onChange={setAdvantage}
          display={advantage > 0 ? 'jigarrang' : advantage < 0 ? "oq" : 'teng'}
          width="w-28"
        />
        <button
          onClick={nextGeneration}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/80 text-white hover:bg-violet-500"
        >
          Keyingi avlod
        </button>
        <ResetButton onClick={reset} />
        <span className="text-[11px] text-slate-500 border-l border-slate-700/60 pl-4">
          Musbat qiymat jigarrangga, manfiy qiymat oqqa moslashuv ustunligi beradi
        </span>
      </ControlBar>

      <HintBar text="Quyonlarni qo'shing, muhit afzalligini sozlang va avlodlarni simulyatsiya qiling." />
    </div>
  );
}

// ===========================================================================
// 2) MOLEKULANING QUTBLILIGI — elektrmanfiylik farqi va dipol moment
// ===========================================================================

const POLARITY_TOOLS: ToolDefinition[] = [
  { id: 'molecule', label: 'Molekula', icon: 'Hexagon', description: 'Sozlanadigan elektrmanfiylik farqiga ega modelni qo‘shadi' },
  { id: 'water-ref', label: 'Suv (H₂O) namunasi', icon: 'Droplet', description: 'Haqiqiy qutbli molekula bilan taqqoslash uchun' },
];

const POLARITY_CAP = 5;

function classifyBond(diff: number) {
  if (diff < 0.4) return { label: 'Qutbsiz (nopolyar) bog‘', color: '#94a3b8' };
  if (diff < 1.7) return { label: 'Qutbli kovalent bog‘', color: '#34d399' };
  return { label: 'Ionli bog‘', color: '#f87171' };
}

function DipoleArrow({ magnitude }: { magnitude: number }) {
  const scale = 0.35 + magnitude * 0.45;
  return (
    <group position={[0.9, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[scale, scale, scale]}>
      <GltfModel url="/models/biology/dipole-arrow.glb" center targetSize={1.2} />
    </group>
  );
}

function MoleculePolarityLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([{ instanceId: 'mol-0', toolId: 'molecule', position: [0, 0, 0] }]);
  const [diff, setDiff] = useState(1.4);

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= POLARITY_CAP) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => ({ ...p, position: clampedRowLayout(i, next.length, 5.5, 2.1) }));
    });
  };

  const { label: bondLabel, color: bondColor } = classifyBond(diff);
  const magnitude = THREE.MathUtils.clamp(diff / 3.3, 0, 1);

  usePublishResult({
    mavzu: simulation.title,
    'elektrmanfiylik farqi (Δχ)': Number(diff.toFixed(2)),
    'bog‘ turi': bondLabel,
    'dipol kuchi (nisbiy)': Number(magnitude.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.2, 7.5]} minDistance={3} maxDistance={14} showStars={false}>
        <GroundBoundary radius={5.5} accent={ACCENT} />
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.08}>
          {placed.map((p) => (
            <group key={p.instanceId} position={p.position}>
              {p.toolId === 'water-ref' ? (
                <>
                  <GltfModel url="/models/biology/water-molecule.glb" center targetSize={0.9} />
                  <DipoleArrow magnitude={THREE.MathUtils.clamp(1.4 / 3.3, 0, 1)} />
                </>
              ) : (
                <>
                  <GltfModel url="/models/biology/molecule-generic.glb" center targetSize={1} />
                  <DipoleArrow magnitude={magnitude} />
                </>
              )}
              <ReadoutTag position={[0, 1.15, 0]} color={p.toolId === 'water-ref' ? '#7dd3fc' : bondColor}>
                {p.toolId === 'water-ref' ? 'Δχ ≈ 1.40 · doimiy qutbli' : `Δχ = ${diff.toFixed(2)}`}
              </ReadoutTag>
            </group>
          ))}
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title="Qutblilik asboblari"
        tools={POLARITY_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={POLARITY_CAP}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Δχ</span>
            <span className="text-slate-200 font-mono">{diff.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Bog‘ turi</span>
            <span className="font-medium" style={{ color: bondColor }}>
              {bondLabel}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50 mt-1">
          Δχ &lt; 0.4 nopolyar &middot; 0.4&ndash;1.7 qutbli kovalent &middot; &gt; 1.7 ionli
        </p>
      </InfoCard>

      <ControlBar>
        <SliderControl
          label="Elektrmanfiylik farqi (Δχ)"
          value={diff}
          min={0}
          max={3.3}
          step={0.05}
          onChange={setDiff}
          display={diff.toFixed(2)}
          width="w-40"
        />
        <span className="text-[11px] text-slate-500 border-l border-slate-700/60 pl-4">
          Molekula qo&apos;shib, farqni sozlang &mdash; o&apos;q uzunligi dipol momentini bildiradi
        </span>
      </ControlBar>

      <HintBar text="Elektrmanfiylik farqini o'zgartiring va dipol o'qining o'sishini kuzating." />
    </div>
  );
}

// ===========================================================================
// 3) NEYRON — aksonal signal va sinaptik uzatilish (mavjud modeldan foydalanadi)
// ===========================================================================

const NEURON_TOOLS: ToolDefinition[] = [
  { id: 'neuron', label: 'Neyron', icon: 'BrainCircuit', description: 'Signal uzatuvchi asab hujayrasi' },
  { id: 'synapse', label: 'Sinaps pufakchasi', icon: 'Zap', description: 'Oxirgi neyronga sinaps terminalini qo‘shadi' },
];

const NEURON_CAP = 4;

function NeuronPulse({ frequency, seed }: { frequency: number; seed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = ((clock.elapsedTime * frequency + seed) % 1 + 1) % 1;
    ref.current.position.set(-1.1 + phase * 2.2, 0, 0);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.4 + 0.6 * Math.sin(phase * Math.PI);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={0.6} toneMapped={false} />
    </mesh>
  );
}

function SynapseVesicle({ frequency, seed }: { frequency: number; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = ((clock.elapsedTime * frequency + seed) % 1 + 1) % 1;
    const pulse = phase > 0.85 ? 1.3 : 1;
    ref.current.scale.setScalar(pulse * 0.6);
  });
  return (
    <group ref={ref} position={[1.4, -0.1, 0]}>
      <GltfModel url="/models/biology/synapse-vesicle.glb" center targetSize={0.7} />
    </group>
  );
}

function NeuronLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([{ instanceId: 'neuron-0', toolId: 'neuron', position: [0, 0, 0] }]);
  const [frequency, setFrequency] = useState(1.2);
  const [running, setRunning] = useState(true);

  const counts = useToolCounts(placed);
  const neuronCount = counts.neuron ?? 0;
  const synapseCount = counts.synapse ?? 0;

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= NEURON_CAP) return prev;
      if (toolId === 'synapse' && (prev.filter((p) => p.toolId === 'neuron').length === 0)) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next;
    });
  };

  const neuronRows = placed.filter((p) => p.toolId === 'neuron');
  const synapseRows = placed.filter((p) => p.toolId === 'synapse');

  const conductionSpeed = Number((1.5 + frequency * 1.8).toFixed(1));

  usePublishResult({
    mavzu: simulation.title,
    'neyronlar soni': neuronCount,
    'sinapslar soni': synapseCount,
    'impuls chastotasi (Hz)': Number(frequency.toFixed(2)),
    'o‘tkazuvchanlik tezligi (m/s, taxmin)': running ? conductionSpeed : 0,
    holat: running ? 'faol' : "to'xtatilgan",
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.6, 7]} minDistance={3} maxDistance={14} showStars={false}>
        <GroundBoundary radius={5.2} accent={ACCENT} y={-1.1} />
        <HandControlledGroup hand={hand} autoRotate={false}>
          {neuronRows.map((p, i) => {
            const [x, , z] = clampedRowLayout(i, neuronRows.length, 5.2, 2.6);
            return (
              <group key={p.instanceId} position={[x, 0, z]}>
                <GltfModel url="/models/biology/neuron-cell.glb" center targetSize={1.3} />
                {running && <NeuronPulse frequency={frequency} seed={i * 0.37} />}
              </group>
            );
          })}
          {synapseRows.map((p, i) => {
            const host = neuronRows[Math.min(i, Math.max(neuronRows.length - 1, 0))];
            const hostIndex = host ? neuronRows.indexOf(host) : 0;
            const [x, , z] = clampedRowLayout(hostIndex, Math.max(neuronRows.length, 1), 5.2, 2.6);
            return (
              <group key={p.instanceId} position={[x, 0, z]}>
                {running && <SynapseVesicle frequency={frequency} seed={i * 0.19} />}
                {!running && (
                  <group position={[1.4, -0.1, 0]} scale={0.6}>
                    <GltfModel url="/models/biology/synapse-vesicle.glb" center targetSize={0.7} />
                  </group>
                )}
              </group>
            );
          })}
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title="Neyron asboblari"
        tools={NEURON_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={NEURON_CAP}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Dam olish potensiali</span>
            <span className="text-slate-200 font-mono">-70 mV</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Harakat potensiali cho&apos;qqisi</span>
            <span className="text-slate-200 font-mono">+40 mV</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-300">Chastota</span>
            <span className="text-slate-200 font-mono">{frequency.toFixed(1)} Hz</span>
          </div>
        </div>
      </InfoCard>

      <ControlBar>
        <ToggleButton active={running} onClick={() => setRunning((r) => !r)} activeLabel="To'xtatish" idleLabel="Impulsni yubor" />
        <SliderControl
          label="Chastota"
          value={frequency}
          min={0.2}
          max={4}
          step={0.1}
          onChange={setFrequency}
          display={`${frequency.toFixed(1)} Hz`}
        />
        <span className="text-[11px] text-slate-500 border-l border-slate-700/60 pl-4">
          Sinaps pufakchasi faqat neyron qo&apos;shilgandan keyin ishlaydi
        </span>
      </ControlBar>

      <HintBar text="Neyron va sinaps qo'shing, impuls chastotasini sozlab signal tarqalishini kuzating." />
    </div>
  );
}

// ===========================================================================
// 4) RANGLI KO'RISH — to'lqin uzunligi, konussimon hujayralar javobi
// ===========================================================================

const VISION_TOOLS: ToolDefinition[] = [
  { id: 'eye', label: "Ko'z kesimi", icon: 'Eye', description: 'Retina tuzilishini ko‘rsatadi' },
  { id: 'cone', label: 'Konussimon hujayra', icon: 'CircleDot', description: 'Rangni qabul qiluvchi retina hujayrasi' },
];

const VISION_CAP = 5;

const CONES = [
  { key: 'S', label: 'S-konus (ko‘k)', mean: 440, sigma: 32, color: '#60a5fa' },
  { key: 'M', label: 'M-konus (yashil)', mean: 535, sigma: 40, color: '#4ade80' },
  { key: 'L', label: 'L-konus (qizil)', mean: 570, sigma: 48, color: '#f87171' },
];

function PhotonBeam({ wavelength, offset }: { wavelength: number; offset: number }) {
  const ref = useRef<THREE.Group>(null);
  const color = useMemo(() => wavelengthToColor(wavelength), [wavelength]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = ((clock.elapsedTime * 0.6 + offset) % 1 + 1) % 1;
    ref.current.position.set(-3.2 + phase * 3.4, Math.sin(offset * 10) * 0.3, 0);
  });
  return (
    <group ref={ref}>
      <GltfModel url="/models/biology/photon-particle.glb" center targetSize={0.22} />
      <mesh>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ColorVisionLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([{ instanceId: 'eye-0', toolId: 'eye', position: [0, 0, 0] }]);
  const [wavelength, setWavelength] = useState(520);

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= VISION_CAP) return prev;
      return [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] }];
    });
  };

  const counts = useToolCounts(placed);
  const hasEye = (counts.eye ?? 0) > 0;
  const coneRows = placed.filter((p) => p.toolId === 'cone');

  const responses = useMemo(
    () => CONES.map((c) => ({ ...c, response: gaussianResponse(wavelength, c.mean, c.sigma) })),
    [wavelength],
  );
  const dominant = responses.reduce((best, cur) => (cur.response > best.response ? cur : best), responses[0]);
  const color = wavelengthToColor(wavelength);

  usePublishResult({
    mavzu: simulation.title,
    "to'lqin uzunligi (nm)": Math.round(wavelength),
    'ustun konus turi': dominant.label,
    'S javobi': Number(responses[0].response.toFixed(2)),
    'M javobi': Number(responses[1].response.toFixed(2)),
    'L javobi': Number(responses[2].response.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.4, 6.5]} minDistance={3} maxDistance={13} showStars={false}>
        <GroundBoundary radius={5} accent={ACCENT} y={-1.1} />
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.05}>
          {hasEye && (
            <group position={[1.6, 0, 0]}>
              <GltfModel url="/models/biology/eye-cross-section.glb" center targetSize={2.2} />
            </group>
          )}
          {coneRows.map((p, i) => {
            const [, , z] = clampedRowLayout(i, coneRows.length, 4, 0.8);
            return (
              <group key={p.instanceId} position={[2.6, -0.6 + i * 0.05, z]} scale={0.5}>
                <GltfModel url="/models/biology/retina-cone-cell.glb" center targetSize={0.5} />
              </group>
            );
          })}
          {hasEye && Array.from({ length: 3 }).map((_, i) => <PhotonBeam key={i} wavelength={wavelength} offset={i / 3} />)}
        </HandControlledGroup>
        {hasEye && (
          <ReadoutTag position={[1.6, 1.3, 0]} color={color}>
            {Math.round(wavelength)} nm &middot; {dominant.label}
          </ReadoutTag>
        )}
      </SceneCanvas>

      <ToolkitPanel
        title="Rangli ko'rish asboblari"
        tools={VISION_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={VISION_CAP}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1.5 mt-2">
          {responses.map((c) => (
            <div key={c.key} className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span style={{ color: c.color }}>{c.label}</span>
                <span className="text-slate-400 font-mono">{Math.round(c.response * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900/70 overflow-hidden">
                <div className="h-full" style={{ width: `${c.response * 100}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      <ControlBar>
        <div className="w-5 h-5 rounded-full border border-slate-600" style={{ background: color }} />
        <SliderControl
          label="To'lqin uzunligi"
          value={wavelength}
          min={400}
          max={700}
          step={2}
          onChange={setWavelength}
          display={`${Math.round(wavelength)} nm`}
          width="w-40"
        />
      </ControlBar>

      <HintBar text="Ko'z va konussimon hujayra qo'shing, to'lqin uzunligini o'zgartirib qaysi konus javob berishini ko'ring." />
    </div>
  );
}

// ===========================================================================
// 5) pH SHKALASI — biologik muhitlarning kislotalilik darajasi
// ===========================================================================

const PH_TOOLS: ToolDefinition[] = [
  { id: 'liquid', label: 'Biologik suyuqlik', icon: 'Beaker', description: 'pH ko‘rsatkichi bo‘yicha rang o‘zgaruvchi namuna' },
  { id: 'droplet', label: 'Tomchi', icon: 'Droplet', description: 'Qo‘shimcha namuna tomchisi' },
];

const PH_CAP = 6;

function PhScaleLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([{ instanceId: 'liquid-0', toolId: 'liquid', position: [0, 0, 0] }]);
  const [ph, setPh] = useState(7.4);

  const addTool = (toolId: string) => {
    setPlaced((prev) => {
      if (prev.length >= PH_CAP) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => ({ ...p, position: clampedRowLayout(i, next.length, 5.5, 1.8) }));
    });
  };

  const color = phToColor(ph);
  const hConcentration = Math.pow(10, -ph);
  const classification = ph < 6.5 ? 'Nordon (kislotali)' : ph > 7.5 ? "Ishqoriy (asosli)" : 'Neytral';
  const nearest = nearestPhExample(ph);

  usePublishResult({
    mavzu: simulation.title,
    pH: Number(ph.toFixed(1)),
    '[H⁺] (mol/l)': Number(hConcentration.toExponential(2)),
    tasnif: classification,
    "eng yaqin biologik muhit": `${nearest.label} (pH ≈ ${nearest.ph})`,
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.8, 7]} minDistance={3} maxDistance={13} showStars={false}>
        <GroundBoundary radius={5.5} accent={ACCENT} />
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.05}>
          {placed.map((p) => (
            <group key={p.instanceId} position={p.position}>
              {p.toolId === 'droplet' ? (
                <GltfModel url="/models/biology/water-droplet.glb" center targetSize={0.6} />
              ) : (
                <GltfModel url="/models/biology/liquid-layer-set.glb" center targetSize={1.4} />
              )}
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.16, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </HandControlledGroup>
        <ReadoutTag position={[0, 2.1, 0]} color={color}>
          pH {ph.toFixed(1)} &middot; {classification}
        </ReadoutTag>
      </SceneCanvas>

      <ToolkitPanel
        title="pH asboblari"
        tools={PH_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={PH_CAP}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">pH</span>
            <span className="font-mono" style={{ color }}>
              {ph.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">[H⁺]</span>
            <span className="text-slate-200 font-mono">{hConcentration.toExponential(2)} mol/l</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tasnif</span>
            <span className="text-slate-200">{classification}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50 mt-1">
            Eng yaqin biologik muhit: <span className="text-violet-300">{nearest.label}</span> (pH &asymp; {nearest.ph})
          </p>
        </div>
      </InfoCard>

      <ControlBar>
        <SliderControl label="pH" value={ph} min={0} max={14} step={0.1} onChange={setPh} display={ph.toFixed(1)} width="w-40" />
        <span className="text-[11px] text-slate-500 border-l border-slate-700/60 pl-4">
          [H⁺] = 10⁻ᵖᴴ &middot; 0&ndash;6.5 nordon, 7 neytral, 7.5&ndash;14 ishqoriy
        </span>
      </ControlBar>

      <HintBar text="pH qiymatini o'zgartirib, biologik suyuqliklarning kislota-ishqor darajasini solishtiring." />
    </div>
  );
}

// ===========================================================================
// 6) ZICHLIK — massa, hajm va suvda suzish/cho'kish
// ===========================================================================

const DENSITY_TOOLS: ToolDefinition[] = [
  { id: 'sample', label: 'Namuna (muz)', icon: 'Snowflake', description: 'Massa/hajmi sozlanadigan namuna qo‘shadi' },
  { id: 'pool', label: 'Suv hovuzi', icon: 'Droplets', description: 'Zichlikni solishtirish uchun suv qatlami' },
];

const DENSITY_CAP = 4;
const WATER_DENSITY = 1.0;

function DensitySample({ position, submergedFraction }: { position: [number, number, number]; submergedFraction: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const bob = Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.03;
    ref.current.position.y = position[1] - submergedFraction * 0.6 + bob;
  });
  return (
    <group ref={ref} position={position}>
      <GltfModel url="/models/biology/ice-cube.glb" center targetSize={0.9} />
    </group>
  );
}

function DensityLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([{ instanceId: 'sample-0', toolId: 'sample', position: [0, 0, 0] }]);
  const [hasPool, setHasPool] = useState(true);
  const [mass, setMass] = useState(276);
  const [volume, setVolume] = useState(300);

  const addTool = (toolId: string) => {
    if (toolId === 'pool') {
      setHasPool(true);
      return;
    }
    setPlaced((prev) => {
      if (prev.length >= DENSITY_CAP) return prev;
      const next = [...prev, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => ({ ...p, position: clampedRowLayout(i, next.length, 5, 1.6) }));
    });
  };

  const density = volume > 0 ? mass / volume : 0;
  const floats = density < WATER_DENSITY;
  const submergedFraction = THREE.MathUtils.clamp(density / WATER_DENSITY, 0, 1);

  usePublishResult({
    mavzu: simulation.title,
    'massa (g)': mass,
    'hajm (sm³)': volume,
    'zichlik (g/sm³)': Number(density.toFixed(2)),
    'suvda holati': floats ? 'suzadi' : "cho'kadi",
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.6, 7]} minDistance={3} maxDistance={13} showStars={false}>
        <GroundBoundary radius={5} accent={ACCENT} />
        {hasPool && (
          <group position={[0, -0.75, 0]}>
            <GltfModel url="/models/biology/liquid-layer-set.glb" center targetSize={5.2} />
          </group>
        )}
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.05}>
          {placed.map((p) => (
            <DensitySample key={p.instanceId} position={[p.position[0], 0.3, p.position[2]]} submergedFraction={submergedFraction} />
          ))}
        </HandControlledGroup>
        <ReadoutTag position={[0, 1.4, 0]} color={floats ? '#4ade80' : '#f87171'}>
          ρ = {density.toFixed(2)} g/sm³ &middot; {floats ? 'suzadi' : "cho'kadi"}
        </ReadoutTag>
      </SceneCanvas>

      <ToolkitPanel
        title="Zichlik asboblari"
        tools={DENSITY_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={DENSITY_CAP}
        onAddTool={addTool}
        onClearAll={() => {
          setPlaced([]);
          setHasPool(false);
        }}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">ρ (namuna)</span>
            <span className="text-slate-200 font-mono">{density.toFixed(2)} g/sm³</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ρ (suv)</span>
            <span className="text-slate-200 font-mono">1.00 g/sm³</span>
          </div>
          <div className="flex justify-between">
            <span className={floats ? 'text-emerald-300' : 'text-rose-300'}>Holat</span>
            <span className="text-slate-200">{floats ? 'Suzadi' : "Cho'kadi"}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50 mt-1">
            Muz zichligi (&asymp;0.92 g/sm&sup3;) suvdan past &mdash; shu sababli muz suvda suzadi.
          </p>
        </div>
      </InfoCard>

      <ControlBar>
        <SliderControl label="Massa" value={mass} min={10} max={600} step={2} onChange={setMass} display={`${mass} g`} />
        <SliderControl label="Hajm" value={volume} min={10} max={600} step={2} onChange={setVolume} display={`${volume} sm³`} />
      </ControlBar>

      <HintBar text="Massa va hajmni sozlab zichlikni hisoblang, namunaning suvda suzishi/cho'kishini kuzating." />
    </div>
  );
}

// ===========================================================================
// 7) DIFFUZIYA — membranadan konsentratsiya gradienti bo'yicha o'tish
// ===========================================================================

const DIFFUSION_TOOLS: ToolDefinition[] = [
  { id: 'particle', label: 'Molekula', icon: 'CircleDot', description: 'Chap kameraga yuqori konsentratsiyali molekula qo‘shadi' },
  { id: 'membrane', label: 'Hujayra membranasi', icon: 'Hexagon', description: 'Yarim o‘tkazuvchi membranani ko‘rsatadi' },
];

const DIFFUSION_CAP = 20;

function DiffusionParticles({
  particles,
  running,
  rate,
  onCounts,
}: {
  particles: PlacedTool[];
  running: boolean;
  rate: number;
  onCounts: (left: number, right: number) => void;
}) {
  const sidesRef = useRef<Map<string, number>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const reportTimer = useRef(0);

  useEffect(() => {
    const map = sidesRef.current;
    const ids = new Set(particles.map((p) => p.instanceId));
    Array.from(map.keys()).forEach((id) => {
      if (!ids.has(id)) map.delete(id);
    });
    particles.forEach((p) => {
      if (!map.has(p.instanceId)) map.set(p.instanceId, -1);
    });
  }, [particles]);

  useFrame(({ clock }, dt) => {
    const map = sidesRef.current;
    if (running) {
      particles.forEach((p) => {
        if (Math.random() < rate * dt) {
          const cur = map.get(p.instanceId) ?? -1;
          map.set(p.instanceId, cur === -1 ? 1 : -1);
        }
      });
    }
    const group = groupRef.current;
    if (group) {
      particles.forEach((p, i) => {
        const child = group.children[i] as THREE.Object3D | undefined;
        if (!child) return;
        const side = map.get(p.instanceId) ?? -1;
        const seed = i * 12.9;
        const baseX = side === -1 ? -1.7 : 1.7;
        child.position.set(
          baseX + Math.sin(clock.elapsedTime * 1.3 + seed) * 0.55,
          Math.sin(clock.elapsedTime * 1.7 + seed) * 0.35 + 0.3,
          Math.cos(clock.elapsedTime * 1.1 + seed) * 0.9,
        );
      });
    }
    reportTimer.current += dt;
    if (reportTimer.current > 0.25) {
      reportTimer.current = 0;
      let left = 0;
      particles.forEach((p) => {
        if ((map.get(p.instanceId) ?? -1) === -1) left += 1;
      });
      onCounts(left, particles.length - left);
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((p) => (
        <group key={p.instanceId}>
          <GltfModel url="/models/biology/molecule-particle.glb" center targetSize={0.22} />
        </group>
      ))}
    </group>
  );
}

function DiffusionLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>(
    Array.from({ length: 10 }, (_, i) => ({ instanceId: `particle-${i}`, toolId: 'particle', position: [0, 0, 0] as [number, number, number] })),
  );
  const [hasMembrane, setHasMembrane] = useState(true);
  const [running, setRunning] = useState(true);
  const [rate, setRate] = useState(0.4);
  const [counts, setCounts] = useState({ left: 10, right: 0 });

  const addTool = (toolId: string) => {
    if (toolId === 'membrane') {
      setHasMembrane(true);
      return;
    }
    setPlaced((prev) => {
      if (prev.length >= DIFFUSION_CAP) return prev;
      return [...prev, { instanceId: `particle-${Date.now()}-${Math.random()}`, toolId: 'particle', position: [0, 0, 0] }];
    });
  };

  const reset = () => {
    setPlaced(Array.from({ length: 10 }, (_, i) => ({ instanceId: `particle-reset-${Date.now()}-${i}`, toolId: 'particle', position: [0, 0, 0] })));
  };

  const total = counts.left + counts.right;
  const leftPct = total > 0 ? Math.round((counts.left / total) * 100) : 0;
  const equilibrium = total > 0 && Math.abs(leftPct - 50) <= 6;

  usePublishResult({
    mavzu: simulation.title,
    'chap kamera (%)': leftPct,
    "o'ng kamera (%)": 100 - leftPct,
    'konsentratsiya gradienti': Number((Math.abs(leftPct - (100 - leftPct)) / 100).toFixed(2)),
    holat: equilibrium ? 'muvozanatga yetdi' : 'diffuziya davom etmoqda',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.6, 7]} minDistance={3} maxDistance={13} showStars={false}>
        <GroundBoundary radius={5} accent={ACCENT} />
        {hasMembrane && (
          <group rotation={[0, 0, 0]}>
            <GltfModel url="/models/biology/cell-membrane.glb" center targetSize={3.2} />
          </group>
        )}
        <HandControlledGroup hand={hand} autoRotate={false}>
          <DiffusionParticles particles={placed} running={running} rate={rate} onCounts={(l, r) => setCounts({ left: l, right: r })} />
        </HandControlledGroup>
        <ReadoutTag position={[-1.7, 1.3, 0]} color="#38bdf8">
          Chap: {leftPct}%
        </ReadoutTag>
        <ReadoutTag position={[1.7, 1.3, 0]} color="#38bdf8">
          O&apos;ng: {100 - leftPct}%
        </ReadoutTag>
      </SceneCanvas>

      <ToolkitPanel
        title="Diffuziya asboblari"
        tools={DIFFUSION_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={DIFFUSION_CAP}
        onAddTool={addTool}
        onClearAll={() => {
          setPlaced([]);
          setHasMembrane(false);
        }}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="w-full h-2 rounded-full bg-slate-900/70 overflow-hidden flex">
            <div className="h-full bg-sky-400" style={{ width: `${leftPct}%` }} />
            <div className="h-full bg-emerald-400" style={{ width: `${100 - leftPct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-sky-300">Chap {leftPct}%</span>
            <span className="text-emerald-300">O&apos;ng {100 - leftPct}%</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
            {equilibrium ? 'Konsentratsiya tenglashdi (muvozanat)' : 'Molekulalar yuqori konsentratsiyadan pastga tomon harakatlanadi'}
          </p>
        </div>
      </InfoCard>

      <ControlBar>
        <ToggleButton active={running} onClick={() => setRunning((r) => !r)} activeLabel="To'xtatish" idleLabel="Davom etish" />
        <SliderControl label="Diffuziya tezligi" value={rate} min={0.05} max={1.5} step={0.05} onChange={setRate} display={rate.toFixed(2)} />
        <ResetButton onClick={reset} label="Qayta boshlash" />
      </ControlBar>

      <HintBar text="Molekulalarni chap kameraga qo'shing va ularning muvozanatga qarab tarqalishini kuzating." />
    </div>
  );
}

// ===========================================================================
// 8) MODDANING AGREGAT HOLATLARI — qattiq/suyuq/gaz va harorat
// ===========================================================================

const MATTER_TOOLS: ToolDefinition[] = [
  { id: 'particle', label: 'Molekula', icon: 'Dices', description: 'Haroratga qarab tezligi o‘zgaruvchi zarracha qo‘shadi' },
];

const MATTER_CAP = 16;

function kelvinSpeedFactor(celsius: number) {
  const kelvin = Math.max(celsius + 273.15, 1);
  return Math.sqrt(kelvin / 293.15);
}

function MatterParticle({ index, speedFactor, phase }: { index: number; speedFactor: number; phase: 'solid' | 'liquid' | 'gas' }) {
  const ref = useRef<THREE.Group>(null);
  const seed = index * 7.77;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speedFactor;
    const spread = phase === 'solid' ? 0.08 : phase === 'liquid' ? 0.5 : 1.8;
    const baseX = ((index % 4) - 1.5) * 0.5;
    const baseZ = (Math.floor(index / 4) - 1.5) * 0.5;
    ref.current.position.set(
      baseX + Math.sin(t * 2 + seed) * spread,
      0.2 + Math.cos(t * 1.7 + seed) * spread * 0.6,
      baseZ + Math.cos(t * 2.3 + seed) * spread,
    );
  });
  return (
    <group ref={ref}>
      <GltfModel url="/models/biology/molecule-particle.glb" center targetSize={0.24} />
    </group>
  );
}

function StatesOfMatterLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>(
    Array.from({ length: 10 }, (_, i) => ({ instanceId: `particle-${i}`, toolId: 'particle', position: [0, 0, 0] as [number, number, number] })),
  );
  const [temperature, setTemperature] = useState(20);

  const addTool = () => {
    setPlaced((prev) => {
      if (prev.length >= MATTER_CAP) return prev;
      return [...prev, { instanceId: `particle-${Date.now()}-${Math.random()}`, toolId: 'particle', position: [0, 0, 0] }];
    });
  };

  const phase: 'solid' | 'liquid' | 'gas' = temperature < 0 ? 'solid' : temperature < 100 ? 'liquid' : 'gas';
  const phaseLabel = phase === 'solid' ? 'Qattiq' : phase === 'liquid' ? 'Suyuq' : 'Gaz';
  const speedFactor = kelvinSpeedFactor(temperature);

  usePublishResult({
    mavzu: simulation.title,
    'harorat (°C)': temperature,
    'harorat (K)': Number((temperature + 273.15).toFixed(1)),
    faza: phaseLabel,
    "zarracha tezligi (nisbiy)": Number(speedFactor.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.8, 6.5]} minDistance={3} maxDistance={13} showStars={false}>
        <GroundBoundary radius={5} accent={ACCENT} />
        {phase === 'solid' && (
          <group position={[0, -0.4, 0]}>
            <GltfModel url="/models/biology/ice-cube.glb" center targetSize={2.2} />
          </group>
        )}
        {phase === 'liquid' && (
          <group position={[0, -0.9, 0]}>
            <GltfModel url="/models/biology/water-droplet.glb" center targetSize={3} />
          </group>
        )}
        {phase === 'gas' &&
          Array.from({ length: 4 }).map((_, i) => (
            <group key={i} position={[Math.sin(i * 2) * 1.4, 0.5 + i * 0.3, Math.cos(i * 2) * 1.4]} scale={0.6}>
              <GltfModel url="/models/biology/steam-particle.glb" center targetSize={0.8} />
            </group>
          ))}
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.04}>
          {placed.map((p, i) => (
            <MatterParticle key={p.instanceId} index={i} speedFactor={speedFactor} phase={phase} />
          ))}
        </HandControlledGroup>
        <ReadoutTag position={[0, 1.8, 0]}>
          {temperature}&deg;C &middot; {phaseLabel}
        </ReadoutTag>
      </SceneCanvas>

      <ToolkitPanel
        title="Agregat holat asboblari"
        tools={MATTER_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={MATTER_CAP}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Faza</span>
            <span className="text-slate-200 font-medium">{phaseLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Harorat</span>
            <span className="text-slate-200 font-mono">{temperature}&deg;C</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Zarracha tezligi</span>
            <span className="text-slate-200 font-mono">&times;{speedFactor.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
            v &prop; &radic;T &mdash; harorat ortishi bilan molekulalar tezroq harakatlanadi (0&deg;C qotish, 100&deg;C qaynash)
          </p>
        </div>
      </InfoCard>

      <ControlBar>
        <SliderControl
          label="Harorat"
          value={temperature}
          min={-50}
          max={150}
          step={1}
          onChange={setTemperature}
          display={`${temperature}°C`}
          width="w-40"
        />
      </ControlBar>

      <HintBar text="Haroratni o'zgartirib qattiq, suyuq va gaz holatlari orasidagi o'tishni kuzating." />
    </div>
  );
}

// ===========================================================================
// 9) MOLEKULALAR VA YORUG'LIK — fotonlarning yutilishi/o'tishi
// ===========================================================================

const LIGHT_TOOLS: ToolDefinition[] = [
  { id: 'molecule', label: 'Molekula', icon: 'Hexagon', description: 'Yorug‘likni yutuvchi nishon molekula' },
];

const LIGHT_CAP = 3;
const ABSORPTION_MIN = 450;
const ABSORPTION_MAX = 650;

function photonEnergyEv(nm: number) {
  return 1239.84 / nm;
}

function spectralBand(nm: number) {
  if (nm < 380) return 'Ultrabinafsha (UV)';
  if (nm > 700) return 'Infraqizil (IR)';
  return 'Ko‘rinadigan';
}

function PhotonFlight({ absorbed, targetX, onDone }: { absorbed: boolean; targetX: number; onDone: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useFrame(() => {
    if (!groupRef.current || doneRef.current) return;
    if (startRef.current === null) startRef.current = performance.now();
    const elapsed = (performance.now() - startRef.current) / 1000;
    const x = -5 + elapsed * 4;
    groupRef.current.position.set(x, 0.3, 0);
    if (absorbed && x >= targetX - 0.25) {
      doneRef.current = true;
      onDone();
    } else if (!absorbed && x > 5) {
      doneRef.current = true;
      onDone();
    }
  });

  return (
    <group ref={groupRef} position={[-5, 0.3, 0]}>
      <GltfModel url="/models/biology/photon-particle.glb" center targetSize={0.3} />
    </group>
  );
}

function MoleculesAndLightLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [placed, setPlaced] = useState<PlacedTool[]>([{ instanceId: 'mol-0', toolId: 'molecule', position: [0, 0, 0] }]);
  const [wavelength, setWavelength] = useState(540);
  const [flight, setFlight] = useState<{ id: string; absorbed: boolean } | null>(null);
  const [excited, setExcited] = useState(false);
  const excitedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addTool = () => {
    setPlaced((prev) => {
      if (prev.length >= LIGHT_CAP) return prev;
      const next = [...prev, { instanceId: `mol-${Date.now()}-${Math.random()}`, toolId: 'molecule', position: [0, 0, 0] as [number, number, number] }];
      return next.map((p, i) => ({ ...p, position: clampedRowLayout(i, next.length, 5, 2.2) }));
    });
  };

  const absorbed = wavelength >= ABSORPTION_MIN && wavelength <= ABSORPTION_MAX;
  const energyEv = photonEnergyEv(wavelength);
  const band = spectralBand(wavelength);

  const firePhoton = () => {
    setFlight({ id: `${Date.now()}`, absorbed });
  };

  const handleDone = () => {
    if (flight?.absorbed) {
      setExcited(true);
      if (excitedTimeout.current) clearTimeout(excitedTimeout.current);
      excitedTimeout.current = setTimeout(() => setExcited(false), 450);
    }
    setFlight(null);
  };

  useEffect(() => () => {
    if (excitedTimeout.current) clearTimeout(excitedTimeout.current);
  }, []);

  usePublishResult({
    mavzu: simulation.title,
    "to'lqin uzunligi (nm)": Math.round(wavelength),
    'foton energiyasi (eV)': Number(energyEv.toFixed(2)),
    spektr: band,
    natija: absorbed ? 'yutildi' : "o'tib ketdi",
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.4, 7]} minDistance={3} maxDistance={14} showStars={false}>
        <GroundBoundary radius={5.2} accent={ACCENT} />
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.05}>
          {placed.map((p) => (
            <group key={p.instanceId} position={p.position} scale={excited ? 1.25 : 1}>
              <GltfModel url="/models/biology/molecule-generic.glb" center targetSize={1} />
              {excited && <pointLight color="#fbbf24" intensity={2} distance={2.5} />}
            </group>
          ))}
        </HandControlledGroup>
        {flight && <PhotonFlight absorbed={flight.absorbed} targetX={placed[0]?.position[0] ?? 0} onDone={handleDone} />}
        <ReadoutTag position={[0, 1.4, 0]} color={wavelengthToColor(wavelength)}>
          {Math.round(wavelength)} nm &middot; {energyEv.toFixed(2)} eV
        </ReadoutTag>
      </SceneCanvas>

      <ToolkitPanel
        title="Yorug'lik asboblari"
        tools={LIGHT_TOOLS}
        accent={ACCENT}
        placedCount={placed.length}
        maxItems={LIGHT_CAP}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <InfoCard title={simulation.title} description={simulation.shortDescription}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] space-y-1 mt-2">
          <div className="flex justify-between">
            <span className="text-slate-400">E = hc/λ</span>
            <span className="text-slate-200 font-mono">{energyEv.toFixed(2)} eV</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spektr</span>
            <span className="text-slate-200">{band}</span>
          </div>
          <div className="flex justify-between">
            <span className={absorbed ? 'text-amber-300' : 'text-emerald-300'}>Natija</span>
            <span className="text-slate-200">{absorbed ? 'Yutiladi' : "O'tib ketadi"}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
            Molekula {ABSORPTION_MIN}&ndash;{ABSORPTION_MAX} nm oralig&apos;ini yutadi (qolganini o&apos;tkazadi)
          </p>
        </div>
      </InfoCard>

      <ControlBar>
        <button
          onClick={firePhoton}
          disabled={!!flight}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/80 text-white hover:bg-violet-500 disabled:opacity-40"
        >
          <Zap size={14} /> Foton yubor
        </button>
        <SliderControl
          label="To'lqin uzunligi"
          value={wavelength}
          min={300}
          max={750}
          step={2}
          onChange={setWavelength}
          display={`${Math.round(wavelength)} nm`}
          width="w-40"
        />
      </ControlBar>

      <HintBar text="To'lqin uzunligini sozlang va foton yuborib, yutilish yoki o'tishni kuzating." />
    </div>
  );
}

// ===========================================================================
// Mavzu registri + asosiy eksport
// ===========================================================================

export default function BiologySandboxLab({ hand, simulation }: BiologySandboxLabProps) {
  switch (simulation.id) {
    case 'biology-natural-selection':
      return <NaturalSelectionLab hand={hand} simulation={simulation} />;
    case 'biology-molecule-polarity':
      return <MoleculePolarityLab hand={hand} simulation={simulation} />;
    case 'biology-neuron':
      return <NeuronLab hand={hand} simulation={simulation} />;
    case 'biology-color-vision':
      return <ColorVisionLab hand={hand} simulation={simulation} />;
    case 'biology-ph-scale':
      return <PhScaleLab hand={hand} simulation={simulation} />;
    case 'biology-density':
      return <DensityLab hand={hand} simulation={simulation} />;
    case 'biology-diffusion':
      return <DiffusionLab hand={hand} simulation={simulation} />;
    case 'biology-states-of-matter':
      return <StatesOfMatterLab hand={hand} simulation={simulation} />;
    case 'biology-molecules-and-light':
      return <MoleculesAndLightLab hand={hand} simulation={simulation} />;
    default:
      return <NeuronLab hand={hand} simulation={simulation} />;
  }
}
