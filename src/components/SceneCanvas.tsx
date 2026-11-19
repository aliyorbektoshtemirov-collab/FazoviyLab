// src/components/SceneCanvas.tsx
// Barcha 3D simulyatsiyalar uchun umumiy Canvas o'rami: yoritish, yulduzlar foni,
// va qo'l yo'q paytida ishlaydigan OrbitControls.

import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, Stars } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { Suspense, type ReactNode } from 'react';

interface SceneCanvasProps {
  children: ReactNode;
  orbitEnabled?: boolean;
  cameraPosition?: [number, number, number];
  showStars?: boolean;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  /** Orbit nazoratining aylanish markazi (odatda sahna "yer" sathidan sal yuqorida) */
  target?: [number, number, number];
  /** Kamera yer tekisligi ostiga tushib ketmasligi uchun maksimal qutb burchagi (radian) */
  maxPolarAngle?: number;
  minPolarAngle?: number;
}

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshBasicMaterial color="#22d3ee" wireframe />
    </mesh>
  );
}

export default function SceneCanvas({
  children,
  orbitEnabled = true,
  cameraPosition = [0, 2.5, 7],
  showStars = false,
  fov = 50,
  minDistance = 3,
  maxDistance = 20,
  target = [0, 0.6, 0],
  maxPolarAngle = 1.48,
  minPolarAngle = 0.12,
}: SceneCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: cameraPosition, fov }}
      gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
    >
      <color attach="background" args={[showStars ? '#030308' : '#303b59']} />
      {showStars && (
        <Stars radius={60} depth={30} count={2500} factor={2.5} fade speed={0.5} />
      )}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 8, 4]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-5, 4, -3]} intensity={8} color="#a599ff" />
      <hemisphereLight args={['#3b82f6', '#0b0f1f', 0.5]} />
      <Suspense fallback={<Loader />}>
        <Environment files="/environments/studio_small_03_1k.hdr" environmentIntensity={0.8} />
        {children}
      </Suspense>
      <OrbitControls
        enabled={orbitEnabled}
        enablePan={false}
        minDistance={minDistance}
        maxDistance={maxDistance}
        minPolarAngle={minPolarAngle}
        maxPolarAngle={maxPolarAngle}
        target={target}
        makeDefault
      />
    </Canvas>
  );
}
