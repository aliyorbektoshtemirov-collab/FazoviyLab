// src/simulations/sandbox/ChemistrySandboxLab.tsx
// KIMYO — 9 ta sandbox mavzusining har biri o'ziga xos asbob-uskuna, 3D sahna
// va jonli hisob-kitoblarga ega mustaqil mini-simulyatsiya sifatida ishlaydi:
//   1. Yadro yaratish            — proton/neytron klasteri, izotop va barqarorlik
//   2. Molekula tuzish           — atomlarni bosib bog'lab molekula yig'ish
//   3. Atomlarning o'zaro ta'siri — Lennard-Jones tipidagi potensial va kuch
//   4. Izotoplar va atom massasi — izotop nisbati va o'rtacha atom massasi
//   5. Molekula shakllari        — VSEPR geometriyalarini taqqoslash
//   6. pH shkalasi               — pH -> rang -> kislota/ishqor tasnifi
//   7. Kislota-asosli eritmalar  — kislota/asos aralashtirib neytrallash
//   8. Konsentratsiya            — mol/L hisobi va zarracha zichligi
//   9. Atom modeli (Bor)        — elektron qavatlar va energetik sathlar
// Har biri umumiy SceneCanvas/GroundBoundary/ToolkitPanel/GlassParts
// konvensiyalaridan foydalanadi, lekin o'z holati, o'z sahnasi va o'z
// usePublishResult chiqishiga ega.

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import SceneCanvas from '../../components/SceneCanvas';
import HandControlledGroup from '../../components/HandControlledGroup';
import ToolkitPanel from '../../components/ToolkitPanel';
import GroundBoundary, { clampedCircleLayout } from '../../components/GroundBoundary';
import GltfModel from '../../components/GltfModel';
import { FlaskGlass, Liquid, Bubbles } from '../../components/chemistry/GlassParts';
import type { UseHandTrackingApi } from '../../hooks/useHandTracking';
import { usePublishResult } from '../../hooks/usePublishResult';
import type { Simulation, ToolDefinition } from '../../types';

interface ChemistrySandboxLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

const CHEM_ACCENT = '#34d399';

// ---------------------------------------------------------------------------
// Umumiy yordamchi ma'lumotlar
// ---------------------------------------------------------------------------

interface ElementInfo {
  z: number;
  symbol: string;
  name: string;
}

const ELEMENTS: ElementInfo[] = [
  { z: 1, symbol: 'H', name: 'Vodorod' },
  { z: 2, symbol: 'He', name: 'Geliy' },
  { z: 3, symbol: 'Li', name: 'Litiy' },
  { z: 4, symbol: 'Be', name: 'Berilliy' },
  { z: 5, symbol: 'B', name: 'Bor' },
  { z: 6, symbol: 'C', name: 'Uglerod' },
  { z: 7, symbol: 'N', name: 'Azot' },
  { z: 8, symbol: 'O', name: 'Kislorod' },
  { z: 9, symbol: 'F', name: 'Ftor' },
  { z: 10, symbol: 'Ne', name: 'Neon' },
  { z: 11, symbol: 'Na', name: 'Natriy' },
  { z: 12, symbol: 'Mg', name: 'Magniy' },
  { z: 13, symbol: 'Al', name: 'Alyuminiy' },
  { z: 14, symbol: 'Si', name: 'Kremniy' },
  { z: 15, symbol: 'P', name: 'Fosfor' },
  { z: 16, symbol: 'S', name: 'Oltingugurt' },
  { z: 17, symbol: 'Cl', name: 'Xlor' },
  { z: 18, symbol: 'Ar', name: 'Argon' },
  { z: 19, symbol: 'K', name: 'Kaliy' },
  { z: 20, symbol: 'Ca', name: 'Kalsiy' },
];

function elementByZ(z: number): ElementInfo {
  return ELEMENTS.find((e) => e.z === z) ?? { z, symbol: '?', name: "Noma'lum" };
}

/** Taqribiy barqarorlik taxmini: yengil elementlar uchun N≈Z, og'irroqlarida N biroz ko'proq. */
function isStableGuess(z: number, n: number): boolean {
  if (z === 0) return n <= 1;
  const expectedN = z + Math.round(z * 0.12);
  const tolerance = Math.max(2, Math.round(z * 0.18));
  return Math.abs(n - expectedN) <= tolerance;
}

/** Golden-angle (Fibonacci sphere) taqsimoti — elementlar soni o'zgarganda ham
 * barqaror, bir-biriga yopishmaydigan klaster ko'rinishini beradi. */
function fibonacciSpherePosition(index: number, total: number, radius: number): [number, number, number] {
  if (total <= 1) return [0, 0, 0];
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return [radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta) * 0.7, radius * Math.cos(phi)];
}

const PH_STOPS: Array<{ p: number; c: string }> = [
  { p: 0, c: '#dc2626' },
  { p: 2, c: '#f97316' },
  { p: 4, c: '#facc15' },
  { p: 7, c: '#4ade80' },
  { p: 10, c: '#38bdf8' },
  { p: 14, c: '#8b5cf6' },
];

function pHToColor(pH: number): THREE.Color {
  const clamped = THREE.MathUtils.clamp(pH, 0, 14);
  for (let i = 0; i < PH_STOPS.length - 1; i++) {
    const a = PH_STOPS[i];
    const b = PH_STOPS[i + 1];
    if (clamped >= a.p && clamped <= b.p) {
      const t = (clamped - a.p) / (b.p - a.p);
      return new THREE.Color(a.c).lerp(new THREE.Color(b.c), t);
    }
  }
  return new THREE.Color(PH_STOPS[PH_STOPS.length - 1].c);
}

function classifyPH(pH: number): string {
  if (pH < 6.5) return 'Kislotali';
  if (pH > 7.5) return 'Ishqoriy (asosli)';
  return 'Neytral';
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

function subscript(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUBSCRIPT_DIGITS[d] ?? d)
    .join('');
}

/** Hill tizimi: avval C, keyin H, keyin qolganlari alifbo tartibida. */
function formulaFromCounts(counts: Record<string, number>): string {
  const keys = Object.keys(counts).filter((k) => counts[k] > 0);
  if (keys.length === 0) return '—';
  const order = ['C', 'H', ...keys.filter((k) => k !== 'C' && k !== 'H').sort()];
  let out = '';
  for (const el of order) {
    const n = counts[el];
    if (!n) continue;
    out += el + (n > 1 ? subscript(n) : '');
  }
  return out || '—';
}

// ---------------------------------------------------------------------------
// Umumiy UI yordamchilari (bottom bar maydonlari, qobiq)
// ---------------------------------------------------------------------------

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[11px] text-slate-400 whitespace-nowrap">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(THREE.MathUtils.clamp(parseFloat(e.target.value) || 0, min, max))}
        className="w-16 rounded-lg bg-slate-800/70 border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200 font-mono focus:outline-none focus:border-emerald-400/70"
      />
    </div>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  display,
  width = 'w-28',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  display?: (value: number) => string;
  width?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-slate-400 w-24 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`${width} accent-emerald-400`}
      />
      <span className="text-[11px] text-emerald-200 font-mono w-16 text-right">
        {display ? display(value) : value}
      </span>
    </div>
  );
}

interface ShellProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
  toolkitTitle: string;
  tools: ToolDefinition[];
  placedCount: number;
  maxItems?: number;
  onAddTool: (toolId: string) => void;
  onClearAll: () => void;
  groundRadius?: number;
  cameraPosition?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  target?: [number, number, number];
  autoRotate?: boolean;
  infoExtra?: ReactNode;
  hint?: string;
  bottomBar?: ReactNode;
  children: ReactNode;
}

/** Barcha 9 mavzu uchun umumiy qobiq: sahna + toolkit + ma'lumot panel + boshqaruv paneli. */
function SandboxShell({
  hand,
  simulation,
  toolkitTitle,
  tools,
  placedCount,
  maxItems,
  onAddTool,
  onClearAll,
  groundRadius = 5.5,
  cameraPosition = [0, 2.4, 6.5],
  minDistance = 3,
  maxDistance = 12,
  target,
  autoRotate = true,
  infoExtra,
  hint,
  bottomBar,
  children,
}: ShellProps) {
  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={cameraPosition} minDistance={minDistance} maxDistance={maxDistance} target={target}>
        <GroundBoundary radius={groundRadius} accent={CHEM_ACCENT} />
        <HandControlledGroup hand={hand} autoRotate={autoRotate} autoRotateSpeed={0.05}>
          {children}
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title={toolkitTitle}
        tools={tools}
        accent={CHEM_ACCENT}
        placedCount={placedCount}
        maxItems={maxItems}
        onAddTool={onAddTool}
        onClearAll={onClearAll}
      />

      <div className="absolute top-56 right-4 glass-panel rounded-2xl px-5 py-4 w-64 space-y-2">
        <h3 className="text-sm font-semibold text-emerald-300">{simulation.title}</h3>
        <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
        {infoExtra}
      </div>

      {(bottomBar || hint) && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-5 flex-wrap justify-center max-w-2xl">
          {bottomBar}
          {hint && <span className="text-[11px] text-slate-500 border-l border-slate-700/60 pl-4">{hint}</span>}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${highlight ? 'text-emerald-300' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function StatBlock({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">{children}</div>;
}

// ===========================================================================
// 1. YADRO YARATISH — chemistry-build-a-nucleus
// ===========================================================================

const NUCLEUS_TOOLS: ToolDefinition[] = [
  { id: 'proton-add', label: 'Proton qo‘shish', icon: 'CircleDot', description: '+1 proton (element o‘zgaradi)' },
  { id: 'proton-remove', label: 'Proton ayirish', icon: 'CircleDotDashed', description: '−1 proton' },
  { id: 'neutron-add', label: 'Neytron qo‘shish', icon: 'Hexagon', description: '+1 neytron (izotop o‘zgaradi)' },
  { id: 'neutron-remove', label: 'Neytron ayirish', icon: 'Snowflake', description: '−1 neytron' },
];

const PROTON_COLOR = new THREE.Color('#f87171');
const NEUTRON_COLOR = new THREE.Color('#94a3b8');

function NucleonSphere({ position, isProton }: { position: [number, number, number]; isProton: boolean }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color={isProton ? PROTON_COLOR : NEUTRON_COLOR} roughness={0.35} metalness={0.1} />
    </mesh>
  );
}

function NucleusLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [protons, setProtons] = useState(6);
  const [neutrons, setNeutrons] = useState(6);

  const element = elementByZ(protons);
  const massNumber = protons + neutrons;
  const isotopeLabel = `${element.symbol}-${massNumber}`;
  const stable = isStableGuess(protons, neutrons);
  const total = protons + neutrons;
  const radius = total > 0 ? 0.22 + Math.cbrt(total) * 0.13 : 0.1;

  const nucleons = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => ({
        isProton: i < protons,
        position: fibonacciSpherePosition(i, total, radius),
      })),
    [protons, total, radius],
  );

  const addTool = (toolId: string) => {
    if (toolId === 'proton-add') setProtons((p) => Math.min(20, p + 1));
    else if (toolId === 'proton-remove') setProtons((p) => Math.max(1, p - 1));
    else if (toolId === 'neutron-add') setNeutrons((n) => Math.min(24, n + 1));
    else if (toolId === 'neutron-remove') setNeutrons((n) => Math.max(0, n - 1));
  };

  usePublishResult({
    mavzu: simulation.title,
    element: `${element.name} (${element.symbol})`,
    izotop: isotopeLabel,
    'proton soni (Z)': protons,
    'neytron soni (N)': neutrons,
    'massa soni (A)': massNumber,
    barqarorlik: stable ? "barqaror (taxminan)" : "beqaror (radioaktiv, taxminan)",
  });

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Yadro qurilmasi"
      tools={NUCLEUS_TOOLS}
      placedCount={total}
      maxItems={40}
      onAddTool={addTool}
      onClearAll={() => {
        setProtons(6);
        setNeutrons(6);
      }}
      groundRadius={5}
      cameraPosition={[0, 1.6, 5.5]}
      target={[0, 1, 0]}
      infoExtra={
        <StatBlock>
          <StatRow label="Element" value={`${element.symbol} — ${element.name}`} highlight />
          <StatRow label="Izotop" value={isotopeLabel} />
          <StatRow label="A = Z + N" value={String(massNumber)} />
          <StatRow label="Holat" value={stable ? "Barqaror" : 'Beqaror'} highlight={stable} />
        </StatBlock>
      }
      hint="Qizil = proton, kulrang = neytron. Proton sonini o'zgartirib elementni almashtiring."
      bottomBar={
        <>
          <NumberField id="protons" label="Protonlar (Z)" value={protons} onChange={(v) => setProtons(Math.round(v))} min={1} max={20} />
          <NumberField id="neutrons" label="Neytronlar (N)" value={neutrons} onChange={(v) => setNeutrons(Math.round(v))} min={0} max={24} />
        </>
      }
    >
      <group position={[0, 1, 0]}>
        <group scale={0.4}>
          <GltfModel url="/models/chemistry/nucleus-core.glb" center targetSize={radius * 1.6} />
        </group>
        {nucleons.map((n, i) => (
          <NucleonSphere key={i} position={n.position} isProton={n.isProton} />
        ))}
        <Html position={[0, radius + 0.6, 0]} center distanceFactor={9}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] text-emerald-200 whitespace-nowrap">
            {isotopeLabel} &middot; A={massNumber}
          </div>
        </Html>
      </group>

      <group position={[2.6, 1.1, 0.4]} scale={0.6}>
        <GltfModel url="/models/chemistry/isotope-atom.glb" center targetSize={1.1} />
        <Html position={[0, 1, 0]} center distanceFactor={9}>
          <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-slate-300 whitespace-nowrap">
            Izotop ko&apos;rinishi
          </div>
        </Html>
      </group>
    </SandboxShell>
  );
}

// ===========================================================================
// 2. MOLEKULA TUZISH — chemistry-build-a-molecule
// ===========================================================================

interface AtomTypeInfo {
  label: string;
  color: string;
  radius: number;
}

const ATOM_TYPES: Record<string, AtomTypeInfo> = {
  H: { label: 'Vodorod (H)', color: '#f1f5f9', radius: 0.26 },
  O: { label: 'Kislorod (O)', color: '#f87171', radius: 0.38 },
  C: { label: 'Uglerod (C)', color: '#94a3b8', radius: 0.4 },
  N: { label: 'Azot (N)', color: '#60a5fa', radius: 0.37 },
  Cl: { label: 'Xlor (Cl)', color: '#4ade80', radius: 0.46 },
};

const MOLECULE_TOOLS: ToolDefinition[] = [
  { id: 'add-H', label: 'Vodorod (H)', icon: 'CircleDot', description: 'Atom qo‘shish' },
  { id: 'add-O', label: 'Kislorod (O)', icon: 'Droplet', description: 'Atom qo‘shish' },
  { id: 'add-C', label: 'Uglerod (C)', icon: 'Hexagon', description: 'Atom qo‘shish' },
  { id: 'add-N', label: 'Azot (N)', icon: 'Wind', description: 'Atom qo‘shish' },
  { id: 'add-Cl', label: 'Xlor (Cl)', icon: 'Leaf', description: 'Atom qo‘shish' },
];

const MAX_ATOMS = 10;
const MAX_BONDS = 12;

interface AtomInstance {
  id: string;
  element: string;
  position: [number, number, number];
}

interface BondInstance {
  id: string;
  a: string;
  b: string;
}

function AtomUnit({ atom, selected, onSelect }: { atom: AtomInstance; selected: boolean; onSelect: () => void }) {
  const info = ATOM_TYPES[atom.element];
  return (
    <group
      position={atom.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <GltfModel url="/models/chemistry/atom-sphere-generic.glb" center targetSize={info.radius * 2} />
      <Html position={[0, info.radius + 0.4, 0]} center distanceFactor={9}>
        <div
          className={`glass-panel rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
            selected ? 'ring-1 ring-amber-400/70 text-amber-200' : ''
          }`}
          style={{ color: selected ? undefined : info.color }}
        >
          {atom.element}
        </div>
      </Html>
    </group>
  );
}

function BondVisual({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const euler = useMemo(() => {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    return new THREE.Euler().setFromQuaternion(q);
  }, [a, b]);

  return (
    <group position={mid} rotation={[euler.x, euler.y, euler.z]}>
      <GltfModel url="/models/chemistry/atom-pair.glb" center targetSize={Math.max(0.35, dist)} />
    </group>
  );
}

function MoleculeBuilderLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [atoms, setAtoms] = useState<AtomInstance[]>([]);
  const [bonds, setBonds] = useState<BondInstance[]>([]);
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);

  const GROUND_RADIUS = 5.5;

  const addTool = (toolId: string) => {
    if (!toolId.startsWith('add-')) return;
    const element = toolId.slice(4);
    if (!ATOM_TYPES[element]) return;
    setAtoms((prev) => {
      if (prev.length >= MAX_ATOMS) return prev;
      const id = `atom-${Date.now()}-${Math.random()}`;
      const next = [...prev, { id, element, position: [0, 0.4, 0] as [number, number, number] }];
      return next.map((a, i) => {
        const [x, , z] = clampedCircleLayout(i, next.length, GROUND_RADIUS);
        return { ...a, position: [x, 0.4, z] as [number, number, number] };
      });
    });
  };

  const handleAtomSelect = (id: string) => {
    if (!selectedAtomId) {
      setSelectedAtomId(id);
      return;
    }
    if (selectedAtomId === id) {
      setSelectedAtomId(null);
      return;
    }
    const a = selectedAtomId;
    const b = id;
    setBonds((prev) => {
      const exists = prev.some((bd) => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a));
      if (exists || prev.length >= MAX_BONDS) return prev;
      return [...prev, { id: `bond-${Date.now()}-${Math.random()}`, a, b }];
    });
    setSelectedAtomId(null);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    atoms.forEach((a) => {
      c[a.element] = (c[a.element] ?? 0) + 1;
    });
    return c;
  }, [atoms]);

  const formula = useMemo(() => formulaFromCounts(counts), [counts]);

  usePublishResult({
    mavzu: simulation.title,
    formula,
    'atomlar soni': atoms.length,
    "bog'lar soni": bonds.length,
  });

  const positionOf = (id: string) => atoms.find((a) => a.id === id)?.position;

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Atomlar to'plami"
      tools={MOLECULE_TOOLS}
      placedCount={atoms.length}
      maxItems={MAX_ATOMS}
      onAddTool={addTool}
      onClearAll={() => {
        setAtoms([]);
        setBonds([]);
        setSelectedAtomId(null);
      }}
      groundRadius={GROUND_RADIUS}
      infoExtra={
        <StatBlock>
          <StatRow label="Formula" value={formula} highlight />
          <StatRow label="Atomlar" value={String(atoms.length)} />
          <StatRow label="Bog'lar" value={String(bonds.length)} />
        </StatBlock>
      }
      hint="Ikki atomni ketma-ket bosib bog' hosil qiling"
      bottomBar={
        <span className="text-[11px] text-slate-400">
          {selectedAtomId ? "Endi ikkinchi atomni bosing → bog' hosil bo'ladi" : "Bog'lash uchun bitta atomni bosing"}
        </span>
      }
    >
      {atoms.map((a) => (
        <AtomUnit key={a.id} atom={a} selected={a.id === selectedAtomId} onSelect={() => handleAtomSelect(a.id)} />
      ))}
      {bonds.map((bd) => {
        const pa = positionOf(bd.a);
        const pb = positionOf(bd.b);
        if (!pa || !pb) return null;
        return <BondVisual key={bd.id} a={pa} b={pb} />;
      })}
    </SandboxShell>
  );
}

// ===========================================================================
// 3. ATOMLARNING O'ZARO TA'SIRI — chemistry-atomic-interactions
// ===========================================================================

interface InteractionPreset {
  id: string;
  label: string;
  icon: string;
  epsilon: number;
  sigma: number;
}

const INTERACTION_PRESETS: InteractionPreset[] = [
  { id: 'weak', label: "H–H (zaif kovalent)", icon: 'Waves', epsilon: 0.3, sigma: 1.3 },
  { id: 'strong', label: "O–H (kuchli kovalent)", icon: 'Magnet', epsilon: 1.1, sigma: 0.95 },
  { id: 'vdw', label: "Ar–Ar (van der Vaals)", icon: 'Orbit', epsilon: 0.15, sigma: 1.8 },
];

const INTERACTION_TOOLS: ToolDefinition[] = INTERACTION_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
  icon: p.icon,
  description: `ε=${p.epsilon}, σ=${p.sigma}`,
}));

function AtomicInteractionLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [presetId, setPresetId] = useState('weak');
  const preset = INTERACTION_PRESETS.find((p) => p.id === presetId) ?? INTERACTION_PRESETS[0];
  const [distance, setDistance] = useState(preset.sigma * 1.4);

  const sr6 = Math.pow(preset.sigma / distance, 6);
  const sr12 = sr6 * sr6;
  const potential = 4 * preset.epsilon * (sr12 - sr6);
  const force = (24 * preset.epsilon / distance) * (2 * sr12 - sr6);
  const equilibrium = preset.sigma * Math.pow(2, 1 / 6);

  let stateLabel = 'Muvozanatda';
  let lineColor = '#4ade80';
  if (Math.abs(distance - equilibrium) >= 0.15 * preset.sigma) {
    if (force > 0) {
      stateLabel = "Itaruvchi kuch (juda yaqin)";
      lineColor = '#f87171';
    } else {
      stateLabel = "Tortuvchi kuch (masofa katta)";
      lineColor = '#38bdf8';
    }
  }

  const addTool = (toolId: string) => {
    const next = INTERACTION_PRESETS.find((p) => p.id === toolId);
    if (!next) return;
    setPresetId(next.id);
    setDistance(next.sigma * 1.4);
  };

  usePublishResult({
    mavzu: simulation.title,
    juftlik: preset.label,
    'masofa r': Number(distance.toFixed(2)),
    'muvozanat masofasi': Number(equilibrium.toFixed(2)),
    'potensial energiya U': Number(potential.toFixed(3)),
    holat: stateLabel,
  });

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Atom juftligi"
      tools={INTERACTION_TOOLS}
      placedCount={2}
      maxItems={2}
      onAddTool={addTool}
      onClearAll={() => {
        setPresetId('weak');
        setDistance(INTERACTION_PRESETS[0].sigma * 1.4);
      }}
      groundRadius={5}
      cameraPosition={[0, 1.6, 5.5]}
      autoRotate={false}
      infoExtra={
        <StatBlock>
          <StatRow label="Juftlik" value={preset.label} highlight />
          <StatRow label="U(r)" value={potential.toFixed(3)} />
          <StatRow label="Holat" value={stateLabel} />
        </StatBlock>
      }
      bottomBar={
        <RangeField
          label="Masofa (r)"
          value={distance}
          onChange={setDistance}
          min={preset.sigma * 0.6}
          max={preset.sigma * 3}
          step={0.02}
          display={(v) => v.toFixed(2)}
        />
      }
    >
      <group position={[0, 1, 0]}>
        <group position={[-distance / 2, 0, 0]}>
          <GltfModel url="/models/chemistry/atom-sphere-generic.glb" center targetSize={0.55} />
        </group>
        <group position={[distance / 2, 0, 0]}>
          <GltfModel url="/models/chemistry/atom-sphere-generic.glb" center targetSize={0.55} />
        </group>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, distance, 16]} />
          <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.5} />
        </mesh>
        <Html position={[0, 0.8, 0]} center distanceFactor={9}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] whitespace-nowrap" style={{ color: lineColor }}>
            U = {potential.toFixed(2)} &middot; {stateLabel}
          </div>
        </Html>
      </group>
    </SandboxShell>
  );
}

// ===========================================================================
// 4. IZOTOPLAR VA ATOM MASSASI — chemistry-isotopes-and-mass
// ===========================================================================

interface IsotopePairInfo {
  id: string;
  elementLabel: string;
  icon: string;
  labelA: string;
  labelB: string;
  massA: number;
  massB: number;
  defaultAbundanceA: number;
}

const ISOTOPE_PAIRS: IsotopePairInfo[] = [
  { id: 'H', elementLabel: 'Vodorod (H)', icon: 'CircleDot', labelA: '¹H', labelB: '²H', massA: 1.0078, massB: 2.0141, defaultAbundanceA: 99.98 },
  { id: 'C', elementLabel: 'Uglerod (C)', icon: 'Hexagon', labelA: '¹²C', labelB: '¹³C', massA: 12.0, massB: 13.0034, defaultAbundanceA: 98.9 },
  { id: 'Cl', elementLabel: 'Xlor (Cl)', icon: 'Leaf', labelA: '³⁵Cl', labelB: '³⁷Cl', massA: 34.9689, massB: 36.9659, defaultAbundanceA: 75.8 },
  { id: 'Cu', elementLabel: 'Mis (Cu)', icon: 'Gem', labelA: '⁶³Cu', labelB: '⁶⁵Cu', massA: 62.9296, massB: 64.9278, defaultAbundanceA: 69.2 },
];

const ISOTOPE_TOOLS: ToolDefinition[] = ISOTOPE_PAIRS.map((p) => ({
  id: p.id,
  label: p.elementLabel,
  icon: p.icon,
  description: `${p.labelA} / ${p.labelB}`,
}));

const ISOTOPE_SAMPLE_SIZE = 10;

function IsotopeToken({ position, isA, label }: { position: [number, number, number]; isA: boolean; label: string }) {
  return (
    <group position={position} scale={0.45}>
      <GltfModel url="/models/chemistry/isotope-atom.glb" center targetSize={0.9} />
      <Html position={[0, 1, 0]} center distanceFactor={10}>
        <div className={`glass-panel rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap ${isA ? 'text-sky-300' : 'text-amber-300'}`}>
          {label}
        </div>
      </Html>
    </group>
  );
}

function IsotopesMassLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [pairId, setPairId] = useState('Cl');
  const pair = ISOTOPE_PAIRS.find((p) => p.id === pairId) ?? ISOTOPE_PAIRS[0];
  const [abundanceA, setAbundanceA] = useState(pair.defaultAbundanceA);

  const fractionA = abundanceA / 100;
  const avgMass = fractionA * pair.massA + (1 - fractionA) * pair.massB;

  const countA = Math.round((abundanceA / 100) * ISOTOPE_SAMPLE_SIZE);
  const countB = ISOTOPE_SAMPLE_SIZE - countA;

  const tilt = THREE.MathUtils.clamp(((pair.massA - pair.massB) * (countA - countB)) / 40, -0.35, 0.35);

  const addTool = (toolId: string) => {
    const next = ISOTOPE_PAIRS.find((p) => p.id === toolId);
    if (!next) return;
    setPairId(next.id);
    setAbundanceA(next.defaultAbundanceA);
  };

  usePublishResult({
    mavzu: simulation.title,
    element: pair.elementLabel,
    [`${pair.labelA} ulushi (%)`]: Number(abundanceA.toFixed(1)),
    [`${pair.labelB} ulushi (%)`]: Number((100 - abundanceA).toFixed(1)),
    "o'rtacha atom massasi": Number(avgMass.toFixed(4)),
  });

  const tokens = useMemo(() => {
    const list: Array<{ position: [number, number, number]; isA: boolean; label: string }> = [];
    for (let i = 0; i < countA; i++) {
      const [x, , z] = clampedCircleLayout(i, ISOTOPE_SAMPLE_SIZE, 2.4);
      list.push({ position: [x - 1.4, 0.3, z], isA: true, label: pair.labelA });
    }
    for (let i = 0; i < countB; i++) {
      const [x, , z] = clampedCircleLayout(countA + i, ISOTOPE_SAMPLE_SIZE, 2.4);
      list.push({ position: [x + 1.4, 0.3, z], isA: false, label: pair.labelB });
    }
    return list;
  }, [countA, countB, pair.labelA, pair.labelB]);

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Element tanlash"
      tools={ISOTOPE_TOOLS}
      placedCount={ISOTOPE_SAMPLE_SIZE}
      maxItems={ISOTOPE_SAMPLE_SIZE}
      onAddTool={addTool}
      onClearAll={() => setAbundanceA(pair.defaultAbundanceA)}
      groundRadius={5.5}
      infoExtra={
        <StatBlock>
          <StatRow label="Element" value={pair.elementLabel} highlight />
          <StatRow label={pair.labelA} value={`${pair.massA} · ${abundanceA.toFixed(1)}%`} />
          <StatRow label={pair.labelB} value={`${pair.massB} · ${(100 - abundanceA).toFixed(1)}%`} />
          <StatRow label="O'rtacha massa" value={avgMass.toFixed(4)} highlight />
        </StatBlock>
      }
      bottomBar={
        <RangeField
          label={`${pair.labelA} ulushi`}
          value={abundanceA}
          onChange={setAbundanceA}
          min={0}
          max={100}
          step={0.5}
          display={(v) => `${v.toFixed(1)}%`}
        />
      }
    >
      <group position={[0, 1.6, -0.5]} rotation={[0, 0, tilt]} scale={0.9}>
        <GltfModel url="/models/chemistry/scale-balance.glb" center targetSize={2.6} />
      </group>
      {tokens.map((t, i) => (
        <IsotopeToken key={i} position={t.position} isA={t.isA} label={t.label} />
      ))}
    </SandboxShell>
  );
}

// ===========================================================================
// 5. MOLEKULA SHAKLLARI — chemistry-molecule-shapes
// ===========================================================================

interface ShapeInfo {
  id: string;
  label: string;
  icon: string;
  model: string;
  angle: string;
  geometryName: string;
  example: string;
}

const SHAPES: ShapeInfo[] = [
  { id: 'bent', label: 'Burchakli (V)', icon: 'Waves', model: '/models/chemistry/molecule-bent.glb', angle: '104.5°', geometryName: 'Tetraedral elektron geometriya (2 yolg‘iz juft)', example: 'H₂O' },
  { id: 'linear', label: 'Chiziqli', icon: 'Ruler', model: '/models/chemistry/molecule-linear.glb', angle: '180°', geometryName: 'Chiziqli elektron geometriya', example: 'CO₂' },
  { id: 'tetrahedral', label: 'Tetraedral', icon: 'Box', model: '/models/chemistry/molecule-tetrahedral.glb', angle: '109.5°', geometryName: 'Tetraedral elektron geometriya', example: 'CH₄' },
];

const SHAPE_TOOLS: ToolDefinition[] = [
  ...SHAPES.map((s) => ({ id: s.id, label: s.label, icon: s.icon, description: `${s.example} — ${s.angle}` })),
  { id: 'toggle-compare', label: 'Barchasini taqqoslash', icon: 'Grid3x3', description: 'Uch shaklni yonma-yon ko‘rish' },
];

function MoleculeShapesLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [shapeId, setShapeId] = useState('bent');
  const [compare, setCompare] = useState(false);
  const shape = SHAPES.find((s) => s.id === shapeId) ?? SHAPES[0];

  const addTool = (toolId: string) => {
    if (toolId === 'toggle-compare') {
      setCompare((c) => !c);
      return;
    }
    if (SHAPES.some((s) => s.id === toolId)) setShapeId(toolId);
  };

  usePublishResult({
    mavzu: simulation.title,
    shakl: shape.label,
    'bog‘ burchagi': shape.angle,
    misol: shape.example,
    rejim: compare ? 'taqqoslash' : 'yakka',
  });

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="VSEPR shakllari"
      tools={SHAPE_TOOLS}
      placedCount={compare ? 3 : 1}
      maxItems={3}
      onAddTool={addTool}
      onClearAll={() => {
        setShapeId('bent');
        setCompare(false);
      }}
      groundRadius={5.5}
      infoExtra={
        <StatBlock>
          <StatRow label="Shakl" value={shape.label} highlight />
          <StatRow label="Bog' burchagi" value={shape.angle} />
          <StatRow label="Misol" value={shape.example} />
          <StatRow label="Elektron geometriya" value={shape.geometryName} />
        </StatBlock>
      }
      hint={compare ? "Uchtasi yonma-yon ko'rsatilmoqda" : "Taqqoslash tugmasini bosing"}
    >
      {!compare ? (
        <group position={[0, 1.3, 0]}>
          <GltfModel url={shape.model} center targetSize={2.2} />
          <Html position={[0, 1.6, 0]} center distanceFactor={9}>
            <div className="glass-panel rounded-lg px-2.5 py-1 text-[11px] text-emerald-200 whitespace-nowrap">
              {shape.label} &middot; {shape.angle}
            </div>
          </Html>
        </group>
      ) : (
        SHAPES.map((s, i) => {
          const [x, , z] = clampedCircleLayout(i, SHAPES.length, 3.2);
          return (
            <group key={s.id} position={[x, 1.1, z]}>
              <GltfModel url={s.model} center targetSize={1.5} />
              <Html position={[0, 1.2, 0]} center distanceFactor={9}>
                <div
                  className={`glass-panel rounded-lg px-2 py-1 text-[10px] whitespace-nowrap ${
                    s.id === shapeId ? 'text-amber-200 ring-1 ring-amber-400/60' : 'text-slate-300'
                  }`}
                >
                  {s.label} &middot; {s.angle}
                </div>
              </Html>
            </group>
          );
        })
      )}
    </SandboxShell>
  );
}

// ===========================================================================
// 6. pH SHKALASI — chemistry-ph-scale
// ===========================================================================

const PH_PRESETS: Array<{ id: string; label: string; icon: string; ph: number }> = [
  { id: 'lemon', label: 'Limon sharbati', icon: 'Droplet', ph: 2 },
  { id: 'vinegar', label: 'Sirka', icon: 'TestTube', ph: 3 },
  { id: 'water', label: 'Toza suv', icon: 'Droplets', ph: 7 },
  { id: 'soap', label: 'Sovun eritmasi', icon: 'Sparkles', ph: 10 },
  { id: 'ammonia', label: 'Ammiak', icon: 'Wind', ph: 12 },
];

const PH_TOOLS: ToolDefinition[] = PH_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
  icon: p.icon,
  description: `pH ≈ ${p.ph}`,
}));

function PhScaleLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [pH, setPH] = useState(7);

  const color = useMemo(() => pHToColor(pH), [pH]);
  const classification = classifyPH(pH);
  const hPlus = Math.pow(10, -pH);
  const ohMinus = Math.pow(10, pH - 14);

  const addTool = (toolId: string) => {
    const preset = PH_PRESETS.find((p) => p.id === toolId);
    if (preset) setPH(preset.ph);
  };

  usePublishResult({
    mavzu: simulation.title,
    pH: Number(pH.toFixed(1)),
    tasnif: classification,
    '[H+] mol/L': Number(hPlus.toExponential(2)),
    '[OH-] mol/L': Number(ohMinus.toExponential(2)),
  });

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Tayyor eritmalar"
      tools={PH_TOOLS}
      placedCount={3}
      maxItems={3}
      onAddTool={addTool}
      onClearAll={() => setPH(7)}
      groundRadius={5.5}
      infoExtra={
        <StatBlock>
          <StatRow label="pH" value={pH.toFixed(1)} highlight />
          <StatRow label="Tasnif" value={classification} />
          <StatRow label="[H⁺]" value={`${hPlus.toExponential(2)} mol/L`} />
          <StatRow label="[OH⁻]" value={`${ohMinus.toExponential(2)} mol/L`} />
        </StatBlock>
      }
      bottomBar={<RangeField label="pH" value={pH} onChange={setPH} min={0} max={14} step={0.1} display={(v) => v.toFixed(1)} />}
    >
      <group position={[-0.8, 0, 0]}>
        <FlaskGlass position={[0, 0, 0]} />
        <Liquid position={[0, 0, 0]} color={color} fillLevel={0.55} bubbleActivity={0.2} />
        <Bubbles position={[0, 0, 0]} active={false} color={color} />
      </group>

      <group position={[1.4, 0.3, 0.2]} scale={0.55}>
        <GltfModel url="/models/chemistry/ph-strip.glb" center targetSize={1.2} />
        <mesh position={[0, 1.1, 0]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      <group position={[2.4, 0.3, -0.3]} scale={0.55}>
        <GltfModel url="/models/chemistry/litmus-paper.glb" center targetSize={1.2} />
        <mesh position={[0, 1.1, 0]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <Html position={[0, 1.9, 0]} center distanceFactor={9}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] whitespace-nowrap" style={{ color: `#${color.getHexString()}` }}>
            pH {pH.toFixed(1)} &middot; {classification}
          </div>
        </Html>
      </group>
    </SandboxShell>
  );
}

// ===========================================================================
// 7. KISLOTA-ASOSLI ERITMALAR — chemistry-acid-base-solutions
// ===========================================================================

const ACID_BASE_TOOLS: ToolDefinition[] = [
  { id: 'acid-add', label: 'Kislota qo‘shish', icon: 'FlaskConical', description: '+0.1 mol kislota' },
  { id: 'base-add', label: 'Asos qo‘shish', icon: 'FlaskRound', description: '+0.1 mol asos' },
  { id: 'litmus-test', label: 'Litmus sinovi', icon: 'Ruler', description: 'Rangni tekshirish' },
];

const UNIT_MOL = 0.1;
const MAX_UNITS = 10;

function AcidBaseLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [acidUnits, setAcidUnits] = useState(0);
  const [baseUnits, setBaseUnits] = useState(0);
  const [tested, setTested] = useState(false);

  const netMol = (acidUnits - baseUnits) * UNIT_MOL;
  let pH: number;
  let classification: string;
  if (Math.abs(netMol) < 1e-9) {
    pH = 7;
    classification = 'Neytrallangan';
  } else if (netMol > 0) {
    pH = THREE.MathUtils.clamp(-Math.log10(netMol), 0, 7);
    classification = 'Kislotali';
  } else {
    const pOH = THREE.MathUtils.clamp(-Math.log10(-netMol), 0, 7);
    pH = 14 - pOH;
    classification = 'Ishqoriy (asosli)';
  }

  const color = useMemo(() => pHToColor(pH), [pH]);

  const addTool = (toolId: string) => {
    if (toolId === 'acid-add') setAcidUnits((u) => Math.min(MAX_UNITS, u + 1));
    else if (toolId === 'base-add') setBaseUnits((u) => Math.min(MAX_UNITS, u + 1));
    else if (toolId === 'litmus-test') setTested(true);
  };

  usePublishResult({
    mavzu: simulation.title,
    'kislota (mol)': Number((acidUnits * UNIT_MOL).toFixed(1)),
    'asos (mol)': Number((baseUnits * UNIT_MOL).toFixed(1)),
    pH: Number(pH.toFixed(1)),
    tasnif: classification,
  });

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Reagentlar"
      tools={ACID_BASE_TOOLS}
      placedCount={acidUnits + baseUnits}
      maxItems={MAX_UNITS * 2}
      onAddTool={addTool}
      onClearAll={() => {
        setAcidUnits(0);
        setBaseUnits(0);
        setTested(false);
      }}
      groundRadius={5.5}
      infoExtra={
        <StatBlock>
          <StatRow label="Kislota" value={`${(acidUnits * UNIT_MOL).toFixed(1)} mol`} />
          <StatRow label="Asos" value={`${(baseUnits * UNIT_MOL).toFixed(1)} mol`} />
          <StatRow label="pH" value={pH.toFixed(1)} highlight />
          <StatRow label="Tasnif" value={classification} />
        </StatBlock>
      }
      hint="Kislota va asosni teng miqdorda qo'shsangiz neytrallanadi"
    >
      <group position={[0, 0, 0]}>
        <FlaskGlass position={[0, 0, 0]} />
        <Liquid position={[0, 0, 0]} color={color} fillLevel={0.5} bubbleActivity={0.3} />
        <Bubbles position={[0, 0, 0]} active={acidUnits > 0 && baseUnits > 0} color={color} />
      </group>

      <group position={[-1.6, 0.6, 0.3]} rotation={[0, 0, -0.25]} scale={0.6}>
        <GltfModel url="/models/chemistry/acid-bottle.glb" center targetSize={1.3} />
      </group>
      <group position={[1.6, 0.6, 0.3]} rotation={[0, 0, 0.25]} scale={0.6}>
        <GltfModel url="/models/chemistry/base-bottle.glb" center targetSize={1.3} />
      </group>

      {tested && (
        <group position={[0, 1.9, 0]} scale={0.5}>
          <GltfModel url="/models/chemistry/litmus-paper.glb" center targetSize={1} />
          <Html position={[0, 0.8, 0]} center distanceFactor={9}>
            <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] whitespace-nowrap" style={{ color: `#${color.getHexString()}` }}>
              Litmus: pH {pH.toFixed(1)}
            </div>
          </Html>
        </group>
      )}
    </SandboxShell>
  );
}

// ===========================================================================
// 8. KONSENTRATSIYA — chemistry-concentration
// ===========================================================================

const CONCENTRATION_TOOLS: ToolDefinition[] = [
  { id: 'solute-add', label: "Erigan modda qo'shish", icon: 'Gem', description: '+0.2 mol' },
  { id: 'solute-remove', label: "Erigan moddani ayirish", icon: 'CircleDotDashed', description: '−0.2 mol' },
  { id: 'solvent-add', label: "Erituvchi qo'shish", icon: 'Droplets', description: '+0.2 L' },
  { id: 'solvent-remove', label: "Erituvchini ayirish", icon: 'Wind', description: '−0.2 L' },
];

const MAX_PARTICLES = 30;

function SoluteParticle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={0.22}>
      <GltfModel url="/models/chemistry/solute-particle.glb" center targetSize={1} castShadow={false} />
    </group>
  );
}

function ConcentrationLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [soluteMol, setSoluteMol] = useState(1);
  const [solventL, setSolventL] = useState(1);

  const concentration = soluteMol / solventL;
  const particleCount = Math.min(MAX_PARTICLES, Math.max(2, Math.round(concentration * 6)));

  const addTool = (toolId: string) => {
    if (toolId === 'solute-add') setSoluteMol((m) => Math.min(5, Number((m + 0.2).toFixed(2))));
    else if (toolId === 'solute-remove') setSoluteMol((m) => Math.max(0.2, Number((m - 0.2).toFixed(2))));
    else if (toolId === 'solvent-add') setSolventL((v) => Math.min(5, Number((v + 0.2).toFixed(2))));
    else if (toolId === 'solvent-remove') setSolventL((v) => Math.max(0.2, Number((v - 0.2).toFixed(2))));
  };

  usePublishResult({
    mavzu: simulation.title,
    "erigan modda (mol)": Number(soluteMol.toFixed(2)),
    "erituvchi hajmi (L)": Number(solventL.toFixed(2)),
    'konsentratsiya (mol/L)': Number(concentration.toFixed(3)),
  });

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => {
        const [x, , z] = fibonacciSpherePosition(i, particleCount, 0.42);
        return [x, 0.3 + z * 0.3, z * 0.5] as [number, number, number];
      }),
    [particleCount],
  );

  const fillLevel = THREE.MathUtils.clamp(0.25 + solventL * 0.12, 0.2, 0.8);

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Eritma tayyorlash"
      tools={CONCENTRATION_TOOLS}
      placedCount={particleCount}
      maxItems={MAX_PARTICLES}
      onAddTool={addTool}
      onClearAll={() => {
        setSoluteMol(1);
        setSolventL(1);
      }}
      groundRadius={5.5}
      infoExtra={
        <StatBlock>
          <StatRow label="Erigan modda" value={`${soluteMol.toFixed(2)} mol`} />
          <StatRow label="Erituvchi" value={`${solventL.toFixed(2)} L`} />
          <StatRow label="Konsentratsiya" value={`${concentration.toFixed(3)} mol/L`} highlight />
        </StatBlock>
      }
      bottomBar={
        <>
          <NumberField id="solute" label="Erigan modda (mol)" value={soluteMol} onChange={setSoluteMol} min={0.2} max={5} step={0.2} />
          <NumberField id="solvent" label="Erituvchi (L)" value={solventL} onChange={setSolventL} min={0.2} max={5} step={0.2} />
        </>
      }
    >
      <group position={[-1, 0, 0]} scale={1.1}>
        <FlaskGlass position={[0, 0, 0]} />
        <Liquid position={[0, 0, 0]} color={new THREE.Color('#38bdf8')} fillLevel={fillLevel} bubbleActivity={0.2} />
        <group position={[0, 0.3, 0]}>
          {particles.map((p, i) => (
            <SoluteParticle key={i} position={p} />
          ))}
        </group>
        <Html position={[0, 2, 0]} center distanceFactor={9}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] text-sky-200 whitespace-nowrap">
            {concentration.toFixed(2)} mol/L
          </div>
        </Html>
      </group>

      <group position={[1.8, 0, -0.2]} scale={0.7}>
        <GltfModel url="/models/chemistry/graduated-cylinder.glb" center targetSize={1.8} />
      </group>
      <group position={[2.8, 0, 0.6]} scale={0.6}>
        <GltfModel url="/models/chemistry/flask-erlenmeyer.glb" center targetSize={1.4} />
      </group>
    </SandboxShell>
  );
}

// ===========================================================================
// 9. ATOM MODELI (Bor modeli) — chemistry-atom-model
// ===========================================================================

const SHELL_CAPACITIES = [2, 8, 8, 2];

function bohrShells(totalElectrons: number): number[] {
  const shells: number[] = [];
  let remaining = totalElectrons;
  for (const cap of SHELL_CAPACITIES) {
    if (remaining <= 0) break;
    const take = Math.min(cap, remaining);
    shells.push(take);
    remaining -= take;
  }
  if (remaining > 0) shells.push(remaining);
  return shells;
}

const ATOM_MODEL_PRESETS: Array<{ id: string; label: string; icon: string; electrons: number }> = [
  { id: 'He', label: 'Geliy (He)', icon: 'CircleDot', electrons: 2 },
  { id: 'Ne', label: 'Neon (Ne)', icon: 'Hexagon', electrons: 10 },
  { id: 'Na', label: 'Natriy (Na)', icon: 'Gem', electrons: 11 },
  { id: 'Ar', label: 'Argon (Ar)', icon: 'Orbit', electrons: 18 },
];

const ATOM_MODEL_TOOLS: ToolDefinition[] = ATOM_MODEL_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
  icon: p.icon,
  description: `${p.electrons} elektron`,
}));

function ElectronShell({ shellIndex, electronCount }: { shellIndex: number; electronCount: number }) {
  const radius = 0.9 + shellIndex * 0.65;
  const speed = 0.5 / (shellIndex + 1);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * speed;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.008, 8, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
      </mesh>
      {Array.from({ length: electronCount }, (_, i) => {
        const angle = (i / electronCount) * Math.PI * 2;
        return (
          <mesh key={i} position={[radius * Math.cos(angle), 0, radius * Math.sin(angle)]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function AtomModelLab({ hand, simulation }: { hand: UseHandTrackingApi; simulation: Simulation }) {
  const [electrons, setElectrons] = useState(11);
  const shells = useMemo(() => bohrShells(electrons), [electrons]);

  const addTool = (toolId: string) => {
    const preset = ATOM_MODEL_PRESETS.find((p) => p.id === toolId);
    if (preset) setElectrons(preset.electrons);
  };

  usePublishResult({
    mavzu: simulation.title,
    'elektronlar soni': electrons,
    'qavatlar (energetik sathlar)': shells.length,
    konfiguratsiya: shells.join(', '),
  });

  return (
    <SandboxShell
      hand={hand}
      simulation={simulation}
      toolkitTitle="Element tanlash"
      tools={ATOM_MODEL_TOOLS}
      placedCount={electrons}
      maxItems={20}
      onAddTool={addTool}
      onClearAll={() => setElectrons(2)}
      groundRadius={5.5}
      cameraPosition={[0, 2.8, 7.5]}
      infoExtra={
        <StatBlock>
          <StatRow label="Elektronlar" value={String(electrons)} highlight />
          <StatRow label="Qavatlar soni" value={String(shells.length)} />
          <StatRow label="Konfiguratsiya" value={shells.join(', ')} />
        </StatBlock>
      }
      bottomBar={<NumberField id="electrons" label="Elektronlar soni" value={electrons} onChange={(v) => setElectrons(Math.round(v))} min={1} max={20} />}
    >
      <group position={[0, 1.4, 0]}>
        <group scale={0.5}>
          <GltfModel url="/models/chemistry/nucleus-core.glb" center targetSize={0.8} />
        </group>
        {shells.map((count, i) => (
          <ElectronShell key={i} shellIndex={i} electronCount={count} />
        ))}
        <Html position={[0, -2, 0]} center distanceFactor={10}>
          <div className="glass-panel rounded-lg px-2.5 py-1 text-[10.5px] text-emerald-200 whitespace-nowrap">
            Konfiguratsiya: {shells.join(' – ')}
          </div>
        </Html>
      </group>
    </SandboxShell>
  );
}

// ===========================================================================
// Mavzu -> komponent registri va asosiy eksport
// ===========================================================================

type TopicComponent = (props: { hand: UseHandTrackingApi; simulation: Simulation }) => ReactNode;

const TOPIC_COMPONENTS: Record<string, TopicComponent> = {
  'chemistry-build-a-nucleus': NucleusLab,
  'chemistry-build-a-molecule': MoleculeBuilderLab,
  'chemistry-atomic-interactions': AtomicInteractionLab,
  'chemistry-isotopes-and-mass': IsotopesMassLab,
  'chemistry-molecule-shapes': MoleculeShapesLab,
  'chemistry-ph-scale': PhScaleLab,
  'chemistry-acid-base-solutions': AcidBaseLab,
  'chemistry-concentration': ConcentrationLab,
  'chemistry-atom-model': AtomModelLab,
};

export default function ChemistrySandboxLab({ hand, simulation }: ChemistrySandboxLabProps) {
  const Topic = TOPIC_COMPONENTS[simulation.id];
  if (Topic) return <>{Topic({ hand, simulation })}</>;

  // Zaxira holat: katalogga mos kelmagan id uchun (amalda yuzaga kelmasligi kerak)
  return (
    <div className="relative w-full h-full flex items-center justify-center text-slate-400 text-sm">
      Bu mavzu uchun simulyatsiya topilmadi: {simulation.title}
    </div>
  );
}
