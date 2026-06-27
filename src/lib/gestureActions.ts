/**
 * 手势 → 中文动作词映射
 */

import type { GestureName } from "@/types/gestures";

export interface GestureActionInfo {
  /** 中文动作词 */
  zh: string;
  /** emoji 图标 */
  emoji: string;
  /** 手势名称（中文） */
  description: string;
  /** 英文标识 */
  en: string;
}

export const GESTURE_ACTIONS: Record<GestureName, GestureActionInfo> = {
  open_palm:   { zh: "停止", emoji: "✋", description: "张开手掌", en: "Open Palm" },
  closed_fist: { zh: "确认", emoji: "✊", description: "握拳",     en: "Closed Fist" },
  pointing_up: { zh: "指向", emoji: "☝️", description: "食指上举", en: "Pointing Up" },
  victory:     { zh: "切换", emoji: "✌️", description: "胜利手势", en: "Victory" },
  thumb_up:    { zh: "赞同", emoji: "👍", description: "点赞",     en: "Thumb Up" },
  thumb_down:  { zh: "反对", emoji: "👎", description: "拇指向下", en: "Thumb Down" },
  iloveyou:    { zh: "播放", emoji: "🤘", description: "摇滚手势", en: "Rock Sign" },
  ok_sign:     { zh: "好的", emoji: "👌", description: "OK 手势",  en: "OK Sign" },
  call:        { zh: "呼叫", emoji: "🤙", description: "打电话",   en: "Call Sign" },
  wave:        { zh: "招呼", emoji: "🖐️", description: "挥手",     en: "Wave" },
  unknown:     { zh: "",     emoji: "",   description: "",        en: "Unknown" },
};

export function actionFor(g: GestureName): GestureActionInfo {
  return GESTURE_ACTIONS[g];
}

/** 用于 UI 展示的手势顺序（unknown 在最后） */
export const GESTURE_ORDER: GestureName[] = [
  "open_palm",
  "closed_fist",
  "pointing_up",
  "victory",
  "thumb_up",
  "thumb_down",
  "iloveyou",
  "ok_sign",
  "call",
  "wave",
];