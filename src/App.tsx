// src/App.tsx
// "Phazex 3D" bosh ilova komponenti. Ikki asosiy ko'rinish mavjud:
//  1) "dashboard" — PhET uslubidagi 40 ta mavzu katalogi (kartalar grid)
//  2) "workspace" — tanlangan mavzuning to'liq 3D ishchi oynasi (Orqaga tugmasi bilan)
// Har bir 3D simulyatsiya `React.lazy` orqali alohida bundle sifatida faqat
// kerak bo'lganda yuklanadi (code-splitting).

import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import Dashboard from './components/Dashboard';
import WorkspaceHeader from './components/WorkspaceHeader';
import WebcamPanel from './components/WebcamPanel';
import ResultsPanel from './components/ResultsPanel';
import { ResultProvider } from './context/ResultContext';
import { useHandTracking } from './hooks/useHandTracking';
import { getSimulationById } from './data/catalog';
import type { UseHandTrackingApi } from './hooks/useHandTracking';
import type { Simulation } from './types';

// --- Code-splitting: har bir simulyatsiya faqat tanlanganda yuklanadi ---
const MathPendulumLab = lazy(() => import('./simulations/MathPendulumLab'));
const SolarSystemLab = lazy(() => import('./simulations/SolarSystemLab'));
const ChemistryReactionLab = lazy(() => import('./simulations/ChemistryReactionLab'));
const GeneExpressionLab = lazy(() => import('./simulations/GeneExpressionLab'));
const MathSandboxLab = lazy(() => import('./simulations/sandbox/MathSandboxLab'));
const PhysicsSandboxLab = lazy(() => import('./simulations/sandbox/PhysicsSandboxLab'));
const ChemistrySandboxLab = lazy(() => import('./simulations/sandbox/ChemistrySandboxLab'));
const BiologySandboxLab = lazy(() => import('./simulations/sandbox/BiologySandboxLab'));

export interface SimulationComponentProps {
  hand: UseHandTrackingApi;
  simulation: Simulation;
}

type LazyComponent = ComponentType<SimulationComponentProps>;

// Flagship (chuqur ishlangan) simulyatsiyalar — mavzu id'si bo'yicha aniq moslashtirilgan
const FLAGSHIP_COMPONENTS: Record<string, LazyComponent> = {
  'math-pendulum': MathPendulumLab,
  'physics-solar-system': SolarSystemLab,
  'chemistry-balancing-equations': ChemistryReactionLab,
  'biology-gene-expression': GeneExpressionLab,
};

// Sandbox (umumiy asbob-uskunalar to'plami) simulyatsiyalar — fan bo'yicha
const SANDBOX_COMPONENTS: Record<string, LazyComponent> = {
  math: MathSandboxLab,
  physics: PhysicsSandboxLab,
  chemistry: ChemistrySandboxLab,
  biology: BiologySandboxLab,
};

function resolveComponent(simulation: Simulation): LazyComponent {
  if (simulation.kind === 'flagship' && FLAGSHIP_COMPONENTS[simulation.id]) {
    return FLAGSHIP_COMPONENTS[simulation.id];
  }
  return SANDBOX_COMPONENTS[simulation.subjectId];
}

function SimulationLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cyan-300">
      <Loader2 size={32} className="animate-spin" />
      <p className="text-xs text-slate-400">3D sahna yuklanmoqda...</p>
    </div>
  );
}

type View = 'dashboard' | 'workspace';

class SimulationBoundary extends Component<{children:ReactNode;onBack:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center"><h2 className="text-xl font-semibold">3D tajribani ochib bo‘lmadi</h2><p className="text-sm text-slate-400">Internet aloqasi va brauzerdagi WebGL sozlamalarini tekshiring.</p><button className="rounded-xl bg-violet-600 px-5 py-3" onClick={this.props.onBack}>Tajribalar ro‘yxatiga qaytish</button></div>:this.props.children;}
}

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const hand = useHandTracking();

  const handleSelect = (id: string) => {
    setActiveSimulationId(id);
    setView('workspace');
  };

  const handleBack = () => {
    setView('dashboard');
  };

  const resolved = activeSimulationId ? getSimulationById(activeSimulationId) : null;

  return (
    <ResultProvider>
      <div className="flex flex-col w-full h-screen overflow-hidden text-slate-100">
        {view === 'dashboard' && <Dashboard onSelectSimulation={handleSelect} />}

        {view === 'workspace' && resolved && (
          <>
            <WorkspaceHeader subject={resolved.subject} simulation={resolved.simulation} onBack={handleBack} />
            <main className="relative flex-1 min-h-0">
              <SimulationBoundary key={activeSimulationId} onBack={handleBack}><Suspense fallback={<SimulationLoader />}>
                {(() => {
                  const ActiveComponent = resolveComponent(resolved.simulation);
                  return <ActiveComponent hand={hand} simulation={resolved.simulation} />;
                })()}
              </Suspense></SimulationBoundary>

              <WebcamPanel hand={hand} />

              <button
                onClick={() => setIsResultsOpen(true)}
                className="absolute bottom-5 right-5 z-20 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium glass-panel text-cyan-300 hover:scale-[1.03] active:scale-95 transition-transform"
              >
                <ClipboardList size={16} />
                Natijalar
              </button>

              <ResultsPanel
                isOpen={isResultsOpen}
                onClose={() => setIsResultsOpen(false)}
                subjectId={resolved.subject.id}
                simulationId={resolved.simulation.id}
                simulationTitle={resolved.simulation.title}
              />
            </main>
          </>
        )}
      </div>
    </ResultProvider>
  );
}

export default App;
