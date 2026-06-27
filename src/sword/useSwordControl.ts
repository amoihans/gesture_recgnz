/**
 * useSwordControl — 手势识别 → 剑系统控制命令
 *
 * 接收 useGestureRecognizer 的 current 输出，
 * 维护 SwordControlState，根据 current.name 应用命令。
 *
 * 重要：本 hook 内部维护可变状态（SwordControlState），通过 ref 而非 useState，
 * 避免每帧 setState 导致 React 重渲染。我们只对外暴露：
 *  - stateRef（每帧渲染读）
 *  - lastCommand（用 useState 在命令变化时通知 UI）
 */

import { useEffect, useRef, useState } from "react";
import type { GesturePrediction } from "@/types/gestures";
import {
  createSword,
  palmCenter,
  setSwordMode,
  spawnBurst,
  spawnSlash,
  spawnSparks,
  updateEffects,
  updateSword,
  fadeTrail,
} from "./swordPhysics";
import { DEFAULT_SWORD_POSITION } from "./swordPhysics";
import type {
  Sword,
  SwordControlState,
  SwordMode,
} from "./swordTypes";

interface Options {
  /** 手势识别结果（去抖后的稳定值） */
  current: GesturePrediction | null;
  /** 启动时是否启用剑阵模式 */
  initialArray?: boolean;
}

interface UseSwordControlResult {
  stateRef: React.RefObject<SwordControlState | null>;
  /** 最近一次手势命令（用 state 触发 UI 更新） */
  lastCommand: { mode: SwordMode; ts: number } | null;
  /** 剑阵模式 */
  arrayMode: boolean;
}

/** 手势 → SwordMode 映射（不含 toggle-array） */
const GESTURE_TO_MODE: Record<string, SwordMode> = {
  open_palm: "follow-palm",
  closed_fist: "embrace",
  pointing_up: "thrust",
  victory: "toggle-array", // 切换剑阵
  thumb_up: "dash",
  thumb_down: "recall",
  iloveyou: "slash",
  ok_sign: "burst",
  call: "sword-array", // 召唤剑阵（外部转 arrayMode）
  wave: "circle",
};

const ARRAY_COUNT = 12;

export function useSwordControl({
  current,
  initialArray = false,
}: Options): UseSwordControlResult {
  const stateRef = useRef<SwordControlState | null>(null);
  if (stateRef.current === null) {
    stateRef.current = createInitialState(initialArray);
  }
  const [lastCommand, setLastCommand] = useState<{
    mode: SwordMode;
    ts: number;
  } | null>(null);
  const [arrayMode, setArrayMode] = useState(initialArray);
  const lastGestureNameRef = useRef<string | null>(null);

  // 监听手势变化
  useEffect(() => {
    if (!current) return;
    const state = stateRef.current;
    if (!state) return;
    const now = performance.now();

    // 同一手势不重复触发
    if (lastGestureNameRef.current === current.name) return;
    lastGestureNameRef.current = current.name;

    const mapped = GESTURE_TO_MODE[current.name];
    if (!mapped) return;

    if (mapped === "toggle-array") {
      // 切换剑阵模式
      setArrayMode((prev) => {
        const next = !prev;
        state.arrayMode = next;
        // 重置所有剑到 idle/array
        if (next) {
          // 剑阵开启：所有剑回到默认位置，等待 array 接管
          for (const s of state.swords) {
            setSwordMode(s, "idle", now);
            s.position = { ...DEFAULT_SWORD_POSITION };
          }
        } else {
          // 关闭：所有剑回 idle
          for (const s of state.swords) {
            setSwordMode(s, "idle", now);
            s.position = { ...DEFAULT_SWORD_POSITION };
            s.velocity = { x: 0, y: 0 };
          }
        }
        return next;
      });
      setLastCommand({ mode: mapped, ts: now });
      return;
    }

    // 其他手势：应用到所有剑
    for (const s of state.swords) {
      setSwordMode(s, mapped, now);
    }

    // 攻击 / 爆发时附加特效
    if (mapped === "burst" && state.swords[0]) {
      const s = state.swords[0];
      spawnBurst(state, s.position.x, s.position.y);
      state.shake = 0.015;
    } else if (mapped === "slash" && state.swords[0]) {
      const s = state.swords[0];
      const ang = s.rotation + Math.PI / 2;
      spawnSlash(
        state,
        s.position.x,
        s.position.y,
        Math.cos(ang) * 1.4,
        Math.sin(ang) * 1.4,
      );
      state.shake = 0.012;
    } else if (mapped === "thrust" || mapped === "dash") {
      // 冲刺时洒火花
      for (const s of state.swords) spawnSparks(state, s, 3);
    }

    setLastCommand({ mode: mapped, ts: now });
  }, [current]);

  // 物理 update（hands 变化时同步，但渲染循环另起 rAF）
  // 我们把物理 update 放在 SwordCanvas 的 rAF 里（更高效）
  // 这里只暴露 stateRef

  return { stateRef, lastCommand, arrayMode };
}

/** 创建初始状态（同时在 arrayMode 开启时创建 12 把剑） */
function createInitialState(initialArray: boolean): SwordControlState {
  const swords: Sword[] = [];
  const count = initialArray ? ARRAY_COUNT : 1;
  for (let i = 0; i < count; i++) {
    swords.push(createSword(i));
  }
  return {
    swords,
    particles: [],
    bursts: [],
    slashes: [],
    arrayMode: initialArray,
    shake: 0,
    lastCommand: null,
  };
}

// 暴露给 SwordCanvas 使用
export { updateSword, updateEffects, fadeTrail, palmCenter, ARRAY_COUNT };
