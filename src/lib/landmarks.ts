/**
 * 21 个手部关键点的几何工具
 *
 * MediaPipe HandLandmarker 标准关键点编号：
 *   0: WRIST（腕）
 *   1-4: 拇指（CMC、MCP、IP、TIP）
 *   5-8: 食指（MCP、PIP、DIP、TIP）
 *   9-12: 中指
 *   13-16: 无名指
 *   17-20: 小指
 */

import type { Finger, Handedness, Landmark } from "@/types/gestures";

export type { Finger } from "@/types/gestures";

export const FINGER_TIPS: Record<Finger, number> = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
};

export const FINGER_PIP: Record<Finger, number> = {
  thumb: 3,
  index: 6,
  middle: 10,
  ring: 14,
  pinky: 18,
};

export const FINGER_MCP: Record<Finger, number> = {
  thumb: 2,
  index: 5,
  middle: 9,
  ring: 12,
  pinky: 17,
};

/** 腕关节 = 0，中指 MCP = 9（掌心中心） */
export const WRIST = 0;
export const PALM_CENTER = 9;

/**
 * 计算两点之间的欧氏距离（未归一化）
 */
export function rawDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * 掌长（腕 → 中指 MCP）作为归一化参考
 */
export function palmLength(lm: Landmark[]): number {
  return rawDistance(lm[WRIST], lm[PALM_CENTER]) || 1e-6;
}

/**
 * 用掌长归一化的两点距离
 */
export function distance(a: Landmark, b: Landmark, lm?: Landmark[]): number {
  const d = rawDistance(a, b);
  if (!lm) return d;
  return d / palmLength(lm);
}

/**
 * 三点构成的角度（度）
 * angle at b: angle(a, b, c)
 */
export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * 非拇指是否伸直
 *
 * 判定：指尖 y < PIP y（图像坐标 y 越小越靠上）即视为伸直。
 * 通过 z 偏移做容差，让手背/掌心略有偏转时仍能识别。
 */
export function isFingerExtended(
  lm: Landmark[],
  finger: Exclude<Finger, "thumb">,
): boolean {
  const tip = lm[FINGER_TIPS[finger]];
  const pip = lm[FINGER_PIP[finger]];
  // 伸直时 tip 应明显高于 pip；用 0.92 倍距离容差
  return tip.y < pip.y - 0.005 * Math.abs(tip.y - pip.y);
}

/**
 * 拇指是否伸直（基于左右手镜像）
 */
export function isThumbExtended(lm: Landmark[], handedness: Handedness): boolean {
  const tip = lm[FINGER_TIPS.thumb];
  const ip = lm[FINGER_PIP.thumb];
  // Right 手拇指伸直：tip x 远离 palm center（在 palm 右侧）
  // Left 手反向
  const palm = lm[PALM_CENTER];
  const tipOffset = tip.x - palm.x;
  const ipOffset = ip.x - palm.x;

  if (handedness === "Right") {
    // tip 应比 ip 更远离 palm
    return Math.abs(tipOffset) > Math.abs(ipOffset) && tipOffset > 0;
  }
  return Math.abs(tipOffset) > Math.abs(ipOffset) && tipOffset < 0;
}

/**
 * 五个手指的伸/屈状态
 */
export function fingerStates(
  lm: Landmark[],
  handedness: Handedness,
): Record<Finger, boolean> {
  return {
    thumb: isThumbExtended(lm, handedness),
    index: isFingerExtended(lm, "index"),
    middle: isFingerExtended(lm, "middle"),
    ring: isFingerExtended(lm, "ring"),
    pinky: isFingerExtended(lm, "pinky"),
  };
}

/**
 * 手部"朝上"判定（拇指尖 y < 腕 y）
 */
export function handPointingUp(lm: Landmark[]): boolean {
  return lm[FINGER_TIPS.thumb].y < lm[WRIST].y;
}

/**
 * 手部"朝下"判定
 */
export function handPointingDown(lm: Landmark[]): boolean {
  return lm[FINGER_TIPS.thumb].y > lm[WRIST].y;
}