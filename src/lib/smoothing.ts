/**
 * 手势去抖逻辑
 *
 * 思路：维护最近 N 帧的历史；当历史中所有项的 name 相同
 * 且时间跨度 ≥ debounceMs 时，认为手势已稳定。
 */

import type { GestureHistoryEntry, GestureName } from "@/types/gestures";

/**
 * 判断历史是否已收敛到同一手势
 */
export function debounceGesture(
  history: GestureHistoryEntry[],
  debounceMs: number,
): GestureName | null {
  if (history.length < 2) return null;

  const first = history[0];
  const last = history[history.length - 1];
  const span = last.ts - first.ts;

  if (span < debounceMs) return null;

  const allSame = history.every((h) => h.name === first.name);
  if (!allSame) return null;

  return first.name;
}

/**
 * 计算挥手运动的振荡强度
 *
 * @param xHistory 掌心中心的 x 坐标历史（按时间顺序）
 * @param windowMs 时间窗口
 * @returns [反转次数, 振幅]，振幅归一化到 [0, 1]
 */
export function detectWave(
  xHistory: { x: number; ts: number }[],
  windowMs: number,
): { reversals: number; amplitude: number } {
  if (xHistory.length < 3) return { reversals: 0, amplitude: 0 };

  const now = xHistory[xHistory.length - 1].ts;
  const recent = xHistory.filter((p) => now - p.ts <= windowMs);
  if (recent.length < 3) return { reversals: 0, amplitude: 0 };

  // 计算方向反转次数
  let reversals = 0;
  let lastDir = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i].x - recent[i - 1].x;
    if (Math.abs(diff) < 0.002) continue;
    const dir = diff > 0 ? 1 : -1;
    if (lastDir !== 0 && dir !== lastDir) reversals++;
    lastDir = dir;
  }

  // 振幅 = max - min
  const xs = recent.map((p) => p.x);
  const amplitude = Math.max(...xs) - Math.min(...xs);

  return { reversals, amplitude };
}

/**
 * 维护固定长度的环形缓冲
 */
export interface RingBuffer<T> {
  push: (item: T) => void;
  clear: () => void;
  toArray: () => T[];
  readonly length: number;
}

export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
  const buf: T[] = [];
  return {
    push(item: T) {
      buf.push(item);
      if (buf.length > capacity) buf.shift();
    },
    clear() {
      buf.length = 0;
    },
    toArray() {
      return buf.slice();
    },
    get length() {
      return buf.length;
    },
  };
}