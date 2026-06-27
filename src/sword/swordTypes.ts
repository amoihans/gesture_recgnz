/**
 * 御剑术 — 类型定义
 */

/** 剑的不同动作模式 */
export type SwordMode =
  | "idle" // 悬停在默认位置
  | "follow-palm" // 跟随掌心（张开手掌）
  | "embrace" // 环绕拳头（握拳）
  | "thrust" // 朝指向冲刺（食指）
  | "toggle-array" // 切换剑阵模式（胜利）
  | "dash" // 加速冲刺（点赞）
  | "recall" // 缓慢收回（拇指向下）
  | "slash" // 横斩攻击（摇滚）
  | "burst" // 释放剑气（OK）
  | "sword-array" // 召唤剑阵（打电话）
  | "circle"; // 扫一圈（挥手）

export interface Vec2 {
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  ts: number;
}

export interface Sword {
  id: number;
  position: Vec2;
  velocity: Vec2;
  rotation: number; // 弧度
  angularVelocity: number;
  mode: SwordMode;
  trail: TrailPoint[];
  /** 进入当前 mode 的时间戳 */
  modeStartedAt: number;
  /** 模式专属临时数据（例如 slash 的起点） */
  payload: Record<string, number | Vec2>;
  /** 是否处于激活态（非激活的剑不渲染） */
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0..1
  hue: number; // 0..360
  size: number;
}

export interface BurstWave {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface SlashWave {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: number;
}

export interface SwordControlState {
  swords: Sword[];
  particles: Particle[];
  bursts: BurstWave[];
  slashes: SlashWave[];
  /** 是否启用剑阵模式（胜利手势切换） */
  arrayMode: boolean;
  /** 全屏震动强度 */
  shake: number;
  /** 最近一次手势命令（用于 HUD 显示） */
  lastCommand: { mode: SwordMode; ts: number } | null;
}
