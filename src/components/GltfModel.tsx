// src/components/GltfModel.tsx
// `public/models/` papkasidagi haqiqiy `.glb` assetlarni yuklash uchun
// umumiy komponent. `useGLTF` natijasini klonlab beradi — bitta model fayli
// sahnada bir nechta marta (masalan, bir nechta sayyora yoki rezistor)
// xavfsiz qayta ishlatilishi uchun.

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface GltfModelProps {
  /** public/models/... ostidagi yo'l, masalan "/models/physics/battery.glb" */
  url: string;
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** true bo'lsa, model geometriyasi markazlashtiriladi (bounding box markazi 0,0,0 ga tushadi) */
  center?: boolean;
  /** Berilsa, model avtomatik ravishda shu o'lchamga (eng katta o'qi bo'yicha) moslashtiriladi */
  targetSize?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export default function GltfModel({
  url,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  center = false,
  targetSize,
  castShadow = true,
  receiveShadow = false,
}: GltfModelProps) {
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const instance = scene.clone(true);
    const box = new THREE.Box3().setFromObject(instance);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const normalizeFactor = targetSize ? targetSize / maxDim : 1;
    instance.scale.multiplyScalar(normalizeFactor);

    if (center) {
      const centerPoint = box.getCenter(new THREE.Vector3()).multiplyScalar(normalizeFactor);
      instance.position.sub(centerPoint);
    }

    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
    return instance;
  }, [scene, center, targetSize, castShadow, receiveShadow]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

/** Model faylini oldindan keshga yuklab qo'yish (sahna ochilishida sakrashni kamaytirish uchun) */
export function preloadModel(url: string) {
  useGLTF.preload(url);
}
