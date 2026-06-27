/**
 * SwordCanvas — 全屏 Canvas 渲染层
 *
 * 放在 HomePage 之外，固定定位覆盖整个视口。
 * z-index 高于视频但不影响 UI 交互（pointer-events: none）。
 *
 * 内含 rAF 循环：物理 update + render。
 */

import { useEffect, useRef } from "react";
import { renderScene } from "./swordRenderer";
import {
  fadeTrail,
  palmCenter,
  updateEffects,
  updateSword,
  ARRAY_COUNT,
} from "./swordPhysics";
import type { SwordControlState } from "./swordTypes";
import type { HandResult } from "@/types/gestures";

interface Props {
  stateRef: React.RefObject<SwordControlState | null>;
  hands: HandResult[];
  arrayMode: boolean;
}

export function SwordCanvas({ stateRef, hands, arrayMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsRef = useRef<HandResult[]>(hands);
  const arrayRef = useRef<boolean>(arrayMode);

  // 同步 props 到 ref，避免 rAF effect 重建
  handsRef.current = hands;
  arrayRef.current = arrayMode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastTs = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 1 / 30);
      lastTs = ts;
      const state = stateRef.current;
      if (!state) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const hand = palmCenter(handsRef.current);
      const array = arrayRef.current || state.arrayMode;

      // 同步剑的数量与 arrayMode
      if (array && state.swords.length !== ARRAY_COUNT) {
        for (let i = state.swords.length; i < ARRAY_COUNT; i++) {
          state.swords.push({
            id: i,
            position: { x: 0.5, y: 0.5 },
            velocity: { x: 0, y: 0 },
            rotation: Math.PI / 2,
            angularVelocity: 0,
            mode: "idle",
            modeStartedAt: ts,
            trail: [],
            payload: {},
            active: true,
          });
        }
      } else if (!array && state.swords.length > 1) {
        state.swords.length = 1;
      }

      // 物理 update
      for (let i = 0; i < state.swords.length; i++) {
        updateSword(state.swords[i], dt, ts, hand, array, i, state.swords.length);
        fadeTrail(state.swords[i], dt);
      }
      updateEffects(state, dt);

      // 屏幕震动衰减
      state.shake *= Math.pow(0.85, dt * 60);
      if (state.shake < 0.0005) state.shake = 0;

      // === 渲染 ===
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      renderScene(state, {
        ctx,
        width: w,
        height: h,
        shortSide: Math.min(w, h),
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [stateRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30"
      aria-hidden
    />
  );
}