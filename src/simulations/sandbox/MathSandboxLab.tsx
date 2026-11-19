// src/simulations/sandbox/MathSandboxLab.tsx
// MATEMATIKA — sandbox mavzulari uchun mavzuga xos (topic-aware) 3D laboratoriyalar.
// `simulation.id` bo'yicha 9 ta sandbox mavzusining har biri o'ziga xos
// asbob-uskunalar, 3D sahna va (imkon qadar) haqiqiy formulaga asoslangan
// jonli hisob-kitob (usePublishResult) bilan ta'minlanadi — xuddi flagship
// simulyatsiyalar (MathPendulumLab, SolarSystemLab) kabi sifat darajasida.
//
// Fayl tartibi:
//  1) Umumiy UI yordamchilari (InfoCard, HintBar, ControlBar, SliderRow...)
//  2) Umumiy 3D yordamchi komponentlar (animatsiyali chiziq, vektor o'qi...)
//  3) Har bir mavzu uchun to'liq mustaqil Lab komponenti
//  4) `simulation.id` -> komponent registri va standart eksport

import { useFrame } from '@react-three/fiber';
import { Html, Trail } from '@react-three/drei';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Pause, Play, RotateCcw } from 'lucide-react';
import SceneCanvas from '../../components/SceneCanvas';
import HandControlledGroup from '../../components/HandControlledGroup';
import ToolkitPanel from '../../components/ToolkitPanel';
import GroundBoundary, { clampedRowLayout } from '../../components/GroundBoundary';
import GltfModel from '../../components/GltfModel';
import type { UseHandTrackingApi } from '../../hooks/useHandTracking';
import { usePublishResult } from '../../hooks/usePublishResult';
import type { PlacedTool, Simulation, ToolDefinition } from '../../types';

interface MathSandboxLabProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

const MATH_ACCENT = '#22d3ee';

// --------------------------------------------------------------------------
// 1) UMUMIY UI YORDAMCHILARI
// --------------------------------------------------------------------------

function TopicInfoCard({
  simulation,
  accent = MATH_ACCENT,
  children,
}: {
  simulation: Simulation;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <div className="absolute top-4 right-4 max-w-xs glass-panel rounded-2xl px-5 py-4 space-y-2 hidden xl:block">
      <h3 className="text-sm font-semibold" style={{ color: accent }}>
        {simulation.title}
      </h3>
      <p className="text-[11px] text-slate-400 leading-snug">{simulation.shortDescription}</p>
      {children}
    </div>
  );
}

function HintBar({ text }: { text: string }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-4 py-2 text-[11px] text-slate-300 max-w-xl text-center">
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

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = '',
  width = 'w-24',
  decimals = 2,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  width?: string;
  decimals?: number;
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
        className={`${width} accent-cyan-400`}
      />
      <span className="text-[11px] text-slate-300 font-mono w-14 text-right">
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </div>
  );
}

function PlayPauseButton({ running, onToggle }: { running: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/80 text-white hover:bg-cyan-500"
    >
      {running ? <Pause size={14} /> : <Play size={14} />}
      {running ? "To'xtatish" : 'Davom etish'}
    </button>
  );
}

function ResetButton({ onReset, label = 'Qayta' }: { onReset: () => void; label?: string }) {
  return (
    <button
      onClick={onReset}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60"
    >
      <RotateCcw size={13} /> {label}
    </button>
  );
}

function StatRow({ label, value, tone = 'text-slate-200' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3 text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${tone}`}>{value}</span>
    </div>
  );
}

// --------------------------------------------------------------------------
// 2) UMUMIY 3D YORDAMCHI KOMPONENTLAR
// --------------------------------------------------------------------------

/** Vaqt bo'yicha animatsiya qilinadigan nuqtalar chizig'i (masalan, to'lqin yoki
 * parvoz izi) uchun qayta ishlatiladigan THREE.Line generatori. */
function useAnimatedLine(maxPoints: number, color: string, opacity = 1) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geometry, material);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, opacity, maxPoints]);

  const setPoints = (points: THREE.Vector3[]) => {
    const geometry = lineObj.geometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const n = Math.min(points.length, maxPoints);
    for (let i = 0; i < n; i++) {
      positionAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
    }
    positionAttr.needsUpdate = true;
    geometry.setDrawRange(0, n);
  };

  return [lineObj, setPoints] as const;
}

/** Statik (faqat bog'liqlik o'zgarganda qayta hisoblanadigan) chiziq — ikki
 * nuqta orasidagi yoki ko'p nuqtali egri chiziqlar uchun. */
function StaticLine({ points, color, dashed = false, opacity = 0.9 }: { points: THREE.Vector3[]; color: string; dashed?: boolean; opacity?: number }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.1, gapSize: 0.07, transparent: true, opacity })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const l = new THREE.Line(geometry, material);
    if (dashed) l.computeLineDistances();
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`).join('|'), color, dashed, opacity]);

  return <primitive object={line} />;
}

/** arrow-vector.glb modeli local +Y bo'ylab (dastasi 0..0.78, uchi 0.78..1.0)
 * yo'nalgan. XY tekisligida istalgan burchak + uzunlikni ko'rsatish uchun
 * Z o'qi bo'yicha aylantiramiz va Y bo'ylab cho'zamiz. */
function PlaneVectorArrow({
  angleRad,
  length,
  color,
  label,
  origin = [0, 0, 0],
}: {
  angleRad: number;
  length: number;
  color: string;
  label?: string;
  origin?: [number, number, number];
}) {
  const rotZ = angleRad - Math.PI / 2;
  const safeLength = Math.max(length, 0.18);
  const tipX = origin[0] + length * Math.cos(angleRad);
  const tipY = origin[1] + length * Math.sin(angleRad);
  const tipZ = origin[2];

  return (
    <group position={origin}>
      <group rotation={[0, 0, rotZ]} scale={[1, safeLength, 1]}>
        <GltfModel url="/models/math/arrow-vector.glb" targetSize={1} castShadow={false} />
      </group>
      <mesh position={[tipX - origin[0], tipY - origin[1], tipZ - origin[2] + 0.02]}>
        <sphereGeometry args={[0.055, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
      </mesh>
      {label && (
        <Html position={[tipX - origin[0], tipY - origin[1] + 0.22, tipZ - origin[2]]} center distanceFactor={9}>
          <div className="glass-panel rounded-md px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap" style={{ color }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// --------------------------------------------------------------------------
// 3a) KEPLER QONUNLARI — elliptik orbita + maydonlar tengligi qonuni
// --------------------------------------------------------------------------

const KEPLER_RING_BASE_RATIO = 0.6066; // orbit-ellipse-ring.glb o'z nisbati (b0/a0)
const KEPLER_BASE_H = 1.55;

function KeplerPhysicsLoop({
  eccentricity,
  semiMajor,
  speed,
  running,
  onUpdate,
}: {
  eccentricity: number;
  semiMajor: number;
  speed: number;
  running: boolean;
  onUpdate: (theta: number, r: number, angularSpeed: number, arealVelocity: number) => void;
}) {
  const thetaRef = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const r = (semiMajor * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(thetaRef.current));
    const arealVelocity = KEPLER_BASE_H * Math.sqrt(semiMajor * (1 - eccentricity * eccentricity));
    const angularSpeed = arealVelocity / (r * r);
    if (running) {
      thetaRef.current += angularSpeed * speed * dt;
    }
    onUpdate(thetaRef.current, r, angularSpeed * speed, arealVelocity);
  });

  return null;
}

function KeplerLawsLab({ hand: _hand, simulation }: MathSandboxLabProps) {
  const [eccentricity, setEccentricity] = useState(0.5);
  const [semiMajor, setSemiMajor] = useState(1.9);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [theta, setTheta] = useState(0);
  const [radius, setRadius] = useState(semiMajor * (1 - eccentricity));
  const [angularSpeed, setAngularSpeed] = useState(0);
  const [arealVelocity, setArealVelocity] = useState(0);
  const [resetTick, setResetTick] = useState(0);

  const px = radius * Math.cos(theta);
  const py = radius * Math.sin(theta);
  const ringScaleY = Math.sqrt(1 - eccentricity * eccentricity) / KEPLER_RING_BASE_RATIO;
  const centerOffsetX = -semiMajor * eccentricity;
  const relativePeriod = Math.pow(semiMajor, 1.5);

  usePublishResult({
    mavzu: simulation.title,
    'ekssentriklik e': Number(eccentricity.toFixed(2)),
    "katta yarim o'q a": Number(semiMajor.toFixed(2)),
    'joriy radius r': Number(radius.toFixed(2)),
    'maydon tezligi r²·ω (doimiy)': Number(arealVelocity.toFixed(2)),
    'nisbiy davr T ∝ a^1.5': Number(relativePeriod.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.9, 5.4]} target={[0, 1.9, -0.6]} minDistance={3} maxDistance={12}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} y={-0.2} />
        <group position={[0, 1.9, -0.6]}>
          <KeplerPhysicsLoop
            key={resetTick}
            eccentricity={eccentricity}
            semiMajor={semiMajor}
            speed={speed}
            running={running}
            onUpdate={(t, r, w, h) => {
              setTheta(t);
              setRadius(r);
              setAngularSpeed(w);
              setArealVelocity(h);
            }}
          />
          <GltfModel url="/models/math/sun.glb" center targetSize={0.55} castShadow={false} />
          <pointLight color="#fff3d6" intensity={4.5} distance={14} decay={1.3} />
          <group position={[centerOffsetX, 0, -0.03]} scale={[1, ringScaleY, 1]}>
            <GltfModel url="/models/math/orbit-ellipse-ring.glb" center targetSize={2 * semiMajor} castShadow={false} />
          </group>
          <Trail width={1.3} length={7} color="#67e8f9" attenuation={(t) => t * t}>
            <group position={[px, py, 0.04]}>
              <GltfModel url="/models/math/planet-generic.glb" center targetSize={0.32} />
            </group>
          </Trail>
          <Html position={[px, py + 0.3, 0.04]} center distanceFactor={9}>
            <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-cyan-200 whitespace-nowrap">
              r &asymp; {radius.toFixed(2)}
            </div>
          </Html>
        </group>
      </SceneCanvas>

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="r (radius)" value={radius.toFixed(2)} />
          <StatRow label="ω (burchak tezligi)" value={`${angularSpeed.toFixed(2)} rad/s`} tone="text-emerald-300" />
          <StatRow label="r²·ω (doimiy)" value={arealVelocity.toFixed(2)} tone="text-amber-300" />
        </div>
      </TopicInfoCard>

      <HintBar text="Ekssentriklik oshganda orbita cho'ziladi — sayyora quyoshga yaqinlashganda (perigeliy) tezlashadi, bu Kepler ikkinchi qonuni (teng vaqtda teng maydon)." />

      <ControlBar>
        <PlayPauseButton running={running} onToggle={() => setRunning((r) => !r)} />
        <SliderRow label="Ekssentriklik e" value={eccentricity} min={0} max={0.85} step={0.01} onChange={setEccentricity} />
        <SliderRow label="Yarim o'q a" value={semiMajor} min={1.2} max={2.6} step={0.05} onChange={setSemiMajor} />
        <SliderRow label="Tezlik" value={speed} min={0.2} max={3} step={0.1} onChange={setSpeed} suffix="x" decimals={1} />
        <ResetButton onReset={() => setResetTick((t) => t + 1)} />
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3b) FOURIER: TO'LQINLARNI YARATISH — garmonikalarni qo'shish
// --------------------------------------------------------------------------

const FOURIER_HARMONICS = [1, 2, 3, 4];
const FOURIER_SAMPLES = 90;
const FOURIER_X_SPAN = 4.6;
const FOURIER_MAX_ACTIVE = 4;

const FOURIER_TOOLS: ToolDefinition[] = FOURIER_HARMONICS.map((n) => ({
  id: `harmonic-${n}`,
  label: n === 1 ? 'Asosiy to‘lqin (n=1)' : `${n}-garmonika (n=${n})`,
  icon: 'AudioWaveform',
  description: n === 1 ? 'Asosiy chastotali sinusoida' : `${n}x chastotali qo‘shimcha garmonika`,
}));

function FourierWaveLine({ amplitudes }: { amplitudes: Record<number, number> }) {
  const [lineObj, setPoints] = useAnimatedLine(FOURIER_SAMPLES, '#22d3ee', 0.95);
  const entries = useMemo(() => Object.entries(amplitudes).map(([n, a]) => ({ n: Number(n), a })), [amplitudes]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < FOURIER_SAMPLES; i++) {
      const x = -FOURIER_X_SPAN / 2 + (i / (FOURIER_SAMPLES - 1)) * FOURIER_X_SPAN;
      let y = 0;
      for (const { n, a } of entries) {
        y += a * Math.sin(n * x * 1.1 - n * t * 1.6);
      }
      pts.push(new THREE.Vector3(x, 1.55 + y * 0.45, 0.35));
    }
    setPoints(pts);
  });

  return <primitive object={lineObj} />;
}

function FourierWavesLab({ hand, simulation }: MathSandboxLabProps) {
  const [amplitudes, setAmplitudes] = useState<Record<number, number>>({ 1: 0.8 });

  const activeCount = Object.keys(amplitudes).length;

  const addHarmonic = (toolId: string) => {
    const n = Number(toolId.replace('harmonic-', ''));
    setAmplitudes((prev) => {
      if (prev[n] !== undefined || Object.keys(prev).length >= FOURIER_MAX_ACTIVE) return prev;
      return { ...prev, [n]: 0.6 };
    });
  };

  const setAmplitude = (n: number, value: number) => {
    setAmplitudes((prev) => ({ ...prev, [n]: value }));
  };

  const sortedActive = Object.entries(amplitudes)
    .map(([n, a]) => ({ n: Number(n), a }))
    .sort((p, q) => p.n - q.n);

  const peakApprox = sortedActive.reduce((sum, h) => sum + h.a, 0);

  usePublishResult({
    mavzu: simulation.title,
    'faol garmonikalar soni': activeCount,
    'taxminiy eng katta amplituda': Number(peakApprox.toFixed(2)),
    izoh: activeCount >= 3 ? "kvadrat to'lqinga yaqinlashmoqda" : 'asosiy sinusoida shakli',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.6, 6]} minDistance={3} maxDistance={12} target={[0, 1.5, 0]}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <HandControlledGroup hand={hand} autoRotate={false}>
          <group position={[-2.5, 0, -0.2]}>
            <GltfModel url="/models/math/wave-generator-machine.glb" targetSize={1.15} />
          </group>
          <group position={[2.3, 0, 0.1]}>
            <GltfModel url="/models/math/oscilloscope-panel.glb" targetSize={0.6} />
          </group>
          <FourierWaveLine amplitudes={amplitudes} />
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title="Garmonikalar"
        tools={FOURIER_TOOLS}
        accent={MATH_ACCENT}
        placedCount={activeCount}
        maxItems={FOURIER_MAX_ACTIVE}
        onAddTool={addHarmonic}
        onClearAll={() => setAmplitudes({})}
      />

      <TopicInfoCard simulation={simulation} />
      <HintBar text="Har bir garmonikaning amplitudasini sozlang — qancha ko'p garmonika qo'shilsa, yig'indi to'lqin shunchalik murakkab shaklga ega bo'ladi." />

      <ControlBar>
        {sortedActive.length === 0 && (
          <span className="text-[11px] text-slate-500">Chapdan garmonika tanlang</span>
        )}
        {sortedActive.map(({ n, a }) => (
          <SliderRow
            key={n}
            label={`A${n} (n=${n})`}
            value={a}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setAmplitude(n, v)}
          />
        ))}
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3c) VEKTORNI QO'SHISH — 2D vektor algebra
// --------------------------------------------------------------------------

interface SandboxVector {
  id: string;
  angleDeg: number;
  length: number;
}

const VECTOR_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24'];
const VECTOR_MAX = 4;
const VECTOR_TOOLS: ToolDefinition[] = [
  { id: 'vector', label: 'Vektor qo‘shish', icon: 'MoveUpRight', description: 'Yangi 2D vektor qo‘shadi' },
];

function VectorAdditionLab({ hand: _hand, simulation }: MathSandboxLabProps) {
  const [vectors, setVectors] = useState<SandboxVector[]>([
    { id: 'v0', angleDeg: 20, length: 1.4 },
    { id: 'v1', angleDeg: 110, length: 1.1 },
  ]);

  const addVector = () => {
    setVectors((prev) => {
      if (prev.length >= VECTOR_MAX) return prev;
      const angleDeg = (prev.length * 83 + 15) % 360;
      return [...prev, { id: `v${Date.now()}`, angleDeg, length: 1.2 }];
    });
  };

  const updateVector = (id: string, patch: Partial<SandboxVector>) => {
    setVectors((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const resultant = vectors.reduce(
    (acc, v) => {
      const rad = (v.angleDeg * Math.PI) / 180;
      return { x: acc.x + v.length * Math.cos(rad), y: acc.y + v.length * Math.sin(rad) };
    },
    { x: 0, y: 0 },
  );
  const resultantLength = Math.hypot(resultant.x, resultant.y);
  const resultantAngleDeg = (Math.atan2(resultant.y, resultant.x) * 180) / Math.PI;

  usePublishResult({
    mavzu: simulation.title,
    'vektorlar soni': vectors.length,
    '|R| natijaviy uzunlik': Number(resultantLength.toFixed(2)),
    'natijaviy burchak (°)': Number(resultantAngleDeg.toFixed(1)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.8, 5.6]} target={[0, 1.8, -0.9]} minDistance={3} maxDistance={11}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <group position={[0, 1.8, -1.25]}>
          <GltfModel url="/models/math/grid-plane.glb" center targetSize={4.4} castShadow={false} />
        </group>
        <group position={[0, 1.8, -0.9]}>
          {vectors.map((v, i) => (
            <PlaneVectorArrow
              key={v.id}
              angleRad={(v.angleDeg * Math.PI) / 180}
              length={v.length}
              color={VECTOR_COLORS[i % VECTOR_COLORS.length]}
              label={String.fromCharCode(65 + i)}
            />
          ))}
          {resultantLength > 0.05 && (
            <PlaneVectorArrow
              angleRad={Math.atan2(resultant.y, resultant.x)}
              length={resultantLength}
              color="#f87171"
              label="R"
            />
          )}
        </group>
      </SceneCanvas>

      <ToolkitPanel
        title="Vektor asboblari"
        tools={VECTOR_TOOLS}
        accent={MATH_ACCENT}
        placedCount={vectors.length}
        maxItems={VECTOR_MAX}
        onAddTool={addVector}
        onClearAll={() => setVectors([])}
      />

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="|R|" value={resultantLength.toFixed(2)} tone="text-rose-300" />
          <StatRow label="burchak" value={`${resultantAngleDeg.toFixed(1)}°`} tone="text-rose-300" />
        </div>
      </TopicInfoCard>

      <HintBar text="Har bir vektorning burchagi va uzunligini sozlang — qizil (R) ularning natijaviy (yig'indi) vektori." />

      <ControlBar>
        {vectors.map((v, i) => (
          <div key={v.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: `${VECTOR_COLORS[i % VECTOR_COLORS.length]}40` }}>
            <span className="text-[11px] font-semibold" style={{ color: VECTOR_COLORS[i % VECTOR_COLORS.length] }}>
              {String.fromCharCode(65 + i)}
            </span>
            <SliderRow label="∠" value={v.angleDeg} min={0} max={359} step={1} decimals={0} suffix="°" width="w-16" onChange={(val) => updateVector(v.id, { angleDeg: val })} />
            <SliderRow label="|v|" value={v.length} min={0.3} max={2.3} step={0.05} width="w-16" onChange={(val) => updateVector(v.id, { length: val })} />
          </div>
        ))}
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3d) REGRESSIYA CHIZIG'I — eng kichik kvadratlar usuli
// --------------------------------------------------------------------------

interface DataPoint {
  x: number;
  y: number;
}

const REGRESSION_MAX_POINTS = 10;
const REGRESSION_TOOLS: ToolDefinition[] = [
  { id: 'point', label: "Nuqta qo'shish", icon: 'CircleDot', description: "Tasodifiy sochilgan ma'lumot nuqtasi" },
];

function regressionFit(points: DataPoint[]) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) * (p.x - meanX);
  }
  const slope = den > 1e-6 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssTot += (p.y - meanY) * (p.y - meanY);
    ssRes += (p.y - predicted) * (p.y - predicted);
  }
  const r2 = ssTot > 1e-6 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

function RegressionLineLab({ hand: _hand, simulation }: MathSandboxLabProps) {
  const [trend, setTrend] = useState(0.8);
  const [noise, setNoise] = useState(0.7);
  const [points, setPoints] = useState<DataPoint[]>([]);

  const dataXAt = (index: number) => -4 + (index * 8) / (REGRESSION_MAX_POINTS - 1);

  const addPoint = () => {
    setPoints((prev) => {
      if (prev.length >= REGRESSION_MAX_POINTS) return prev;
      const x = dataXAt(prev.length);
      const y = trend * x + 0.3 + (Math.random() - 0.5) * 2 * noise;
      return [...prev, { x, y }];
    });
  };

  const reroll = () => {
    setPoints((prev) => prev.map((p) => ({ x: p.x, y: trend * p.x + 0.3 + (Math.random() - 0.5) * 2 * noise })));
  };

  const { slope, intercept, r2 } = useMemo(() => regressionFit(points), [points]);

  const toWorld = (p: DataPoint): [number, number, number] => [p.x * 0.3, 1.8 + p.y * 0.18, -0.95];
  const fitLinePoints = [
    new THREE.Vector3(...toWorld({ x: -4, y: slope * -4 + intercept })),
    new THREE.Vector3(...toWorld({ x: 4, y: slope * 4 + intercept })),
  ];

  usePublishResult({
    mavzu: simulation.title,
    'nuqtalar soni': points.length,
    'moyillik m': Number(slope.toFixed(2)),
    'kesish b': Number(intercept.toFixed(2)),
    'R² (moslik darajasi)': Number(r2.toFixed(2)),
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.8, 5.4]} target={[0, 1.8, -1]} minDistance={3} maxDistance={11}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <group position={[0, 0, -1.3]}>
          <GltfModel url="/models/math/graph-board.glb" targetSize={3.4} castShadow={false} />
        </group>
        {points.length >= 2 && <StaticLine points={fitLinePoints} color="#fbbf24" opacity={0.95} />}
        {points.map((p, i) => (
          <group key={i} position={toWorld(p)}>
            <GltfModel url="/models/math/data-point-marker.glb" center targetSize={0.16} castShadow={false} />
          </group>
        ))}
      </SceneCanvas>

      <ToolkitPanel
        title="Ma'lumot asboblari"
        tools={REGRESSION_TOOLS}
        accent={MATH_ACCENT}
        placedCount={points.length}
        maxItems={REGRESSION_MAX_POINTS}
        onAddTool={addPoint}
        onClearAll={() => setPoints([])}
      />

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="m (moyillik)" value={slope.toFixed(2)} tone="text-amber-300" />
          <StatRow label="b (kesish)" value={intercept.toFixed(2)} tone="text-amber-300" />
          <StatRow label="R²" value={r2.toFixed(2)} tone="text-emerald-300" />
        </div>
      </TopicInfoCard>

      <HintBar text="Nuqta qo'shing — sariq chiziq eng kichik kvadratlar usuli bo'yicha hisoblangan eng mos (regressiya) chiziqdir." />

      <ControlBar>
        <SliderRow label="Tendensiya" value={trend} min={-2} max={2} step={0.1} onChange={setTrend} />
        <SliderRow label="Shovqin" value={noise} min={0} max={2} step={0.1} onChange={setNoise} />
        <button
          onClick={reroll}
          disabled={points.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 disabled:opacity-30"
        >
          <RotateCcw size={13} /> Qayta tasodiylashtirish
        </button>
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3e) KVADRAT FUNKSIYA GRAFIGINI YASASH — y = ax² + bx + c
// --------------------------------------------------------------------------

function QuadraticGraphLab({ hand: _hand, simulation }: MathSandboxLabProps) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);

  const toWorld = (x: number, y: number): [number, number, number] => [x * 0.3, 1.8 + THREE.MathUtils.clamp(y, -8, 8) * 0.18, -0.95];

  const curvePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = -4 + (i / 100) * 8;
      const y = a * x * x + b * x + c;
      pts.push(new THREE.Vector3(...toWorld(x, y)));
    }
    return pts;
  }, [a, b, c]);

  const vertexX = Math.abs(a) > 1e-4 ? -b / (2 * a) : NaN;
  const vertexY = Math.abs(a) > 1e-4 ? c - (b * b) / (4 * a) : NaN;
  const discriminant = b * b - 4 * a * c;
  const hasRealRoots = Math.abs(a) > 1e-4 && discriminant >= 0;
  const root1 = hasRealRoots ? (-b + Math.sqrt(discriminant)) / (2 * a) : NaN;
  const root2 = hasRealRoots ? (-b - Math.sqrt(discriminant)) / (2 * a) : NaN;

  usePublishResult({
    mavzu: simulation.title,
    'a, b, c': `${a.toFixed(1)}, ${b.toFixed(1)}, ${c.toFixed(1)}`,
    'uchi nuqtasi (x₀,y₀)': Number.isNaN(vertexX) ? '—' : `${vertexX.toFixed(2)}, ${vertexY.toFixed(2)}`,
    'diskriminant D': Number(discriminant.toFixed(2)),
    ildizlar: hasRealRoots ? `${root1.toFixed(2)} ; ${root2.toFixed(2)}` : "haqiqiy ildiz yo'q",
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.8, 5.4]} target={[0, 1.8, -1]} minDistance={3} maxDistance={11}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <group position={[0, 0, -1.3]}>
          <GltfModel url="/models/math/graph-board.glb" targetSize={3.4} castShadow={false} />
        </group>
        <group position={[-2.1, 3.1, -0.9]}>
          <GltfModel url="/models/math/parabola-curve.glb" center targetSize={0.55} castShadow={false} />
        </group>
        <Html position={[-2.1, 3.55, -0.9]} center distanceFactor={11}>
          <div className="glass-panel rounded-md px-1.5 py-0.5 text-[9.5px] text-slate-400 whitespace-nowrap">
            namuna: y = x&sup2;
          </div>
        </Html>
        <StaticLine points={curvePoints} color="#22d3ee" opacity={0.95} />
        {hasRealRoots && (
          <>
            <group position={toWorld(root1, 0)}>
              <GltfModel url="/models/math/data-point-marker.glb" center targetSize={0.16} castShadow={false} />
            </group>
            <group position={toWorld(root2, 0)}>
              <GltfModel url="/models/math/data-point-marker.glb" center targetSize={0.16} castShadow={false} />
            </group>
          </>
        )}
      </SceneCanvas>

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="Uchi" value={Number.isNaN(vertexX) ? '—' : `(${vertexX.toFixed(2)}, ${vertexY.toFixed(2)})`} />
          <StatRow label="D" value={discriminant.toFixed(2)} />
          <StatRow label="Ildizlar" value={hasRealRoots ? `${root1.toFixed(2)}; ${root2.toFixed(2)}` : "yo'q"} tone="text-emerald-300" />
        </div>
      </TopicInfoCard>

      <HintBar text="a, b, c koeffitsientlarini o'zgartirib parabolaning shakli, uchi va ildizlarining qanday o'zgarishini kuzating." />

      <ControlBar>
        <SliderRow label="a" value={a} min={-2} max={2} step={0.1} onChange={setA} />
        <SliderRow label="b" value={b} min={-3} max={3} step={0.1} onChange={setB} />
        <SliderRow label="c" value={c} min={-3} max={3} step={0.1} onChange={setC} />
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3f) GORIZONTGA BURCHAK OSTIDA OTILGAN JISM HARAKATI — proyektil kinematikasi
// --------------------------------------------------------------------------

const PROJECTILE_G = 9.81;
const PROJECTILE_SCALE = 0.28;
const PROJECTILE_MAX_MARKERS = 3;
const LAUNCH_ORIGIN: [number, number, number] = [-2.6, 0.55, 0];

interface ShotParams {
  angleDeg: number;
  speed: number;
  key: number;
}

function ProjectileFlightLoop({
  shot,
  onUpdate,
}: {
  shot: ShotParams | null;
  onUpdate: (x: number, y: number, t: number, landed: boolean) => void;
}) {
  const tRef = useRef(0);

  useFrame((_, rawDt) => {
    if (!shot) return;
    const dt = Math.min(rawDt, 1 / 30);
    tRef.current += dt;
    const angleRad = (shot.angleDeg * Math.PI) / 180;
    const x = shot.speed * Math.cos(angleRad) * tRef.current;
    const y = shot.speed * Math.sin(angleRad) * tRef.current - 0.5 * PROJECTILE_G * tRef.current * tRef.current;
    if (y <= 0 && tRef.current > 0.08) {
      onUpdate(x, 0, tRef.current, true);
    } else {
      onUpdate(x, y, tRef.current, false);
    }
  });

  return null;
}

function ProjectileMotionLab({ hand, simulation }: MathSandboxLabProps) {
  const [angleDeg, setAngleDeg] = useState(45);
  const [speed, setSpeed] = useState(8);
  const [shot, setShot] = useState<ShotParams | null>(null);
  const [ballPos, setBallPos] = useState<{ x: number; y: number; t: number } | null>(null);
  const [markers, setMarkers] = useState<number[]>([]);
  const shotKeyRef = useRef(0);

  const fire = () => {
    shotKeyRef.current += 1;
    setShot({ angleDeg, speed, key: shotKeyRef.current });
    setBallPos({ x: 0, y: 0, t: 0 });
  };

  const handleUpdate = (x: number, y: number, t: number, landed: boolean) => {
    setBallPos({ x, y, t });
    if (landed) {
      setMarkers((prev) => [...prev.slice(-(PROJECTILE_MAX_MARKERS - 1)), x]);
      setShot(null);
    }
  };

  const angleRad = (angleDeg * Math.PI) / 180;
  const range = (speed * speed * Math.sin(2 * angleRad)) / PROJECTILE_G;
  const maxHeight = (speed * speed * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * PROJECTILE_G);
  const flightTime = (2 * speed * Math.sin(angleRad)) / PROJECTILE_G;

  const previewArc = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const totalT = flightTime;
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * totalT;
      const x = speed * Math.cos(angleRad) * t;
      const y = speed * Math.sin(angleRad) * t - 0.5 * PROJECTILE_G * t * t;
      pts.push(new THREE.Vector3(LAUNCH_ORIGIN[0] + x * PROJECTILE_SCALE, LAUNCH_ORIGIN[1] + Math.max(y, 0) * PROJECTILE_SCALE, 0));
    }
    return pts;
  }, [angleRad, speed, flightTime]);

  usePublishResult({
    mavzu: simulation.title,
    'uchish burchagi (°)': angleDeg,
    'boshlang‘ich tezlik (m/s)': speed,
    'masofa R (m)': Number(range.toFixed(2)),
    'balandlik H (m)': Number(maxHeight.toFixed(2)),
    'parvoz vaqti T (s)': Number(flightTime.toFixed(2)),
    holat: shot ? 'uchayapti' : 'joyida',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.4, 7.5]} target={[0.6, 0.6, 0]} minDistance={4} maxDistance={15}>
        <GroundBoundary radius={6} accent={MATH_ACCENT} />
        <HandControlledGroup hand={hand} autoRotate={false}>
          <group position={LAUNCH_ORIGIN} rotation={[0, Math.PI / 2, 0]}>
            <GltfModel url="/models/math/cannon.glb" targetSize={1.5} />
          </group>
          <StaticLine points={previewArc} color="#67e8f9" dashed opacity={0.55} />
          {ballPos && (
            <group position={[LAUNCH_ORIGIN[0] + ballPos.x * PROJECTILE_SCALE, LAUNCH_ORIGIN[1] + ballPos.y * PROJECTILE_SCALE, 0]}>
              <GltfModel url="/models/math/projectile-ball.glb" center targetSize={0.24} />
            </group>
          )}
          {markers.map((x, i) => (
            <group key={i} position={[LAUNCH_ORIGIN[0] + x * PROJECTILE_SCALE, 0.04, 0]}>
              <GltfModel url="/models/math/trajectory-marker.glb" center targetSize={0.2} castShadow={false} />
            </group>
          ))}
          <ProjectileFlightLoop shot={shot} onUpdate={handleUpdate} />
        </HandControlledGroup>
      </SceneCanvas>

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="R (masofa)" value={`${range.toFixed(2)} m`} tone="text-amber-300" />
          <StatRow label="H (balandlik)" value={`${maxHeight.toFixed(2)} m`} tone="text-amber-300" />
          <StatRow label="T (vaqt)" value={`${flightTime.toFixed(2)} s`} tone="text-amber-300" />
        </div>
        <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">
          R = v&sup2;&middot;sin(2&theta;) / g
        </p>
      </TopicInfoCard>

      <HintBar text="Burchak va tezlikni tanlab 'Otish' tugmasini bosing — ko'k chiziq oldindan hisoblangan traektoriyani ko'rsatadi." />

      <ControlBar>
        <SliderRow label="Burchak" value={angleDeg} min={10} max={80} step={1} decimals={0} suffix="°" onChange={setAngleDeg} />
        <SliderRow label="Tezlik" value={speed} min={4} max={12} step={0.5} suffix=" m/s" onChange={setSpeed} />
        <button
          onClick={fire}
          disabled={!!shot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/80 text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          <Play size={14} /> Otish
        </button>
        <ResetButton onReset={() => { setMarkers([]); setShot(null); setBallPos(null); }} label="Tozalash" />
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3g) PLINKO EHTIMOLI — binomial taqsimot
// --------------------------------------------------------------------------

const PLINKO_ROWS = 8;
const PLINKO_BINS = PLINKO_ROWS + 1; // 9
const PLINKO_MAX_CONCURRENT = 6;
const PLINKO_FALL_DURATION = 2.1;
const PLINKO_SPAWN_INTERVAL = 0.22;
const PLINKO_BOARD_WIDTH = 3.0;
const PLINKO_TOP_Y = 1.6;
const PLINKO_BOTTOM_Y = -1.6;

interface FallingBall {
  id: number;
  bounces: boolean[];
}

function binomialCoefficient(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return result;
}

function PlinkoEngine({
  balls,
  pendingRef,
  maxConcurrent,
  onSpawn,
  onLand,
}: {
  balls: FallingBall[];
  pendingRef: { current: number };
  maxConcurrent: number;
  onSpawn: () => void;
  onLand: (id: number, bin: number) => void;
}) {
  const groupRefs = useRef<Record<number, THREE.Group | null>>({});
  const spawnTimesRef = useRef<Record<number, number>>({});
  const landedRef = useRef<Set<number>>(new Set());
  const simTimeRef = useRef(0);
  const lastSpawnRef = useRef(-Infinity);

  useFrame((_, dt) => {
    simTimeRef.current += dt;
    const t = simTimeRef.current;

    if (pendingRef.current > 0 && balls.length < maxConcurrent && t - lastSpawnRef.current > PLINKO_SPAWN_INTERVAL) {
      lastSpawnRef.current = t;
      onSpawn();
    }

    balls.forEach((ball) => {
      if (spawnTimesRef.current[ball.id] === undefined) spawnTimesRef.current[ball.id] = t;
      const group = groupRefs.current[ball.id];
      if (!group || landedRef.current.has(ball.id)) return;

      const elapsed = t - spawnTimesRef.current[ball.id];
      const progress = THREE.MathUtils.clamp(elapsed / PLINKO_FALL_DURATION, 0, 1);
      const rowsDone = progress * PLINKO_ROWS;
      const fullRows = Math.min(Math.floor(rowsDone), PLINKO_ROWS);
      let xUnits = 0;
      for (let i = 0; i < fullRows; i++) xUnits += ball.bounces[i] ? 1 : -1;
      if (fullRows < PLINKO_ROWS) {
        xUnits += (ball.bounces[fullRows] ? 1 : -1) * (rowsDone - fullRows);
      }
      const x = xUnits * (PLINKO_BOARD_WIDTH / (PLINKO_ROWS * 2));
      const y = THREE.MathUtils.lerp(PLINKO_TOP_Y, PLINKO_BOTTOM_Y, progress);
      group.position.set(x, y, 0.08);

      if (progress >= 1) {
        landedRef.current.add(ball.id);
        const bin = ball.bounces.filter(Boolean).length;
        onLand(ball.id, bin);
      }
    });
  });

  return (
    <>
      {balls.map((ball) => (
        <group
          key={ball.id}
          ref={(el) => {
            groupRefs.current[ball.id] = el;
          }}
        >
          <GltfModel url="/models/math/plinko-ball.glb" center targetSize={0.16} castShadow={false} />
        </group>
      ))}
    </>
  );
}

function PlinkoProbabilityLab({ hand: _hand, simulation }: MathSandboxLabProps) {
  const [balls, setBalls] = useState<FallingBall[]>([]);
  const [binCounts, setBinCounts] = useState<number[]>(() => new Array(PLINKO_BINS).fill(0));
  const pendingRef = useRef(0);
  const nextIdRef = useRef(0);

  const dropBalls = (count: number) => {
    pendingRef.current += count;
  };

  const handleSpawn = () => {
    pendingRef.current -= 1;
    const bounces = Array.from({ length: PLINKO_ROWS }, () => Math.random() < 0.5);
    const id = nextIdRef.current++;
    setBalls((prev) => [...prev, { id, bounces }]);
  };

  const handleLand = (id: number, bin: number) => {
    setBalls((prev) => prev.filter((b) => b.id !== id));
    setBinCounts((prev) => {
      const next = [...prev];
      next[bin] += 1;
      return next;
    });
  };

  const clearAll = () => {
    pendingRef.current = 0;
    setBalls([]);
    setBinCounts(new Array(PLINKO_BINS).fill(0));
  };

  const totalLanded = binCounts.reduce((s, v) => s + v, 0);
  const maxCount = Math.max(1, ...binCounts);
  const centerBin = Math.floor(PLINKO_BINS / 2);
  const theoreticalCenterP = binomialCoefficient(PLINKO_ROWS, centerBin) / Math.pow(2, PLINKO_ROWS);
  const empiricalCenterP = totalLanded > 0 ? binCounts[centerBin] / totalLanded : 0;

  usePublishResult({
    mavzu: simulation.title,
    'tashlangan sharlar soni': totalLanded,
    'markaz katak ehtimoli (nazariy)': Number(theoreticalCenterP.toFixed(3)),
    'markaz katak ehtimoli (tajribada)': Number(empiricalCenterP.toFixed(3)),
    taqsimot: 'binomial(8; 0.5) ≈ normal',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.9, 5.6]} target={[0, 1.9, -0.4]} minDistance={3} maxDistance={11} orbitEnabled>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <group position={[0, 1.9, -0.6]}>
          <GltfModel url="/models/math/plinko-board.glb" center targetSize={4.2} castShadow={false} />
          <PlinkoEngine balls={balls} pendingRef={pendingRef} maxConcurrent={PLINKO_MAX_CONCURRENT} onSpawn={handleSpawn} onLand={handleLand} />
          {binCounts.map((count, i) => {
            const x = (i - (PLINKO_BINS - 1) / 2) * (PLINKO_BOARD_WIDTH / PLINKO_BINS);
            const barHeight = 0.08 + (count / maxCount) * 0.9;
            return (
              <group key={i} position={[x, PLINKO_BOTTOM_Y - 0.1, 0.1]}>
                <mesh position={[0, barHeight / 2, 0]}>
                  <boxGeometry args={[0.18, barHeight, 0.08]} />
                  <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.35} />
                </mesh>
                {count > 0 && (
                  <Html position={[0, barHeight + 0.14, 0]} center distanceFactor={10}>
                    <div className="text-[9.5px] text-cyan-200 font-mono">{count}</div>
                  </Html>
                )}
              </group>
            );
          })}
        </group>
      </SceneCanvas>

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="Jami sharlar" value={`${totalLanded}`} />
          <StatRow label="Markaz (nazariy)" value={theoreticalCenterP.toFixed(3)} tone="text-emerald-300" />
          <StatRow label="Markaz (tajriba)" value={empiricalCenterP.toFixed(3)} tone="text-amber-300" />
        </div>
      </TopicInfoCard>

      <HintBar text="Har bir sharcha har bir pegdan 50/50 ehtimol bilan chapga/o'ngga sinadi — ko'p shar tashlansa, histogramma normal taqsimotga yaqinlashadi." />

      <ControlBar>
        <button onClick={() => dropBalls(1)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/80 text-white hover:bg-cyan-500">
          1 shar tashlash
        </button>
        <button onClick={() => dropBalls(10)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/80 text-white hover:bg-violet-500">
          10 shar tashlash
        </button>
        <ResetButton onReset={clearAll} label="Tozalash" />
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3h) TRIGONOMETRIYAGA SAYOHAT — birlik aylana
// --------------------------------------------------------------------------

const TRIG_RADIUS = 1.3;

function TrigAutoRotateLoop({ running, onTick }: { running: boolean; onTick: (deltaDeg: number) => void }) {
  useFrame((_, dt) => {
    if (running) onTick(dt * 45);
  });
  return null;
}

function TrigTourLab({ hand: _hand, simulation }: MathSandboxLabProps) {
  const [angleDeg, setAngleDeg] = useState(40);
  const [autoRotate, setAutoRotate] = useState(false);

  const angleRad = (angleDeg * Math.PI) / 180;
  const sinValue = Math.sin(angleRad);
  const cosValue = Math.cos(angleRad);
  const tanDefined = Math.abs(cosValue) > 0.02;
  const tanValue = tanDefined ? sinValue / cosValue : NaN;

  const pointPos: [number, number, number] = [TRIG_RADIUS * cosValue, TRIG_RADIUS * sinValue, 0.03];
  const xProjection = [new THREE.Vector3(pointPos[0], pointPos[1], 0.03), new THREE.Vector3(pointPos[0], 0, 0.03)];
  const yProjection = [new THREE.Vector3(pointPos[0], pointPos[1], 0.03), new THREE.Vector3(0, pointPos[1], 0.03)];

  usePublishResult({
    mavzu: simulation.title,
    'burchak (°)': angleDeg,
    'burchak (rad)': Number(angleRad.toFixed(2)),
    'sin θ': Number(sinValue.toFixed(3)),
    'cos θ': Number(cosValue.toFixed(3)),
    'tan θ': tanDefined ? Number(tanValue.toFixed(3)) : "aniqlanmagan",
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 1.8, 5.4]} target={[0, 1.8, -0.6]} minDistance={3} maxDistance={11}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <TrigAutoRotateLoop running={autoRotate} onTick={(deltaDeg) => setAngleDeg((prev) => (prev + deltaDeg) % 360)} />
        <group position={[-2.1, 1.0, -0.3]}>
          <GltfModel url="/models/math/angle-indicator.glb" center targetSize={0.6} castShadow={false} />
        </group>
        <group position={[0, 1.8, -0.6]}>
          <group position={[0, 0, -0.03]}>
            <GltfModel url="/models/math/unit-circle-ring.glb" center targetSize={2.7} castShadow={false} />
          </group>
          <PlaneVectorArrow angleRad={angleRad} length={TRIG_RADIUS} color="#22d3ee" label="r" />
          <StaticLine points={xProjection} color="#f87171" dashed />
          <StaticLine points={yProjection} color="#4ade80" dashed />
          <group position={[pointPos[0], 0, pointPos[2]]}>
            <GltfModel url="/models/math/trajectory-marker.glb" center targetSize={0.12} castShadow={false} />
          </group>
          <group position={[0, pointPos[1], pointPos[2]]}>
            <GltfModel url="/models/math/trajectory-marker.glb" center targetSize={0.12} castShadow={false} />
          </group>
          <Html position={[pointPos[0], pointPos[1] + 0.22, pointPos[2]]} center distanceFactor={9}>
            <div className="glass-panel rounded-md px-1.5 py-0.5 text-[10px] text-cyan-200 whitespace-nowrap">
              ({cosValue.toFixed(2)}, {sinValue.toFixed(2)})
            </div>
          </Html>
        </group>
      </SceneCanvas>

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="sin θ" value={sinValue.toFixed(3)} tone="text-emerald-300" />
          <StatRow label="cos θ" value={cosValue.toFixed(3)} tone="text-rose-300" />
          <StatRow label="tan θ" value={tanDefined ? tanValue.toFixed(3) : "aniqlanmagan"} tone="text-amber-300" />
        </div>
      </TopicInfoCard>

      <HintBar text="Burchakni sozlang — qizil proyeksiya cos θ, yashil proyeksiya sin θ qiymatini ko'rsatadi." />

      <ControlBar>
        <PlayPauseButton running={autoRotate} onToggle={() => setAutoRotate((r) => !r)} />
        <SliderRow label="Burchak" value={angleDeg} min={0} max={360} step={1} decimals={0} suffix="°" onChange={setAngleDeg} width="w-32" />
      </ControlBar>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3i) MUVOZANATLASH — richag (moment) qonuni
// --------------------------------------------------------------------------

const LEVER_SLOTS = [0.5, 0.9, 1.3];
const LEVER_MAX_PER_SIDE = 3;
const LEVER_WEIGHT_MASS = 2; // kg, har bir vazn bloki
const LEVER_G = 9.81;
const LEVER_MAX_TILT = 0.26; // radian (~15°)

const BALANCING_TOOLS: ToolDefinition[] = [
  { id: 'left', label: 'Chap vazn (2kg)', icon: 'Scale', description: 'Richagning chap tomoniga vazn qo‘yadi' },
  { id: 'right', label: "O'ng vazn (2kg)", icon: 'Scale', description: "Richagning o'ng tomoniga vazn qo'yadi" },
];

function LeverTiltLoop({ targetAngle, onUpdate }: { targetAngle: number; onUpdate: (angle: number) => void }) {
  const angleRef = useRef(0);
  useFrame((_, dt) => {
    angleRef.current = THREE.MathUtils.lerp(angleRef.current, targetAngle, 1 - Math.exp(-dt * 4));
    onUpdate(angleRef.current);
  });
  return null;
}

function BalancingLab({ hand, simulation }: MathSandboxLabProps) {
  const [leftCount, setLeftCount] = useState(0);
  const [rightCount, setRightCount] = useState(0);
  const [tiltAngle, setTiltAngle] = useState(0);

  const addWeight = (side: string) => {
    if (side === 'left') setLeftCount((c) => Math.min(c + 1, LEVER_MAX_PER_SIDE));
    else setRightCount((c) => Math.min(c + 1, LEVER_MAX_PER_SIDE));
  };

  const clearAll = () => {
    setLeftCount(0);
    setRightCount(0);
  };

  const torqueLeft = LEVER_SLOTS.slice(0, leftCount).reduce((s, d) => s + LEVER_WEIGHT_MASS * LEVER_G * d, 0);
  const torqueRight = LEVER_SLOTS.slice(0, rightCount).reduce((s, d) => s + LEVER_WEIGHT_MASS * LEVER_G * d, 0);
  const netTorque = torqueRight - torqueLeft;
  const targetAngle = THREE.MathUtils.clamp(netTorque * 0.0022, -LEVER_MAX_TILT, LEVER_MAX_TILT);
  const status = Math.abs(netTorque) < 1.5 ? 'muvozanatda' : netTorque > 0 ? "o'ng tomon pastda" : 'chap tomon pastda';

  usePublishResult({
    mavzu: simulation.title,
    'chap moment (N·m)': Number(torqueLeft.toFixed(1)),
    "o'ng moment (N·m)": Number(torqueRight.toFixed(1)),
    'og‘ish burchagi (°)': Number(((tiltAngle * 180) / Math.PI).toFixed(1)),
    holat: status,
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[0, 2.2, 6]} target={[0, 1.6, 0]} minDistance={3} maxDistance={12}>
        <GroundBoundary radius={5} accent={MATH_ACCENT} />
        <LeverTiltLoop targetAngle={targetAngle} onUpdate={setTiltAngle} />
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.05}>
          <group position={[0, 0.635, 0]} rotation={[0, 0, tiltAngle]}>
            <group position={[0, -0.635, 0]}>
              <GltfModel url="/models/math/see-saw-beam.glb" targetSize={3.6} castShadow={false} />
            </group>
            {Array.from({ length: leftCount }).map((_, i) => (
              <group key={`l${i}`} position={[-LEVER_SLOTS[i], 0.2, 0]}>
                <GltfModel url="/models/math/weight-block-set.glb" center targetSize={0.45} />
              </group>
            ))}
            {Array.from({ length: rightCount }).map((_, i) => (
              <group key={`r${i}`} position={[LEVER_SLOTS[i], 0.2, 0]}>
                <GltfModel url="/models/math/weight-block-set.glb" center targetSize={0.45} />
              </group>
            ))}
          </group>
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title="Vazn asboblari"
        tools={BALANCING_TOOLS}
        accent={MATH_ACCENT}
        placedCount={leftCount + rightCount}
        maxItems={LEVER_MAX_PER_SIDE * 2}
        onAddTool={addWeight}
        onClearAll={clearAll}
      />

      <TopicInfoCard simulation={simulation}>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 space-y-1 mt-1">
          <StatRow label="Chap moment" value={`${torqueLeft.toFixed(1)} N·m`} />
          <StatRow label="O'ng moment" value={`${torqueRight.toFixed(1)} N·m`} />
          <StatRow label="Holat" value={status} tone={Math.abs(netTorque) < 1.5 ? 'text-emerald-300' : 'text-rose-300'} />
        </div>
        <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-700/50">M = m&middot;g&middot;d &mdash; richag (moment) qonuni</p>
      </TopicInfoCard>

      <HintBar text="Chap va o'ng tomonlarga vazn qo'shing — richag moment (massa &times; masofa) qonuni bo'yicha muvozanatlashadi." />
    </div>
  );
}

// --------------------------------------------------------------------------
// 3z) UMUMIY ZAHIRA (fallback) — kutilmagan/kelgusidagi sandbox id uchun
// --------------------------------------------------------------------------

const GENERIC_TOOLS: ToolDefinition[] = [
  { id: 'cube', label: 'Kub', icon: 'Box', description: 'Qirrali geometrik jism' },
  { id: 'sphere', label: 'Shar', icon: 'CircleDot', description: 'Aylana asosidagi fazoviy jism' },
  { id: 'cylinder', label: 'Silindr', icon: 'Shapes', description: 'Doiraviy asosli jism' },
  { id: 'cone', label: 'Konus', icon: 'Shapes', description: 'Uchburchak aylanishidan hosil bo‘lgan jism' },
  { id: 'axes', label: 'Koordinata o‘qlari', icon: 'Compass', description: 'X, Y, Z o‘qlari va katakli tekislik' },
  { id: 'ruler', label: 'Chizg‘ich', icon: 'Ruler', description: 'Jismlar orasidagi masofani o‘lchash' },
];

const GENERIC_GLASS_COLORS: Record<string, string> = {
  cube: '#22d3ee',
  sphere: '#a78bfa',
  cylinder: '#34d399',
  cone: '#fbbf24',
};

function genericGlassMaterial(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0,
    transmission: 1,
    thickness: 1.1,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
  });
}

function GenericShapeMesh({ toolId, position }: { toolId: string; position: [number, number, number] }) {
  const material = useMemo(() => genericGlassMaterial(GENERIC_GLASS_COLORS[toolId] ?? '#22d3ee'), [toolId]);
  return (
    <mesh position={position} castShadow material={material}>
      {toolId === 'cube' && <boxGeometry args={[1.1, 1.1, 1.1]} />}
      {toolId === 'sphere' && <sphereGeometry args={[0.65, 32, 32]} />}
      {toolId === 'cylinder' && <cylinderGeometry args={[0.55, 0.55, 1.2, 32]} />}
      {toolId === 'cone' && <coneGeometry args={[0.65, 1.3, 32]} />}
    </mesh>
  );
}

const GENERIC_GROUND_RADIUS = 6;
const GENERIC_MAX_SHAPES = 6;

function genericLayoutPosition(index: number, total: number): [number, number, number] {
  const [x] = clampedRowLayout(index, total, GENERIC_GROUND_RADIUS, 1.8);
  return [x, 0.65, 0];
}

function GenericMathSandboxLab({ hand, simulation }: MathSandboxLabProps) {
  const [placed, setPlaced] = useState<PlacedTool[]>([]);

  const shapeCount = placed.filter((p) => p.toolId !== 'axes' && p.toolId !== 'ruler').length;
  const hasAxes = placed.some((p) => p.toolId === 'axes');
  const hasRuler = placed.some((p) => p.toolId === 'ruler');

  const addTool = (toolId: string) => {
    if (toolId === 'axes' || toolId === 'ruler') {
      setPlaced((prev) => (prev.some((p) => p.toolId === toolId) ? prev : [...prev, { instanceId: toolId, toolId, position: [0, 0, 0] }]));
      return;
    }
    setPlaced((prev) => {
      const shapes = prev.filter((p) => p.toolId !== 'axes' && p.toolId !== 'ruler');
      if (shapes.length >= GENERIC_MAX_SHAPES) return prev;
      const others = prev.filter((p) => p.toolId === 'axes' || p.toolId === 'ruler');
      const nextShapes = [...shapes, { instanceId: `${toolId}-${Date.now()}-${Math.random()}`, toolId, position: [0, 0, 0] as [number, number, number] }];
      const repositioned = nextShapes.map((s, i) => ({ ...s, position: genericLayoutPosition(i, nextShapes.length) }));
      return [...others, ...repositioned];
    });
  };

  const shapes = placed.filter((p) => p.toolId !== 'axes' && p.toolId !== 'ruler');

  usePublishResult({
    mavzu: simulation.title,
    'jismlar soni': shapeCount,
    'koordinata o‘qlari': hasAxes ? 'yoqilgan' : "o'chirilgan",
    "o'lchov asbobi": hasRuler ? 'faol' : 'nofaol',
  });

  return (
    <div className="relative w-full h-full">
      <SceneCanvas cameraPosition={[4, 3.5, 6]} minDistance={3} maxDistance={13}>
        <GroundBoundary radius={GENERIC_GROUND_RADIUS} accent={MATH_ACCENT} />
        <HandControlledGroup hand={hand} autoRotate autoRotateSpeed={0.08}>
          {shapes.map((s) => (
            <GenericShapeMesh key={s.instanceId} toolId={s.toolId} position={s.position} />
          ))}
          {hasRuler && shapes.length >= 2 && (
            <StaticLine
              points={[new THREE.Vector3(...shapes[0].position), new THREE.Vector3(...shapes[shapes.length - 1].position)]}
              color="#fbbf24"
              dashed
            />
          )}
        </HandControlledGroup>
      </SceneCanvas>

      <ToolkitPanel
        title="Matematika asboblari"
        tools={GENERIC_TOOLS}
        accent={MATH_ACCENT}
        placedCount={shapeCount}
        maxItems={GENERIC_MAX_SHAPES}
        onAddTool={addTool}
        onClearAll={() => setPlaced([])}
      />

      <TopicInfoCard simulation={simulation} />
      <HintBar text="Chapdagi asboblardan foydalaning, qo'lni qisib (pinch) yoki sichqoncha bilan sahnani aylantiring." />
    </div>
  );
}

// --------------------------------------------------------------------------
// 4) `simulation.id` -> komponent REGISTRI
// --------------------------------------------------------------------------

const TOPIC_COMPONENTS: Record<string, (props: MathSandboxLabProps) => ReturnType<typeof GenericMathSandboxLab>> = {
  'math-kepler-laws': KeplerLawsLab,
  'math-fourier-waves': FourierWavesLab,
  'math-vector-addition': VectorAdditionLab,
  'math-regression-line': RegressionLineLab,
  'math-quadratic-graph': QuadraticGraphLab,
  'math-projectile-motion': ProjectileMotionLab,
  'math-plinko-probability': PlinkoProbabilityLab,
  'math-trig-tour': TrigTourLab,
  'math-balancing': BalancingLab,
};

export default function MathSandboxLab({ hand, simulation }: MathSandboxLabProps) {
  const TopicComponent = TOPIC_COMPONENTS[simulation.id] ?? GenericMathSandboxLab;
  return <TopicComponent hand={hand} simulation={simulation} />;
}
