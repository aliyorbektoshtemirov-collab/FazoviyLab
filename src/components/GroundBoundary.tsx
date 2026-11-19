// src/components/GroundBoundary.tsx
// Barcha 3D sahnalar uchun umumiy "yer maydoni": qorong'u doiraviy asos +
// fan ranggida porlayotgan chegara halqasi. Bu foydalanuvchiga obyektlarni
// qaysi hudud ichida joylashtirish kerakligini vizual ravishda ko'rsatadi
// va sahna elementlari chegaradan tashqariga chiqib ketmasligini ta'minlashga
// yordam beradi (joylashtirish logikasi shu radius asosida hisoblanadi).

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GroundBoundaryProps {
  radius?: number;
  accent?: string;
  y?: number;
}

export default function GroundBoundary({ radius = 6, accent = '#22d3ee', y = 0 }: GroundBoundaryProps) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.35 + Math.sin(clock.elapsedTime * 1.2) * 0.12;
    }
  });

  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#070912" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[radius - 0.04, radius, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius - 0.4, radius - 0.34, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Berilgan radius ichida, elementlar soni ko'p bo'lsa ham chegaradan
 * chiqib ketmasligi uchun moslashuvchan qator (row) joylashuvini hisoblaydi. */
export function clampedRowLayout(index: number, total: number, radius: number, maxSpacing = 1.8): [number, number, number] {
  const usableWidth = radius * 1.5;
  const spacing = total > 1 ? Math.min(maxSpacing, usableWidth / (total - 1 || 1)) : 0;
  const x = (index - (total - 1) / 2) * spacing;
  return [THREE.MathUtils.clamp(x, -usableWidth / 2, usableWidth / 2), 0, 0];
}

/** Berilgan radius ichida obyektlarni aylana bo'ylab joylashtiradi. */
export function clampedCircleLayout(index: number, total: number, radius: number): [number, number, number] {
  const r = Math.min(radius * 0.6, 2.2);
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return [Math.cos(angle) * r, 0, Math.sin(angle) * r];
}
