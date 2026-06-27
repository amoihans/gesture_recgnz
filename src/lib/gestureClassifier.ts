/**
 * 手势分类器（核心算法）
 *
 * 纯函数：输入 21 关键点 + 左右手，输出 { name, confidence }
 * 基于几何规则的优先级匹配，无 ML 模型训练。
 */

import {
  angle,
  distance,
  FINGER_MCP,
  FINGER_PIP,
  FINGER_TIPS,
  fingerStates,
  handPointingDown,
  handPointingUp,
  palmLength,
} from "./landmarks";
import type { GesturePrediction, HandResult } from "@/types/gestures";

/** 拇指 IP 到小指 MCP 的距离阈值（归一化），用于判断"拇指弯向小指" */
const THUMB_TO_PINKY_MCP_DIST = 0.45;

/** 拇指尖到食指 tip 距离阈值（用于 ok_sign） */
const OK_FINGER_TOUCH_DIST = 0.32;

/** 食指与中指分开的距离下限（用于 victory） */
const VICTORY_FINGER_SPREAD = 1.1;

export function classifyGesture(hand: HandResult): GesturePrediction {
  const lm = hand.landmarks;
  if (lm.length < 21) {
    return { name: "unknown", confidence: 0 };
  }

  const states = fingerStates(lm, hand.handedness);
  const { thumb, index, middle, ring, pinky } = states;

  const noneExtended = !thumb && !index && !middle && !ring && !pinky;
  const allExtended = thumb && index && middle && ring && pinky;

  // === 优先级 1-2：thumb_up / thumb_down ===
  if (thumb && !index && !middle && !ring && !pinky) {
    if (handPointingUp(lm)) {
      return { name: "thumb_up", confidence: 0.9, hand };
    }
    if (handPointingDown(lm)) {
      return { name: "thumb_down", confidence: 0.9, hand };
    }
    // 拇指伸但方向不明 → 仍判为点赞（默认朝上）
    return { name: "thumb_up", confidence: 0.6, hand };
  }

  // === 优先级 3：ok_sign（拇指尖与食指尖相触 + 其余 3 指伸） ===
  if (middle && ring && pinky) {
    const okDist = distance(lm[FINGER_TIPS.thumb], lm[FINGER_TIPS.index], lm);
    if (okDist < OK_FINGER_TOUCH_DIST) {
      const conf = clamp01(0.95 - okDist / OK_FINGER_TOUCH_DIST);
      return { name: "ok_sign", confidence: conf, hand };
    }
  }

  // === 优先级 4：call（拇指 + 小指伸，拇指弯向小指） ===
  if (thumb && pinky && !index && !middle && !ring) {
    // 拇指尖靠近小指 MCP → 拇指弯过去
    const thumbToPinky = distance(
      lm[FINGER_TIPS.thumb],
      lm[FINGER_MCP.pinky],
      lm,
    );
    const thumbAngle = angle(
      lm[FINGER_MCP.thumb],
      lm[FINGER_PIP.thumb],
      lm[FINGER_TIPS.thumb],
    );
    if (thumbToPinky < THUMB_TO_PINKY_MCP_DIST || thumbAngle < 120) {
      return { name: "call", confidence: 0.85, hand };
    }
  }

  // === 优先级 5：iloveyou（拇指 + 食指 + 小指伸，中/无名屈） ===
  if (thumb && index && pinky && !middle && !ring) {
    // 食指与拇指应张开
    return { name: "iloveyou", confidence: 0.85, hand };
  }

  // === 优先级 6：victory（食指 + 中指伸且分开） ===
  if (index && middle && !thumb && !ring && !pinky) {
    const spread =
      distance(lm[FINGER_TIPS.index], lm[FINGER_TIPS.middle], lm) /
      Math.max(
        distance(lm[FINGER_MCP.index], lm[FINGER_MCP.middle], lm),
        1e-6,
      );
    if (spread > VICTORY_FINGER_SPREAD) {
      const conf = clamp01(0.7 + 0.2 * Math.min(spread - 1, 1));
      return { name: "victory", confidence: conf, hand };
    }
  }

  // === 优先级 7：pointing_up（仅食指伸） ===
  if (index && !thumb && !middle && !ring && !pinky) {
    const indexAngle = angle(
      lm[FINGER_MCP.index],
      lm[FINGER_PIP.index],
      lm[FINGER_TIPS.index],
    );
    // 食指伸直（角度接近 180°）
    if (indexAngle > 155) {
      const conf = clamp01(0.7 + 0.2 * ((indexAngle - 155) / 25));
      return { name: "pointing_up", confidence: conf, hand };
    }
  }

  // === 优先级 8：open_palm（5 指全伸） ===
  if (allExtended) {
    return { name: "open_palm", confidence: 0.9, hand };
  }

  // === 优先级 9：closed_fist（5 指全屈） ===
  if (noneExtended) {
    // 进一步检验：各指尖到腕的距离是否够近
    const palm = palmLength(lm);
    const tipsToWrist = [
      distance(lm[FINGER_TIPS.thumb], lm[0], lm),
      distance(lm[FINGER_TIPS.index], lm[0], lm),
      distance(lm[FINGER_TIPS.middle], lm[0], lm),
      distance(lm[FINGER_TIPS.ring], lm[0], lm),
      distance(lm[FINGER_TIPS.pinky], lm[0], lm),
    ].map((d) => d * palm);
    const maxTipDist = Math.max(...tipsToWrist);
    if (maxTipDist < palm * 1.6) {
      return { name: "closed_fist", confidence: 0.88, hand };
    }
    return { name: "unknown", confidence: 0.3, hand };
  }

  return { name: "unknown", confidence: 0.2, hand };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}