/**
 * 手势识别相关类型定义
 * 涵盖：手势名称、关键点、单帧结果、识别结果
 */

export type GestureName =
  | "open_palm"
  | "closed_fist"
  | "pointing_up"
  | "victory"
  | "thumb_up"
  | "thumb_down"
  | "iloveyou"
  | "ok_sign"
  | "call"
  | "wave"
  | "unknown";

export type Handedness = "Left" | "Right";

export type Finger = "thumb" | "index" | "middle" | "ring" | "pinky";

/** MediaPipe 单个关键点（归一化坐标 0..1） */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** 单帧单只手的结果 */
export interface HandResult {
  landmarks: Landmark[];
  handedness: Handedness;
  /** MediaPipe 输出的真实世界坐标（米），可用于深度判断 */
  worldLandmarks?: Landmark[];
}

/** 单帧手势识别结果 */
export interface GesturePrediction {
  name: GestureName;
  /** 0..1 */
  confidence: number;
  hand?: HandResult;
}

/** 用于去抖的历史记录项 */
export interface GestureHistoryEntry {
  name: GestureName;
  ts: number;
}