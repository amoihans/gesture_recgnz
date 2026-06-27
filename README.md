# 手势识别网站

> 基于 React + TypeScript + MediaPipe Tasks Vision 的浏览器端手势识别网站
> 通过摄像头实时识别 10 种手势，并在屏幕上显示对应的中文动作词。

![Tech](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TS](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)

## ✨ 功能特性

- 🎥 **摄像头实时采集**：纯前端处理，视频数据不上传
- 🖐️ **10 种手势识别**（详见 [DESIGN.md §2](./DESIGN.md)）
- 🀄 **中文动作词反馈**：停止 / 确认 / 指向 / 切换 / 赞同 / 反对 / 播放 / 好的 / 呼叫 / 招呼
- 🔆 **关键点叠加可视化**：可切换显示 21 个手部关键点与骨架
- 🌗 **暗色模式自动适配**
- 🚀 **轻量级**：gzip 后约 122 kB

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript 6（strict 模式） |
| 构建 | Vite 8 |
| 手势识别 | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) + 自研几何分类器 |
| 样式 | Tailwind CSS v4 + shadcn/ui（New York 风格 / Neutral） |
| 图标 | lucide-react |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

启动后访问 http://localhost:5173 ，授权摄像头即可开始识别。

> ⚠️ 摄像头访问需要 **HTTPS** 或 **localhost** 环境

## 🖐️ 支持的手势

| 手势 | Emoji | 中文动作词 | 几何判定 |
|---|---|---|---|
| 张开手掌 | ✋ | 停止 | 5 指全伸 |
| 握拳 | ✊ | 确认 | 5 指全屈 |
| 食指 | ☝️ | 指向 | 仅食指伸直 |
| 胜利 | ✌️ | 切换 | 食指+中指分开 |
| 点赞 | 👍 | 赞同 | 仅拇指朝上 |
| 拇指向下 | 👎 | 反对 | 仅拇指向下 |
| 摇滚手势 | 🤘 | 播放 | 拇指+食指+小指伸 |
| OK 手势 | 👌 | 好的 | 拇食指相触 + 其余 3 指伸 |
| 打电话 | 🤙 | 呼叫 | 拇指+小指伸 |
| 挥手 | 🖐️ | 招呼 | 手掌左右摆动 ≥2 次 |

## 📁 项目结构

```
src/
├── components/
│   ├── ui/                  # shadcn/ui 原子组件
│   ├── ActionDisplay.tsx    # 中央动作词大屏
│   ├── ErrorBoundary.tsx    # 错误兜底
│   ├── GestureGuide.tsx     # 手势图例
│   ├── PermissionPrompt.tsx # 授权引导
│   └── VideoView.tsx        # 视频 + 关键点叠加
├── hooks/
│   ├── useCamera.ts         # 摄像头生命周期
│   ├── useHandDetection.ts  # MediaPipe 推理循环
│   └── useGestureRecognizer.ts # 去抖与稳定化
├── lib/
│   ├── config.ts            # 全局参数
│   ├── gestureActions.ts    # 手势→动作词映射
│   ├── gestureClassifier.ts # 几何分类器
│   ├── landmarks.ts         # 关键点几何工具
│   ├── smoothing.ts         # 去抖工具
│   └── utils.ts             # cn() 工具
├── pages/HomePage.tsx       # 组合根
└── types/gestures.ts        # 类型定义
```

详细架构与算法说明见 [DESIGN.md](./DESIGN.md)。

## ⚙️ 性能调优

如需在低端设备上提升性能，编辑 `src/lib/config.ts`：

```ts
processEveryNFrames: 2,  // 改为每 2 帧推理一次（默认 1）
minHandDetectionConfidence: 0.6,  // 提高阈值减少误检
```

## 🧪 浏览器要求

- Chrome / Edge 94+
- Firefox 90+
- Safari 16+
- 启用 WebGL 与 WebAssembly
- 摄像头权限

## 📜 许可

MIT