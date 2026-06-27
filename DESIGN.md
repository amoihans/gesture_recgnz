# 手势识别网站 — 设计文档

> 版本：v1.0 · 2026-06-26
> 状态：已批准，正在实施

---

## 1. Context（背景与目标）

### 1.1 项目背景

- 工作目录：`D:\hans\proj\gesture_recongnize`
- 目标：基于前端技术栈构建一个浏览器端的手势识别网站
- 用户通过摄像头展示手部姿态，页面实时识别手势并以中文动作词的形式反馈

### 1.2 核心需求

| # | 需求 | 说明 |
|---|---|---|
| 1 | 摄像头实时采集 | 调用 `navigator.mediaDevices.getUserMedia` 获取视频流 |
| 2 | 手部关键点检测 | 实时识别画面中的手部 21 个关键点 |
| 3 | 手势分类 | 在前端用规则分类器识别 8-10 种手势 |
| 4 | 中文动作词反馈 | 在屏幕中央显示当前手势对应的中文动作词 |
| 5 | 优雅 UI | 摄像头画面、关键点叠加、动作词大字、图例高亮 |

### 1.3 范围之外

- 不触发任何网页操作（点击、滚动、播放等）
- 不做云端识别、不上传视频
- 不做账号系统、不保存历史

### 1.4 已确认技术选型

| 维度 | 选型 | 理由 |
|---|---|---|
| 框架 | React 18 + TypeScript（strict） | 用户指定 |
| 构建工具 | Vite 5 | 与 React/TS 配合最顺，HMR 快 |
| 手势识别 | MediaPipe Tasks Vision（HandLandmarker）+ 自研几何分类器 | 精度高、纯前端、模型小（~2-3MB） |
| UI 样式 | Tailwind CSS v4 + shadcn/ui（New York / Neutral） | 现代、暗色支持好、组件可复制 |
| 图标 | lucide-react | 与 shadcn 默认一致 |
| 输出形态 | 仅在屏幕显示中文动作词 | 用户确认 |

---

## 2. 10 种手势映射总表

| # | 手势 | Emoji | 中文动作词 | 几何判定要点 |
|---|---|---|---|---|
| 1 | 张开手掌 | ✋ | 停止 | 5 指全伸 |
| 2 | 握拳 | ✊ | 确认 | 5 指全屈 |
| 3 | 食指 | ☝️ | 指向 | 仅食指伸，食指伸直 |
| 4 | 胜利 | ✌️ | 切换 | 食指+中指伸且分开 |
| 5 | 点赞 | 👍 | 赞同 | 仅拇指伸，拇指尖在腕上方 |
| 6 | 拇指向下 | 👎 | 反对 | 仅拇指伸，拇指尖在腕下方 |
| 7 | 摇滚手势 | 🤘 | 播放 | 拇指+食指+小指伸 |
| 8 | OK 手势 | 👌 | 好的 | 拇食指相触 + 其余 3 指伸 |
| 9 | 打电话 | 🤙 | 呼叫 | 拇指+小指伸，拇指弯向小指 |
| 10 | 挥手 | 🖐️ | 招呼 | 中指 MCP 水平方向 1.2s 内 ≥2 次反转 |

---

## 3. 项目目录结构

```
D:/hans/proj/gesture_recongnize/
├── public/
│   └── hand_landmarker.task          # MediaPipe 模型（从官方 CDN 下载）
├── src/
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 原子组件
│   │   ├── ActionDisplay.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── GestureGuide.tsx
│   │   ├── PermissionPrompt.tsx
│   │   └── VideoView.tsx
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useHandDetection.ts
│   │   └── useGestureRecognizer.ts
│   ├── lib/
│   │   ├── config.ts
│   │   ├── gestureActions.ts
│   │   ├── gestureClassifier.ts
│   │   ├── landmarks.ts
│   │   ├── smoothing.ts
│   │   └── utils.ts
│   ├── pages/
│   │   └── HomePage.tsx
│   ├── types/
│   │   └── gestures.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── components.json
├── package.json
└── README.md
```

---

## 4. 核心模块设计

### 4.1 类型定义 `src/types/gestures.ts`

```ts
export type GestureName =
  | 'open_palm' | 'closed_fist' | 'pointing_up' | 'victory'
  | 'thumb_up' | 'thumb_down' | 'iloveyou' | 'ok_sign'
  | 'call' | 'wave' | 'unknown';

export interface Landmark { x: number; y: number; z: number; }

export interface HandResult {
  landmarks: Landmark[];
  handedness: 'Left' | 'Right';
  worldLandmarks?: Landmark[];
}

export interface GesturePrediction {
  name: GestureName;
  confidence: number;
  hand?: HandResult;
}
```

### 4.2 手势 → 动作词 `src/lib/gestureActions.ts`

```ts
export const GESTURE_ACTIONS: Record<GestureName, { zh: string; emoji: string; description: string }> = {
  open_palm:   { zh: '停止', emoji: '✋', description: '张开手掌' },
  closed_fist: { zh: '确认', emoji: '✊', description: '握拳' },
  pointing_up: { zh: '指向', emoji: '☝️', description: '食指上举' },
  victory:     { zh: '切换', emoji: '✌️', description: '胜利手势' },
  thumb_up:    { zh: '赞同', emoji: '👍', description: '点赞' },
  thumb_down:  { zh: '反对', emoji: '👎', description: '拇指向下' },
  iloveyou:    { zh: '播放', emoji: '🤘', description: '摇滚手势' },
  ok_sign:     { zh: '好的', emoji: '👌', description: 'OK 手势' },
  call:        { zh: '呼叫', emoji: '🤙', description: '打电话' },
  wave:        { zh: '招呼', emoji: '🖐️', description: '挥手' },
  unknown:     { zh: '',     emoji: '',   description: '' },
};
```

### 4.3 关键点几何工具 `src/lib/landmarks.ts`

```ts
export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export const FINGER_TIPS: Record<Finger, number> = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
export const FINGER_PIP: Record<Finger, number> = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };
export const FINGER_MCP: Record<Finger, number> = { thumb: 2, index: 5, middle: 9,  ring: 12, pinky: 17 };

export function isFingerExtended(lm: Landmark[], finger: Finger): boolean;
export function isThumbExtended(lm: Landmark[], handedness: 'Left' | 'Right'): boolean;
export function distance(a: Landmark, b: Landmark): number;
export function angle(a: Landmark, b: Landmark, c: Landmark): number;
export function fingerStates(lm: Landmark[], handedness: 'Left' | 'Right'): Record<Finger, boolean>;
```

判定规则：
- 非拇指：`tip.y < pip.y` 表示伸直（y 越小越靠上）
- 拇指：Right 手 `tip.x > ip.x`，Left 手反向
- `distance` 用掌长（landmark[0] 腕 → landmark[9] 中指 MCP）归一化

### 4.4 手势分类器 `src/lib/gestureClassifier.ts`

判定优先级（命中即返回）：

| 优先级 | 手势 | 几何条件 |
|---|---|---|
| 1 | thumb_down | 仅拇指伸 且 tip.y > wrist.y |
| 2 | thumb_up | 仅拇指伸 且 tip.y < wrist.y |
| 3 | ok_sign | dist(4, 8) < 0.08（归一化） 且 中/无名/小指伸 |
| 4 | call | 拇指+小指伸、其余屈 且 angle(2,3,4) < 90° |
| 5 | iloveyou | 拇指+食指+小指伸、中/无名屈 |
| 6 | victory | 食指+中指伸 且 dist(8,12) > dist(5,9) |
| 7 | pointing_up | 仅食指伸 且 angle(5,6,8) ≈ 180° |
| 8 | open_palm | 5 指全伸 |
| 9 | closed_fist | 5 指全屈 |
| 10 | unknown | 其余 |

### 4.5 去抖 `src/lib/smoothing.ts`

```ts
export interface GestureHistoryEntry { name: GestureName; ts: number; }

export function debounceGesture(
  history: GestureHistoryEntry[],
  debounceMs: number,
): GestureName | null {
  if (history.length < 2) return null;
  const span = history[history.length - 1].ts - history[0].ts;
  if (span < debounceMs) return null;
  const allSame = history.every(h => h.name === history[0].name);
  return allSame ? history[0].name : null;
}
```

---

## 5. Hooks 设计

### 5.1 `useCamera.ts`
- `getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`
- 卸载时 `stream.getTracks().forEach(t => t.stop())`
- 异常分类：`NotAllowedError` → denied；`NotFoundError` → error

### 5.2 `useHandDetection.ts`
- `FilesetResolver.forVisionTasks` + `HandLandmarker.createFromOptions`
- `runningMode: 'VIDEO'`
- rAF 循环；时间戳单调；可见性检查；卸载关闭

### 5.3 `useGestureRecognizer.ts`
- 每帧调用 `classifyGesture(hands[0])`
- 长度 `historySize`（8）环形缓冲
- 时间跨度 ≥ `debounceMs`（300ms）且全部相同才提交
- `unknown` 不提交
- wave 单独识别：landmark[9] 水平方向 1.2s 内 ≥2 次反转、振幅 > 0.08

---

## 6. UI 组件设计

- **VideoView**：镜像视频 + canvas 叠加关键点
- **ActionDisplay**：居中显示动作词 `text-7xl md:text-9xl`，切换动画
- **GestureGuide**：10 种手势卡，激活高亮
- **PermissionPrompt**：未授权遮罩
- **ErrorBoundary**：渲染兜底
- **HomePage**：组合根页面

---

## 7. 关键配置

```ts
export const CONFIG = {
  modelUrl: '/hand_landmarker.task',
  numHands: 1,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  processEveryNFrames: 1,
  debounceMs: 300,
  historySize: 8,
  minConfidence: 0.7,
  videoConstraints: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
} as const;
```

---

## 8. 依赖清单

### runtime
- `react@^18.3`、`react-dom@^18.3`、`@mediapipe/tasks-vision@^0.10.x`、`lucide-react`、`class-variance-authority`、`clsx`、`tailwind-merge`

### dev
- `vite@^5.4`、`@vitejs/plugin-react@^4`、`typescript@^5.4`、`@types/react`、`@types/react-dom`、`@types/node`、`tailwindcss@^4`、`@tailwindcss/vite@^4`、`tailwindcss-animate`、`eslint`、`prettier`、`prettier-plugin-tailwindcss`

---

## 9. 配置文件

### `vite.config.ts`
```ts
plugins: [react(), tailwindcss()]
resolve.alias: { '@': path.resolve(__dirname, 'src') }
optimizeDeps.exclude: ['@mediapipe/tasks-vision']
```

### `src/index.css`
Tailwind v4 + `@theme inline` + shadcn tokens（中性色 + 暗色）。

### `components.json`
shadcn `new-york` 风格，`baseColor: neutral`，路径别名 `@/...`。

---

## 10. 性能与体验要点

- `requestAnimationFrame` 驱动推理
- `document.visibilitychange` 隐藏时跳过
- 时间戳单调递增（`lastTsRef`）
- 模型懒加载
- Canvas 只在 `videoWidth × videoHeight` 变化时 resize
- 关键点镜像（`1 - lm.x`）
- 暗色模式自动跟随系统

---

## 11. 浏览器兼容性

- 目标：Chrome/Edge 94+、Firefox 90+、Safari 16+
- `getUserMedia` 必须 HTTPS 或 localhost
- `navigator.mediaDevices` 不存在时友好提示

---

## 12. 错误处理矩阵

| 失败场景 | 捕获位置 | 用户反馈 |
|---|---|---|
| 摄像头权限被拒 | `useCamera` → `NotAllowedError` | `PermissionPrompt` 指引 |
| 没有可用摄像头 | `useCamera` → `NotFoundError` | Banner 提示 |
| 模型加载 404 | `useHandDetection` 异步初始化 | `ErrorBoundary` 兜底 |
| WASM 加载失败 | `FilesetResolver` reject | Banner "模型加载失败" |
| 推理抛错 | rAF try/catch | 控制台日志 + 跳过本帧 |
| React 渲染异常 | `ErrorBoundary` | 兜底页 + 重载 |

---

## 13. 实施步骤

1. ✅ 输出 DESIGN.md
2. ✅ `npm create vite@latest . -- --template react-ts`
3. 安装依赖
4. 下载模型到 `public/hand_landmarker.task`
5. 配置 Tailwind v4 + shadcn
6. 写类型与几何工具
7. 实现 `useCamera`
8. 实现 `useHandDetection`
9. 实现 `gestureClassifier`
10. 实现 `useGestureRecognizer`
11. 实现 `gestureActions` + UI 组件
12. 组合到 `HomePage.tsx`
13. 调样式、写 README、本地验证

---

## 14. 验收

```bash
npm install
npm run dev   # 打开 http://localhost:5173
```

功能 checklist：
- [ ] 提示授权摄像头
- [ ] 10 种手势都能识别（300-500ms）
- [ ] 手势停止时动作词消失
- [ ] 图例高亮当前手势
- [ ] 显示关键点开关可用
- [ ] 暗色模式自动
- [ ] 拒绝权限有指引
- [ ] 切回标签循环恢复

---

## 15. 后续可扩展点

- 自定义手势训练（TensorFlow.js）
- 触发实际页面操作
- 双人识别
- 语音播报
- 历史记录 / 截图
- PWA 化