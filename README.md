# 手势识别网站

> 基于 React + TypeScript + MediaPipe Tasks Vision 的浏览器端手势识别网站
> 通过摄像头实时识别 10 种手势，并在屏幕上显示对应的中文动作词。

[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://amoihans.github.io/gesture_recgnz/)
[![CI](https://github.com/amoihans/gesture_recgnz/actions/workflows/ci.yml/badge.svg)](https://github.com/amoihans/gesture_recgnz/actions/workflows/ci.yml)
[![Deploy](https://github.com/amoihans/gesture_recgnz/actions/workflows/deploy.yml/badge.svg)](https://github.com/amoihans/gesture_recgnz/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## ✨ 在线演示

👉 **https://amoihans.github.io/gesture_recgnz/**

> ⚠️ 浏览器会请求摄像头权限 —— 允许后即可开始识别。所有视频数据均在浏览器本地处理，不会上传。

## ✨ 功能特性

- 🎥 **摄像头实时采集**：纯前端处理，视频数据不上传
- 🖐️ **10 种手势识别**（详见 [DESIGN.md §2](./DESIGN.md)）
- 🀄 **中文动作词反馈**：停止 / 确认 / 指向 / 切换 / 赞同 / 反对 / 播放 / 好的 / 呼叫 / 招呼
- 🔆 **4 种显示模式**：原始画面+关键点 / 仅原始画面 / 仅关键点 / 黑屏
- 🌗 **暗色模式自动适配**
- 🚀 **轻量级**：gzip 后约 123 kB
- 🛡️ **强健的摄像头容错**：3 层降级策略 + DOMException 精确分类

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript 6（strict 模式） |
| 构建 | Vite 8 |
| 手势识别 | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) + 自研几何分类器 |
| 样式 | Tailwind CSS v4 + shadcn/ui（New York 风格 / Neutral） |
| 图标 | lucide-react |
| CI/CD | GitHub Actions（CI 检查 + 自动部署到 Pages） |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run build && npm run preview

# 类型检查
npx tsc -b
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
│   └── PermissionPrompt.tsx # 授权引导
├── hooks/
│   ├── useCamera.ts              # 摄像头生命周期
│   ├── useHandDetection.ts       # MediaPipe 推理循环
│   └── useGestureRecognizer.ts   # 去抖与稳定化
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

## 🚀 部署

本项目使用 GitHub Actions 自动部署到 GitHub Pages：

1. 推送到 `main` 分支 → 触发 `deploy.yml`
2. 构建时设置 `GITHUB_PAGES=true` → vite 自动用 `/gesture_recgnz/` 作为 base path
3. 部署到 https://amoihans.github.io/gesture_recgnz/

手动启用 Pages 部署（如果还没启用）：
- GitHub 仓库 → **Settings** → **Pages**
- Source: **GitHub Actions**

## 🧪 浏览器要求

- Chrome / Edge 94+
- Firefox 90+
- Safari 16+
- 启用 WebGL 与 WebAssembly
- 摄像头权限（Chrome 在 Windows 上需要在系统隐私设置中允许 Chrome 访问摄像头）

## 📜 许可

[MIT](./LICENSE)