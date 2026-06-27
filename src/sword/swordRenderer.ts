/**
 * 御剑术 — Canvas 2D 渲染
 *
 * 绘制内容：
 *  1) 拖尾（HSL 渐变线段）
 *  2) 剑本体（青色光刃 + 暗色剑柄 + 装饰光晕）
 *  3) 粒子（火花）
 *  4) 剑气（burst 圆环）
 *  5) 斩波（slash 推进半月）
 *
 * 所有坐标都是归一化的 (0..1)，渲染时映射到 canvas 像素。
 */

import type { Sword, SwordControlState } from "./swordTypes";

/** 剑的视觉尺寸（归一化单位；实际像素基于 canvas 高度） */
const SWORD_BLADE_LEN = 0.18; // 剑刃长度
const SWORD_BLADE_W = 0.018; // 剑刃宽度
const SWORD_HANDLE_LEN = 0.05;

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** 是否短高（用于将归一化 y 映射到短边） */
  shortSide: number;
}

function toPx(ctx: RenderContext, x: number, y: number) {
  return { x: x * ctx.width, y: y * ctx.height };
}

export function renderScene(state: SwordControlState, ctx: RenderContext) {
  const { ctx: c } = ctx;

  // 全屏震动偏移
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;
  c.save();
  c.translate(shakeX, shakeY);

  // 背景轻微虚化（让剑更突出）
  // 不实际画，只让后面的内容叠加

  // 1) 拖尾
  for (const sword of state.swords) {
    if (!sword.active) continue;
    renderTrail(ctx, sword);
  }

  // 2) 剑
  for (const sword of state.swords) {
    if (!sword.active) continue;
    renderSword(ctx, sword);
  }

  // 3) 粒子
  renderParticles(ctx, state);

  // 4) 剑气 burst
  renderBursts(ctx, state);

  // 5) 斩波 slash
  renderSlashes(ctx, state);

  c.restore();
}

function renderTrail(rc: RenderContext, sword: Sword) {
  if (sword.trail.length < 2) return;
  const { ctx: c } = rc;

  // 颜色由模式决定
  const baseHue = hueForMode(sword.mode);

  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";

  // 拖尾线段：从剑柄端到剑尖的反方向延伸
  // 用累积 path
  c.beginPath();
  for (let i = 0; i < sword.trail.length; i++) {
    const p = sword.trail[i];
    const { x, y } = toPx(rc, p.x, p.y);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.strokeStyle = `hsla(${baseHue}, 95%, 65%, 0.55)`;
  c.lineWidth = Math.max(2, rc.shortSide * 0.006);
  c.stroke();

  // 高亮内核
  c.beginPath();
  for (let i = 0; i < sword.trail.length; i++) {
    const p = sword.trail[i];
    const { x, y } = toPx(rc, p.x, p.y);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.strokeStyle = `hsla(${baseHue + 30}, 100%, 90%, 0.8)`;
  c.lineWidth = Math.max(1, rc.shortSide * 0.002);
  c.stroke();

  c.restore();
}

function renderSword(rc: RenderContext, sword: Sword) {
  const { ctx: c } = rc;
  const { x, y } = toPx(rc, sword.position.x, sword.position.y);
  const scale = rc.shortSide; // 剑的像素长度基于短边

  c.save();
  c.translate(x, y);
  c.rotate(sword.rotation);

  const bladeLen = SWORD_BLADE_LEN * scale;
  const bladeW = SWORD_BLADE_W * scale;
  const handleLen = SWORD_HANDLE_LEN * scale;
  const guardW = bladeW * 2.4;

  // === 剑刃 ===
  // 外光晕
  c.save();
  c.shadowColor = `hsl(${hueForMode(sword.mode)}, 100%, 70%)`;
  c.shadowBlur = 18;
  c.fillStyle = `hsl(${hueForMode(sword.mode)}, 95%, 75%)`;
  c.beginPath();
  c.moveTo(0, -bladeLen / 2);
  c.lineTo(bladeW / 2, bladeLen / 2 - bladeW);
  c.lineTo(0, bladeLen / 2);
  c.lineTo(-bladeW / 2, bladeLen / 2 - bladeW);
  c.closePath();
  c.fill();
  c.restore();

  // 内核（更亮、更窄）
  c.fillStyle = `hsl(${hueForMode(sword.mode) + 30}, 100%, 92%)`;
  c.beginPath();
  c.moveTo(0, -bladeLen / 2);
  c.lineTo(bladeW * 0.3, bladeLen / 2 - bladeW * 1.5);
  c.lineTo(0, bladeLen / 2);
  c.lineTo(-bladeW * 0.3, bladeLen / 2 - bladeW * 1.5);
  c.closePath();
  c.fill();

  // === 护手（横档） ===
  c.fillStyle = "#1f2937"; // 深灰
  c.fillRect(-guardW / 2, bladeLen / 2 - bladeW * 0.8, guardW, bladeW * 0.6);

  // 护手金色装饰
  c.fillStyle = "#facc15";
  c.fillRect(-guardW * 0.35, bladeLen / 2 - bladeW * 0.7, guardW * 0.7, bladeW * 0.2);

  // === 剑柄 ===
  c.fillStyle = "#3f3f46";
  c.fillRect(-bladeW * 0.4, bladeLen / 2 + bladeW * 0.1, bladeW * 0.8, handleLen);

  // 剑柄缠绳纹理
  c.strokeStyle = "#fbbf24";
  c.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const yy = bladeLen / 2 + bladeW * 0.2 + i * (handleLen / 5);
    c.beginPath();
    c.moveTo(-bladeW * 0.35, yy);
    c.lineTo(bladeW * 0.35, yy + handleLen / 8);
    c.stroke();
  }

  // === 剑首圆球 ===
  c.beginPath();
  c.fillStyle = "#fbbf24";
  c.arc(0, bladeLen / 2 + handleLen + bladeW * 0.5, bladeW * 0.8, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.fillStyle = "#fef3c7";
  c.arc(0, bladeLen / 2 + handleLen + bladeW * 0.5, bladeW * 0.4, 0, Math.PI * 2);
  c.fill();

  c.restore();
}

function renderParticles(rc: RenderContext, state: SwordControlState) {
  const { ctx: c } = rc;
  for (const p of state.particles) {
    const { x, y } = toPx(rc, p.x, p.y);
    c.beginPath();
    c.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`;
    c.arc(x, y, p.size, 0, Math.PI * 2);
    c.fill();
  }
}

function renderBursts(rc: RenderContext, state: SwordControlState) {
  const { ctx: c } = rc;
  for (const b of state.bursts) {
    const { x, y } = toPx(rc, b.x, b.y);
    const r = b.radius * rc.shortSide;
    c.beginPath();
    c.strokeStyle = `hsla(${200 - b.alpha * 40}, 95%, 70%, ${b.alpha})`;
    c.lineWidth = Math.max(2, rc.shortSide * 0.008);
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();

    // 第二圈（更细、更亮）
    c.beginPath();
    c.strokeStyle = `hsla(180, 100%, 90%, ${b.alpha * 0.6})`;
    c.lineWidth = Math.max(1, rc.shortSide * 0.003);
    c.arc(x, y, r * 0.7, 0, Math.PI * 2);
    c.stroke();
  }
}

function renderSlashes(rc: RenderContext, state: SwordControlState) {
  const { ctx: c } = rc;
  for (const s of state.slashes) {
    const { x, y } = toPx(rc, s.x, s.y);
    const r = s.radius * rc.shortSide;
    // 推进的弧形斩波
    c.save();
    const ang = Math.atan2(s.vy, s.vx);
    c.translate(x, y);
    c.rotate(ang);
    const grad = c.createLinearGradient(r * 0.5, 0, r * 2.5, 0);
    grad.addColorStop(0, `hsla(${s.hue}, 95%, 80%, ${s.alpha})`);
    grad.addColorStop(1, `hsla(${s.hue + 30}, 100%, 90%, 0)`);
    c.strokeStyle = grad;
    c.lineWidth = Math.max(3, rc.shortSide * 0.01);
    c.beginPath();
    c.arc(0, 0, r * 1.6, -0.5, 0.5);
    c.stroke();
    c.restore();
  }
}

/** 不同模式对应不同色相 */
function hueForMode(mode: Sword["mode"]): number {
  switch (mode) {
    case "slash":
      return 350; // 红
    case "burst":
      return 290; // 紫
    case "thrust":
    case "dash":
      return 200; // 蓝
    case "circle":
      return 320; // 品红
    case "sword-array":
    case "toggle-array":
      return 50; // 金
    case "embrace":
      return 30; // 橙
    case "recall":
      return 220; // 冷蓝
    default:
      return 185; // 默认青
  }
}