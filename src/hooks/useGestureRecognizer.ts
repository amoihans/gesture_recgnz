/**
 * useGestureRecognizer — 把每帧关键点 → 稳定的 GesturePrediction
 *
 * 包含：
 *  1. 规则分类器
 *  2. 历史窗口 + 去抖
 *  3. 挥手运动检测（基于掌心中心水平方向反转）
 */

import { useEffect, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import { classifyGesture } from "@/lib/gestureClassifier";
import { debounceGesture, detectWave, createRingBuffer } from "@/lib/smoothing";
import { PALM_CENTER } from "@/lib/landmarks";
import type {
  GestureHistoryEntry,
  GestureName,
  GesturePrediction,
  HandResult,
} from "@/types/gestures";

export interface UseGestureRecognizerOptions {
  debounceMs?: number;
  historySize?: number;
  minConfidence?: number;
}

export interface UseGestureRecognizerResult {
  current: GesturePrediction | null;
  raw: GesturePrediction | null;
}

export function useGestureRecognizer(
  hands: HandResult[],
  options: UseGestureRecognizerOptions = {},
): UseGestureRecognizerResult {
  const {
    debounceMs = CONFIG.debounceMs,
    historySize = CONFIG.historySize,
    minConfidence = CONFIG.minConfidence,
  } = options;

  const [current, setCurrent] = useState<GesturePrediction | null>(null);
  const [raw, setRaw] = useState<GesturePrediction | null>(null);

  // 用稳定的 ref，不参与依赖数组
  const ringRef = useRef(createRingBuffer<GestureHistoryEntry>(historySize));
  const waveRingRef = useRef(
    createRingBuffer<{ x: number; ts: number }>(32),
  );
  const lastCurrentNameRef = useRef<GestureName | null>(null);
  const lastDetectionTsRef = useRef<number>(0);

  // 仅当 historySize 变化时重建（实际不会发生）
  useEffect(() => {
    ringRef.current = createRingBuffer<GestureHistoryEntry>(historySize);
    waveRingRef.current = createRingBuffer<{ x: number; ts: number }>(32);
    lastCurrentNameRef.current = null;
    setCurrent(null);
    setRaw(null);
  }, [historySize]);

  // 主 effect：依赖 hands 引用本身（每帧变化），不依赖动态表达式
  useEffect(() => {
    const ring = ringRef.current;
    const waveRing = waveRingRef.current;

    // 避免同帧多次触发
    const now = performance.now();
    if (now - lastDetectionTsRef.current < 8) return;
    lastDetectionTsRef.current = now;

    if (hands.length === 0) {
      setRaw(null);
      // 不清空 current，等待手势稳定消失（debounce 控制）
      return;
    }

    const hand = hands[0];
    let prediction = classifyGesture(hand);

    // 调试日志：每 ~30 帧打印一次分类结果
    if (import.meta.env.DEV && Math.random() < 0.03) {
      console.info(
        `[gesture] classify → ${prediction.name} (conf=${prediction.confidence.toFixed(2)}), ring size=${ring.toArray().length}`,
      );
    }

    // 挥手检测：仅当 classification 不是确定手势时才触发
    if (prediction.confidence < minConfidence || prediction.name === "unknown") {
      const palmX = hand.landmarks[PALM_CENTER]?.x ?? 0;
      waveRing.push({ x: palmX, ts: now });
      const { reversals, amplitude } = detectWave(
        waveRing.toArray(),
        CONFIG.wave.windowMs,
      );
      if (
        reversals >= CONFIG.wave.minReversals &&
        amplitude > CONFIG.wave.minAmplitude
      ) {
        prediction = {
          name: "wave",
          confidence: clamp01(0.7 + 0.25 * Math.min(amplitude / 0.15, 1)),
          hand,
        };
      }
    } else {
      // 识别到确定手势，重置 wave 缓冲
      waveRing.clear();
    }

    setRaw(prediction);

    // 把当前帧加入历史
    ring.push({ name: prediction.name, ts: now });

    const stableName = debounceGesture(ring.toArray(), debounceMs);

    // unknown 不提交；手势变化时更新 current
    if (
      stableName &&
      stableName !== "unknown" &&
      stableName !== lastCurrentNameRef.current
    ) {
      lastCurrentNameRef.current = stableName;
      setCurrent({
        name: stableName,
        confidence: prediction.confidence,
        hand: prediction.hand,
      });
    } else if (!stableName && lastCurrentNameRef.current !== null) {
      // 历史已失稳（说明手势变化或消失）
      // 等到 ring 内最后一项的时间距今超过 1.5x debounce 才清空
      const items = ring.toArray();
      const lastTs = items.length ? items[items.length - 1].ts : now;
      if (now - lastTs > debounceMs * 1.5) {
        lastCurrentNameRef.current = null;
        setCurrent(null);
      }
    }
  }, [hands, debounceMs, minConfidence]);

  return { current, raw };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}