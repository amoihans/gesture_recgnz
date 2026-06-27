/**
 * useHandDetection — 加载 MediaPipe HandLandmarker 并通过 rAF 循环推理
 */

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { CONFIG } from "@/lib/config";
import type { HandResult, Landmark } from "@/types/gestures";

export type DetectionStatus = "idle" | "loading" | "ready" | "error";

export interface UseHandDetectionOptions {
  /** 模型 URL，默认 /hand_landmarker.task */
  modelUrl?: string;
  /** 同时检测的手数 */
  numHands?: number;
  /** 每隔多少帧推理一次（1 = 每帧） */
  processEveryNFrames?: number;
}

export interface UseHandDetectionResult {
  status: DetectionStatus;
  error: string | null;
  hands: HandResult[];
  lastTimestampMs: number;
}

interface NormalizedCategory {
  categoryName?: string;
}

interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

function normalizeResult(
  raw: HandLandmarkerResult,
  handednessFromVideo: "Left" | "Right" = "Right",
): HandResult[] {
  if (!raw?.landmarks || raw.landmarks.length === 0) return [];

  return raw.landmarks.map((lmList, i) => {
    const handednessEntry = raw.handedness?.[i]?.[0] as
      | NormalizedCategory
      | undefined;
    const rawName = handednessEntry?.categoryName ?? handednessFromVideo;
    // MediaPipe 给出的是从观察者角度看的手（"Left" = 屏幕中的左手），
    // 我们直接使用其类别名即可。
    const handedness: "Left" | "Right" =
      rawName === "Left" ? "Left" : "Right";

    const landmarks: Landmark[] = lmList.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
    }));

    let worldLandmarks: Landmark[] | undefined;
    const wl = (raw as unknown as {
      worldLandmarks?: NormalizedLandmark[][];
    }).worldLandmarks;
    if (wl && wl[i]) {
      worldLandmarks = wl[i].map((p) => ({ x: p.x, y: p.y, z: p.z }));
    }

    return { landmarks, handedness, worldLandmarks };
  });
}

export function useHandDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  options: UseHandDetectionOptions = {},
): UseHandDetectionResult {
  const {
    modelUrl = CONFIG.modelUrl,
    numHands = CONFIG.numHands,
    processEveryNFrames = CONFIG.processEveryNFrames,
  } = options;

  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hands, setHands] = useState<HandResult[]>([]);
  const [lastTimestampMs, setLastTimestampMs] = useState<number>(0);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);
  const activeRef = useRef<boolean>(active);

  // Keep latest active flag accessible inside rAF closure without re-creating loop.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        setStatus("loading");
        setError(null);

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands,
          minHandDetectionConfidence: CONFIG.minHandDetectionConfidence,
          minHandPresenceConfidence: CONFIG.minHandPresenceConfidence,
          minTrackingConfidence: CONFIG.minTrackingConfidence,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setStatus("ready");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus("error");
        setError(`模型加载失败：${msg}`);
      }
    }

    setup();

    return () => {
      cancelled = true;
      const lm = landmarkerRef.current;
      if (lm) {
        lm.close();
        landmarkerRef.current = null;
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setStatus("idle");
    };
  }, [modelUrl, numHands]);

  // rAF loop — depends on active flag, but body reads from refs.
  useEffect(() => {
    if (!active) return;

    const tick = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (
        activeRef.current &&
        video &&
        landmarker &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        document.visibilityState === "visible"
      ) {
        frameCounterRef.current += 1;
        if (frameCounterRef.current % processEveryNFrames === 0) {
          const ts = performance.now();
          // 必须严格单调递增；如有回退则微调
          const safeTs = ts > lastTsRef.current ? ts : lastTsRef.current + 1;
          lastTsRef.current = safeTs;
          try {
            const result = landmarker.detectForVideo(video, safeTs);
            const normalized = normalizeResult(result);
            setHands(normalized);
            setLastTimestampMs(safeTs);
          } catch (e) {
            // 单帧错误不影响循环
            // eslint-disable-next-line no-console
            console.warn("[hand-detection] frame error:", e);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, processEveryNFrames, videoRef]);

  return { status, error, hands, lastTimestampMs };
}