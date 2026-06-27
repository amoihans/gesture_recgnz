/**
 * 全局可调参数
 * 集中管理阈值、性能开关、视频约束等
 */

export const CONFIG = {
  /** MediaPipe 模型路径（位于 public/ 目录下） */
  modelUrl: "/hand_landmarker.task",

  /** 检测的最大手数（1 足够减少抖动） */
  numHands: 1,

  /** MediaPipe 推理阈值 */
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,

  /** 性能：每隔多少帧推理一次，1 表示每帧都推理 */
  processEveryNFrames: 1,

  /** 手势去抖窗口（毫秒），期间手势需持续才确认 */
  debounceMs: 300,

  /** 历史窗口长度（帧数） */
  historySize: 8,

  /** 最低置信度阈值 */
  minConfidence: 0.6,

  /** 挥手识别参数 */
  wave: {
    /** 振幅占视频宽度的最小比例 */
    minAmplitude: 0.06,
    /** 方向反转时间窗口（毫秒） */
    windowMs: 1200,
    /** 窗口内最少反转次数 */
    minReversals: 2,
  },

  /** 视频流约束：使用 min/ideal/max 给出范围而非精确值，
   *  避免设备不支持精确分辨率时抛 OverconstrainedError */
  videoConstraints: {
    facingMode: "user",
    width: { min: 320, ideal: 1280, max: 1920 },
    height: { min: 240, ideal: 720, max: 1080 },
    frameRate: { ideal: 30 },
  },
} as const;