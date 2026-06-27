/**
 * 御剑术物理状态机
 *
 * 每个 sword 都有自己的 mode 和位置 / 速度 / 角度。
 * updateSword 每帧调用一次，根据当前模式应用不同的运动规则。
 */

import type {
  Sword,
  SwordMode,
  Vec2,
  SwordControlState,
} from "./swordTypes";

const TAU = Math.PI * 2;
const TWO_PI = TAU;

export const SCREEN_CENTER: Vec2 = { x: 0.5, y: 0.5 };
export const DEFAULT_SWORD_POSITION: Vec2 = { x: 0.5, y: 0.3 };
export const ARRAY_COUNT = 12;
const TRAIL_MAX_LEN = 24;

/** 限制向量在屏幕范围内（带 padding） */
function clampToScreen(pos: Vec2, pad = 0.06): Vec2 {
  return {
    x: Math.max(pad, Math.min(1 - pad, pos.x)),
    y: Math.max(pad, Math.min(1 - pad, pos.y)),
  };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 创建一把剑（默认 idle 状态）
 */
export function createSword(id: number, position?: Vec2): Sword {
  return {
    id,
    position: position ?? { ...DEFAULT_SWORD_POSITION },
    velocity: { x: 0, y: 0 },
    rotation: Math.PI / 2, // 默认朝下（剑尖向下）
    angularVelocity: 0,
    mode: "idle",
    modeStartedAt: performance.now(),
    trail: [],
    payload: {},
    active: true,
  };
}

/**
 * 应用手势切换模式（不重置位置，仅更新 mode 和启动时间）
 */
export function setSwordMode(sword: Sword, mode: SwordMode, now: number) {
  if (sword.mode === mode) return;
  sword.mode = mode;
  sword.modeStartedAt = now;
  sword.payload = {};
  // 切到攻击模式时给予一个初速度
  if (mode === "thrust" || mode === "slash") {
    const angle = sword.rotation + Math.PI / 2;
    const speed = 0.6;
    sword.velocity.x += Math.cos(angle) * speed;
    sword.velocity.y += Math.sin(angle) * speed;
  }
}

/**
 * 更新单把剑的位置/速度/角度，根据 mode 应用规则
 *
 * @param sword 要更新的剑
 * @param dtSec 帧间秒数
 * @param now 当前时间戳
 * @param hand 手部中心（用于 follow-palm / embrace），归一化坐标
 * @param arrayMode 是否剑阵模式
 * @param index 当前剑在数组中的下标
 * @param total 剑总数
 */
export function updateSword(
  sword: Sword,
  dtSec: number,
  now: number,
  hand: Vec2 | null,
  arrayMode: boolean,
  index: number,
  total: number,
) {
  const dt = Math.min(dtSec, 1 / 30); // 上限 30 fps
  const damp = Math.pow(0.92, dt * 60); // 速度阻尼
  const angDamp = Math.pow(0.94, dt * 60);

  // === 剑阵模式覆盖：所有剑绕中心旋转 ===
  if (arrayMode) {
    const orbitRadius = 0.25 + (index % 3) * 0.04;
    const baseAngle = (index / total) * TWO_PI + (now / 1500);
    const target = {
      x: 0.5 + Math.cos(baseAngle) * orbitRadius,
      y: 0.5 + Math.sin(baseAngle) * orbitRadius,
    };
    sword.position.x = lerp(sword.position.x, target.x, 0.12);
    sword.position.y = lerp(sword.position.y, target.y, 0.12);
    // 剑尖朝向圆心方向
    const dx = 0.5 - sword.position.x;
    const dy = 0.5 - sword.position.y;
    sword.rotation = lerp(sword.rotation, Math.atan2(dy, dx) + Math.PI / 2, 0.2);
    sword.velocity.x *= damp;
    sword.velocity.y *= damp;
    pushTrail(sword, now);
    return;
  }

  switch (sword.mode) {
    case "idle": {
      // 缓慢漂移 + 微旋转
      sword.velocity.x *= damp;
      sword.velocity.y *= damp;
      sword.position.x += sword.velocity.x * dt;
      sword.position.y += sword.velocity.y * dt;
      sword.angularVelocity *= angDamp;
      sword.rotation += sword.angularVelocity * dt;
      // 边界反弹
      bounceAtBorder(sword);
      break;
    }

    case "follow-palm": {
      if (hand) {
        const target = clampToScreen(hand);
        sword.position.x = lerp(sword.position.x, target.x, 0.18);
        sword.position.y = lerp(sword.position.y, target.y, 0.18);
        // 剑尖略微朝下
        const targetRot = Math.PI / 2 + Math.sin(now / 400) * 0.1;
        sword.rotation = lerp(sword.rotation, targetRot, 0.15);
      }
      sword.velocity.x *= damp;
      sword.velocity.y *= damp;
      break;
    }

    case "embrace": {
      // 剑环绕拳头做椭圆轨迹
      if (hand) {
        const t = (now - sword.modeStartedAt) / 600;
        const radius = 0.08;
        const target = {
          x: hand.x + Math.cos(t) * radius,
          y: hand.y + Math.sin(t * 1.3) * radius * 0.6,
        };
        sword.position.x = lerp(sword.position.x, target.x, 0.25);
        sword.position.y = lerp(sword.position.y, target.y, 0.25);
        // 剑尖指向拳头
        const dx = hand.x - sword.position.x;
        const dy = hand.y - sword.position.y;
        sword.rotation = lerp(sword.rotation, Math.atan2(dy, dx) + Math.PI / 2, 0.3);
      }
      break;
    }

    case "thrust": {
      // 沿当前方向持续冲刺
      sword.position.x += sword.velocity.x * dt;
      sword.position.y += sword.velocity.y * dt;
      sword.velocity.x *= 0.985;
      sword.velocity.y *= 0.985;
      // 出界则回到默认位置
      if (
        sword.position.x < -0.1 ||
        sword.position.x > 1.1 ||
        sword.position.y < -0.1 ||
        sword.position.y > 1.1
      ) {
        sword.position.x = DEFAULT_SWORD_POSITION.x;
        sword.position.y = DEFAULT_SWORD_POSITION.y;
        sword.velocity.x = 0;
        sword.velocity.y = 0;
        sword.mode = "idle";
        sword.modeStartedAt = now;
      }
      break;
    }

    case "dash": {
      sword.position.x += sword.velocity.x * dt;
      sword.position.y += sword.velocity.y * dt;
      sword.velocity.x *= 0.97;
      sword.velocity.y *= 0.97;
      // 1.2s 后回到 idle
      if (now - sword.modeStartedAt > 1200) {
        sword.mode = "idle";
        sword.modeStartedAt = now;
      }
      bounceAtBorder(sword, 0.02);
      break;
    }

    case "recall": {
      const target = { ...DEFAULT_SWORD_POSITION };
      sword.position.x = lerp(sword.position.x, target.x, 0.06);
      sword.position.y = lerp(sword.position.y, target.y, 0.06);
      sword.velocity.x *= damp;
      sword.velocity.y *= damp;
      sword.rotation = lerp(sword.rotation, Math.PI / 2, 0.1);
      if (dist(sword.position, target) < 0.01) {
        sword.mode = "idle";
        sword.modeStartedAt = now;
      }
      break;
    }

    case "slash": {
      // 0-0.4s 准备, 0.4-0.7s 横斩, 0.7s 后回 idle
      const phase = (now - sword.modeStartedAt) / 1000;
      if (phase < 0.4) {
        // 蓄力：剑小幅振动
        sword.rotation += Math.sin(now / 30) * 0.05;
        sword.velocity.x *= damp;
        sword.velocity.y *= damp;
      } else if (phase < 0.7) {
        // 横斩：剑高速旋转 180°
        sword.rotation += Math.PI * dt * 4;
        sword.position.x += sword.velocity.x * dt;
        sword.position.y += sword.velocity.y * dt;
        sword.velocity.x *= 0.95;
        sword.velocity.y *= 0.95;
      } else {
        sword.mode = "idle";
        sword.modeStartedAt = now;
      }
      break;
    }

    case "burst": {
      // OK 手势：剑原地高速旋转，逐渐放慢
      const t = (now - sword.modeStartedAt) / 1000;
      sword.rotation += dt * (8 - t * 4);
      sword.velocity.x *= damp;
      sword.velocity.y *= damp;
      if (t > 2) {
        sword.mode = "idle";
        sword.modeStartedAt = now;
      }
      break;
    }

    case "circle": {
      // 挥手：剑绕屏幕中心扫一圈
      const t = (now - sword.modeStartedAt) / 1500;
      if (t < 1) {
        const angle = t * TWO_PI;
        sword.position.x = 0.5 + Math.cos(angle) * 0.35;
        sword.position.y = 0.5 + Math.sin(angle) * 0.35;
        sword.rotation = angle + Math.PI / 2;
      } else {
        sword.mode = "idle";
        sword.modeStartedAt = now;
      }
      break;
    }

    case "toggle-array":
    case "sword-array":
      // 这两个模式由 arrayMode 在外层处理；这里走 idle 兜底
      sword.velocity.x *= damp;
      sword.velocity.y *= damp;
      sword.position.x += sword.velocity.x * dt;
      sword.position.y += sword.velocity.y * dt;
      bounceAtBorder(sword);
      break;
  }

  pushTrail(sword, now);
}

function bounceAtBorder(sword: Sword, pad = 0.06) {
  if (sword.position.x < pad) {
    sword.position.x = pad;
    sword.velocity.x = Math.abs(sword.velocity.x) * 0.5;
  }
  if (sword.position.x > 1 - pad) {
    sword.position.x = 1 - pad;
    sword.velocity.x = -Math.abs(sword.velocity.x) * 0.5;
  }
  if (sword.position.y < pad) {
    sword.position.y = pad;
    sword.velocity.y = Math.abs(sword.velocity.y) * 0.5;
  }
  if (sword.position.y > 1 - pad) {
    sword.position.y = 1 - pad;
    sword.velocity.y = -Math.abs(sword.velocity.y) * 0.5;
  }
}

function pushTrail(sword: Sword, now: number) {
  sword.trail.push({
    x: sword.position.x,
    y: sword.position.y,
    alpha: 1,
    ts: now,
  });
  if (sword.trail.length > TRAIL_MAX_LEN) sword.trail.shift();
}

/** 拖尾每帧衰减 alpha */
export function fadeTrail(sword: Sword, dtSec: number) {
  const decay = Math.pow(0.94, dtSec * 60);
  for (const p of sword.trail) p.alpha *= decay;
  // 移除 alpha 过低的点
  while (sword.trail.length > 0 && sword.trail[0].alpha < 0.04) {
    sword.trail.shift();
  }
}

/** 计算掌心中心位置（用于 follow-palm / embrace） */
export function palmCenter(hands: Array<{ landmarks: Array<{ x: number; y: number }> }>): Vec2 | null {
  if (hands.length === 0) return null;
  const lm = hands[0].landmarks;
  if (lm.length < 21) return null;
  // 用 0（腕）+ 9（中指 MCP）+ 5（食指 MCP）三角形的中心作为掌心
  const cx = (lm[0].x + lm[9].x + lm[5].x) / 3;
  const cy = (lm[0].y + lm[9].y + lm[5].y) / 3;
  // 镜像后 x = 1 - x（与视频对齐）
  return { x: 1 - cx, y: cy };
}

/** 应用 OK 手势时生成 burst wave */
export function spawnBurst(state: SwordControlState, x: number, y: number) {
  state.bursts.push({ x, y, radius: 0, alpha: 1 });
  // 限制最大数量
  if (state.bursts.length > 6) state.bursts.shift();
}

/** 应用摇滚手势时生成 slash wave */
export function spawnSlash(
  state: SwordControlState,
  x: number,
  y: number,
  vx: number,
  vy: number,
) {
  state.slashes.push({ x, y, vx, vy, radius: 0.02, alpha: 1, hue: 180 + Math.random() * 60 });
  if (state.slashes.length > 8) state.slashes.shift();
}

/** 更新 burst / slash 特效 */
export function updateEffects(state: SwordControlState, dtSec: number) {
  for (const b of state.bursts) {
    b.radius += dtSec * 1.2;
    b.alpha -= dtSec * 0.6;
  }
  state.bursts = state.bursts.filter((b) => b.alpha > 0);

  for (const s of state.slashes) {
    s.x += s.vx * dtSec;
    s.y += s.vy * dtSec;
    s.radius += dtSec * 0.4;
    s.alpha -= dtSec * 1.5;
  }
  state.slashes = state.slashes.filter((s) => s.alpha > 0);

  // 粒子更新
  for (const p of state.particles) {
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vy += dtSec * 0.3; // 重力
    p.life -= dtSec * 1.2;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  if (state.particles.length > 200) state.particles.splice(0, state.particles.length - 200);
}

/** 在剑当前位置生成火花粒子 */
export function spawnSparks(state: SwordControlState, sword: Sword, count = 2) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TWO_PI;
    const speed = 0.3 + Math.random() * 0.6;
    state.particles.push({
      x: sword.position.x,
      y: sword.position.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 0.2,
      life: 1,
      hue: 170 + Math.random() * 60,
      size: 2 + Math.random() * 3,
    });
  }
}