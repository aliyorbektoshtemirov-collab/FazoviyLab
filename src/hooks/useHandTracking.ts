// src/hooks/useHandTracking.ts
// Veb-kamera orqali qo'l va barmoqlarni aniqlash (MediaPipe HandLandmarker).
// Bosh barmoq (4) va ko'rsatkich barmoq (8) uchlari orasidagi masofa orqali
// "pinch" (qisish) harakatini aniqlaymiz va uni 3D sahnani boshqarish uchun
// normallashtirilgan koordinatalarga aylantiramiz.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { HandTrackingState } from '../types';

const PINCH_THRESHOLD_ON = 0.055; // shu masofadan kichik bo'lsa -> pinch boshlanadi
const PINCH_THRESHOLD_OFF = 0.08; // shu masofadan katta bo'lsa -> pinch tugaydi (gisterezis)

const WASM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export interface UseHandTrackingApi extends HandTrackingState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  toggleCamera: () => void;
}

export function useHandTracking(): UseHandTrackingApi {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wasPinchingRef = useRef(false);
  const pinchOriginRef = useRef({ x: 0, y: 0 });

  const [state, setState] = useState<HandTrackingState>({
    isCameraOn: false,
    isLoading: false,
    isHandDetected: false,
    isPinching: false,
    pinchStrength: 1,
    pointer: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    error: null,
  });

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    wasPinchingRef.current = false;
    setState((prev) => ({
      ...prev,
      isCameraOn: false,
      isLoading: false,
      isHandDetected: false,
      isPinching: false,
      pinchStrength: 1,
      delta: { x: 0, y: 0 },
    }));
  }, [stopLoop]);

  const predictLoop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(predictLoop);
      return;
    }

    const result: HandLandmarkerResult = landmarker.detectForVideo(
      video,
      performance.now(),
    );

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];

      // Kamera oynasi ko'zguga o'xshab ko'rinishi uchun X o'qini aylantiramiz
      const pointerX = (1 - indexTip.x) * 2 - 1; // -1 .. 1
      const pointerY = -(indexTip.y * 2 - 1); // -1 .. 1 (Y teskari)

      const dx = thumbTip.x - indexTip.x;
      const dy = thumbTip.y - indexTip.y;
      const dz = thumbTip.z - indexTip.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      setState((prev) => {
        let isPinching = prev.isPinching;
        if (!isPinching && distance < PINCH_THRESHOLD_ON) {
          isPinching = true;
        } else if (isPinching && distance > PINCH_THRESHOLD_OFF) {
          isPinching = false;
        }

        if (isPinching && !wasPinchingRef.current) {
          pinchOriginRef.current = { x: pointerX, y: pointerY };
        }
        wasPinchingRef.current = isPinching;

        const delta = isPinching
          ? {
              x: pointerX - pinchOriginRef.current.x,
              y: pointerY - pinchOriginRef.current.y,
            }
          : { x: 0, y: 0 };

        const pinchStrength = Math.max(
          0,
          Math.min(1, (distance - PINCH_THRESHOLD_ON) / (PINCH_THRESHOLD_OFF - PINCH_THRESHOLD_ON)),
        );

        return {
          ...prev,
          isHandDetected: true,
          isPinching,
          pinchStrength,
          pointer: { x: pointerX, y: pointerY },
          delta,
        };
      });
    } else {
      wasPinchingRef.current = false;
      setState((prev) => ({
        ...prev,
        isHandDetected: false,
        isPinching: false,
        delta: { x: 0, y: 0 },
      }));
    }

    rafRef.current = requestAnimationFrame(predictLoop);
  }, []);

  const startCamera = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState((prev) => ({ ...prev, isCameraOn: true, isLoading: false }));
      rafRef.current = requestAnimationFrame(predictLoop);
    } catch (err) {
      console.error('Kamera ishga tushmadi:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isCameraOn: false,
        error:
          "Kameraga ulanib bo'lmadi. Brauzer ruxsatlarini tekshiring yoki qurilmada kamera mavjudligiga ishonch hosil qiling.",
      }));
    }
  }, [predictLoop]);

  const toggleCamera = useCallback(() => {
    if (state.isCameraOn) {
      stopCamera();
    } else {
      void startCamera();
    }
  }, [state.isCameraOn, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopLoop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      landmarkerRef.current?.close();
    };
  }, [stopLoop]);

  return { ...state, videoRef, toggleCamera };
}
