// src/components/chemistry/GlassParts.tsx
// Kimyo simulyatsiyalari (flagship va sandbox) o'rtasida ulashiladigan
// protsessual 3D shisha idish, suyuqlik, pufakcha va aralashtirish tayoqchasi
// komponentlari. Ultra-realistik shisha effekti uchun `transmission: 1`,
// `roughness: 0.1`, `ior: 1.5` qiymatlari qo'llanilgan.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export function FlaskGlass({ position }: { position: [number, number, number] }) {
  // Kolba shaklini protsessual ravishda LatheGeometry orqali hosil qilamiz
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0.0, 0),
      new THREE.Vector2(0.55, 0),
      new THREE.Vector2(0.58, 0.1),
      new THREE.Vector2(0.4, 0.55),
      new THREE.Vector2(0.16, 0.95),
      new THREE.Vector2(0.16, 1.55),
      new THREE.Vector2(0.24, 1.6),
    ];
    return new THREE.LatheGeometry(points, 48);
  }, []);

  return (
    <mesh geometry={geometry} position={position} castShadow>
      <meshPhysicalMaterial
        color="#dff3ff"
        transparent
        opacity={0.22}
        roughness={0.1}
        metalness={0}
        transmission={1}
        thickness={0.4}
        ior={1.5}
        clearcoat={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function Liquid({
  position,
  color,
  fillLevel,
  bubbleActivity,
}: {
  position: [number, number, number];
  color: THREE.Color;
  fillLevel: number;
  bubbleActivity: number;
}) {
  const liquidRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(({ clock }) => {
    if (liquidRef.current) {
      const wobble = Math.sin(clock.elapsedTime * 3) * 0.015 * bubbleActivity;
      liquidRef.current.scale.y = 1 + wobble;
    }
    if (materialRef.current) {
      materialRef.current.color.lerp(color, 0.06);
    }
  });

  const height = 0.1 + fillLevel * 0.75;

  return (
    <mesh ref={liquidRef} position={[position[0], position[1] + height / 2 + 0.06, position[2]]}>
      <cylinderGeometry args={[0.5, 0.45, height, 32]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.85}
        roughness={0.15}
        transmission={0.3}
        thickness={0.6}
      />
    </mesh>
  );
}

export function Bubbles({
  position,
  active,
  color,
}: {
  position: [number, number, number];
  active: boolean;
  color: THREE.Color;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const count = 14;

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 0.6,
        z: (Math.random() - 0.5) * 0.6,
        speed: 0.4 + Math.random() * 0.6,
        offset: Math.random() * 10,
        scale: 0.03 + Math.random() * 0.05,
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.visible = active;
    if (!active) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const s = seeds[i];
      const y = (t * s.speed + s.offset) % 1.6;
      child.position.set(s.x, y, s.z);
      (child as THREE.Mesh).scale.setScalar(s.scale * (1 - y / 1.8));
    });
  });

  return (
    <group ref={groupRef} position={[position[0], position[1] + 0.1, position[2]]}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

const METAL_ROD = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 });

export function StirringRod({
  position,
  active,
}: {
  position: [number, number, number];
  active: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (active) {
      const t = clock.elapsedTime * 4;
      ref.current.position.x = position[0] + Math.cos(t) * 0.22;
      ref.current.position.z = position[2] + Math.sin(t) * 0.22;
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI * 0.03]} material={METAL_ROD}>
        <cylinderGeometry args={[0.025, 0.025, 1.8, 12]} />
      </mesh>
    </group>
  );
}

export function AlcoholLamp({ position, lit }: { position: [number, number, number]; lit: boolean }) {
  const flameRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!flameRef.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 12) * 0.12;
    flameRef.current.scale.set(s, 1 + Math.sin(clock.elapsedTime * 9) * 0.2, s);
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.26, 0.3, 24]} />
        <meshPhysicalMaterial color="#e2e8f0" transparent opacity={0.5} roughness={0.1} transmission={1} ior={1.5} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      {lit && (
        <>
          <mesh ref={flameRef} position={[0, 0.33, 0]}>
            <coneGeometry args={[0.05, 0.16, 12]} />
            <meshBasicMaterial color="#fb923c" transparent opacity={0.85} />
          </mesh>
          <pointLight position={[0, 0.35, 0]} color="#fb923c" intensity={1.2} distance={2} />
        </>
      )}
    </group>
  );
}
