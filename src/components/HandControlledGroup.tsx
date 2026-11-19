// src/components/HandControlledGroup.tsx
// Qo'l harakati (pinch + drag) orqali 3D guruhni aylantirish uchun universal wrapper.
// Kamera o'chirilgan yoki qo'l topilmagan vaziyatda foydalanuvchi sichqoncha bilan
// OrbitControls orqali sahnani aylantira oladi (bu komponentda emas, Scene darajasida).

import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { HandTrackingState } from '../types';

interface HandControlledGroupProps {
  hand: Pick<HandTrackingState, 'isCameraOn' | 'isPinching' | 'delta'>;
  children: ReactNode;
  sensitivity?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export default function HandControlledGroup({
  hand,
  children,
  sensitivity = 2.4,
  autoRotate = true,
  autoRotateSpeed = 0.12,
}: HandControlledGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseRotation = useRef({ x: 0, y: 0 });
  const lastDelta = useRef({ x: 0, y: 0 });
  const wasPinching = useRef(false);

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group) return;

    const isHandDragging = hand.isCameraOn && hand.isPinching;

    if (isHandDragging) {
      if (!wasPinching.current) {
        baseRotation.current = { x: group.rotation.x, y: group.rotation.y };
      }
      group.rotation.y = baseRotation.current.y + hand.delta.x * sensitivity;
      group.rotation.x = THREE.MathUtils.clamp(
        baseRotation.current.x - hand.delta.y * sensitivity,
        -Math.PI / 2.2,
        Math.PI / 2.2,
      );
      lastDelta.current = hand.delta;
    } else if (autoRotate) {
      group.rotation.y += autoRotateSpeed * dt;
    }

    wasPinching.current = isHandDragging;
  });

  return <group ref={groupRef}>{children}</group>;
}
