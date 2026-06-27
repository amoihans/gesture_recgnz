/**
 * HomePage — 组合根页面
 */

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Hand, ImageOff, Info, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useHandDetection } from "@/hooks/useHandDetection";
import { useGestureRecognizer } from "@/hooks/useGestureRecognizer";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { ActionDisplay } from "@/components/ActionDisplay";
import { GestureGuide } from "@/components/GestureGuide";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { HandResult } from "@/types/gestures";

// MediaPipe HandLandmarker 标准骨架连接
const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [showLandmarks, setShowLandmarks] = useState(true);
  const [hideVideo, setHideVideo] = useState(false);

  const camera = useCamera({ videoRef });
  const detection = useHandDetection(videoRef, camera.status === "ready");
  const recognition = useGestureRecognizer(detection.hands);

  // 页面加载后自动尝试启动摄像头
  useEffect(() => {
    if (camera.status === "idle") {
      void camera.start();
    }
    // 只在挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // canvas 跟随 video 尺寸
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const sync = () => {
      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      }
    };
    sync();
    video.addEventListener("loadedmetadata", sync);
    return () => video.removeEventListener("loadedmetadata", sync);
  }, [camera.status]);

  // 关键点绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!showLandmarks) return;

    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;

    for (const hand of detection.hands) {
      drawHand(ctx, hand, w, h);
    }
  }, [detection.hands, showLandmarks, camera.status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLandmarks((v) => v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
              <Hand className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-none md:text-lg">
                手势识别
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                React + TypeScript + MediaPipe · 纯前端
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DetectionStatusBadge
              cameraStatus={camera.status}
              detectionStatus={detection.status}
            />
            <a
              href="https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label="参考实现"
              title="基于 MediaPipe HandLandmarker"
            >
              <Info className="h-4 w-4" />
            </a>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_360px]">
          <main className="relative flex min-h-[calc(100dvh-57px)] items-center justify-center p-4 md:p-8">
            {/* 视频容器始终挂载，这样 videoRef 始终指向真实 DOM 元素 */}
            <div
              className={`relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border shadow-lg ${
                hideVideo && camera.status === "ready" ? "bg-black" : "bg-muted"
              }`}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)] transition-opacity ${
                  camera.status === "ready" && !hideVideo ? "opacity-100" : "opacity-0"
                }`}
              />
              <canvas
                ref={canvasRef}
                className={`pointer-events-none absolute inset-0 h-full w-full [transform:scaleX(-1)] ${
                  camera.status === "ready" && showLandmarks ? "opacity-100" : "opacity-0"
                }`}
              />
              {/* 摄像头未就绪时显示占位提示 */}
              {camera.status !== "ready" && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="rounded-full bg-background/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
                    等待摄像头…
                  </p>
                </div>
              )}
              {/* 无图模式下显示提示标签 */}
              {hideVideo && camera.status === "ready" && (
                <div className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                  ✋ 仅关键点模式
                </div>
              )}
            </div>

            {/* PermissionPrompt 覆盖在视频之上 */}
            {camera.status !== "ready" && (
              <PermissionPrompt
                status={camera.status}
                error={camera.error}
                onRequest={() => {
                  void camera.start();
                }}
              />
            )}

            {/* 摄像头就绪后显示动作词和关键点开关 */}
            {camera.status === "ready" && (
              <>
                <ActionDisplay current={recognition.current} />

                {detection.status === "loading" && (
                  <div className="absolute inset-x-0 top-4 mx-auto flex w-fit items-center gap-2 rounded-full bg-background/80 px-4 py-2 text-sm shadow-md backdrop-blur">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在加载模型…
                  </div>
                )}

                {detection.status === "error" && (
                  <div className="absolute inset-x-4 top-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {detection.error}
                  </div>
                )}

                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-xs shadow-sm backdrop-blur">
                    {showLandmarks ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span>关键点</span>
                    <Switch
                      checked={showLandmarks}
                      onCheckedChange={setShowLandmarks}
                      aria-label="显示关键点"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-xs shadow-sm backdrop-blur">
                    <ImageOff className="h-3.5 w-3.5" />
                    <span>仅关键点</span>
                    <Switch
                      checked={hideVideo}
                      onCheckedChange={setHideVideo}
                      aria-label="隐藏画面只显示关键点"
                    />
                  </div>
                </div>
              </>
            )}
          </main>

          <aside className="border-t bg-muted/30 p-4 lg:min-h-[calc(100dvh-57px)] lg:border-l lg:border-t-0">
            <GestureGuide active={recognition.current?.name ?? null} />
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function DetectionStatusBadge({
  cameraStatus,
  detectionStatus,
}: {
  cameraStatus: string;
  detectionStatus: string;
}) {
  if (cameraStatus !== "ready") {
    return <Badge variant="outline">摄像头未启动</Badge>;
  }
  if (detectionStatus === "loading") {
    return <Badge variant="secondary">模型加载中…</Badge>;
  }
  if (detectionStatus === "error") {
    return <Badge variant="destructive">模型加载失败</Badge>;
  }
  return <Badge>就绪</Badge>;
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  hand: HandResult,
  width: number,
  height: number,
) {
  // 视频已镜像，关键点 x 也要镜像 (1 - x)
  const px = (x: number) => (1 - x) * width;
  const py = (y: number) => y * height;

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(34, 211, 238, 0.85)";
  for (const [a, b] of HAND_CONNECTIONS) {
    const pa = hand.landmarks[a];
    const pb = hand.landmarks[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(px(pa.x), py(pa.y));
    ctx.lineTo(px(pb.x), py(pb.y));
    ctx.stroke();
  }

  for (let i = 0; i < hand.landmarks.length; i++) {
    const p = hand.landmarks[i];
    ctx.beginPath();
    ctx.fillStyle =
      i === 0 || i === 4 || i === 8 || i === 12 || i === 16 || i === 20
        ? "rgba(244, 114, 182, 1)"
        : "rgba(250, 204, 21, 1)";
    ctx.arc(px(p.x), py(p.y), i === 0 ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}