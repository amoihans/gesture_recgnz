/**
 * useCamera — 摄像头生命周期管理
 *
 * 封装 navigator.mediaDevices.getUserMedia，暴露状态机。
 * 视频流的 srcObject 必须绑定到外部传入的 videoRef 指向的 DOM 元素。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";

export interface UseCameraOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export interface UseCameraResult {
  status: CameraStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /** 当前活动流（便于排查） */
  stream: MediaStream | null;
}

interface AttemptResult {
  ok: boolean;
  stream?: MediaStream;
  err?: DOMException;
  label: string;
}

async function tryGetUserMedia(
  video: MediaTrackConstraints | boolean,
  label: string,
): Promise<AttemptResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video,
      audio: false,
    });
    return { ok: true, stream, label };
  } catch (e) {
    return { ok: false, err: e as DOMException, label };
  }
}

const ATTEMPT_PLAN: ReadonlyArray<{
  label: string;
  video: MediaTrackConstraints | boolean;
}> = [
  { label: "无约束", video: true },
  { label: "仅 facingMode", video: { facingMode: "user" } },
  { label: "完整 config", video: CONFIG.videoConstraints },
];

function describeError(err: DOMException): string {
  switch (err.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "摄像头权限被拒绝。请在浏览器地址栏左侧的权限图标中允许使用摄像头后刷新页面。";
    case "NotFoundError":
      return "未检测到任何视频输入设备。请确认摄像头已正确连接。";
    case "OverconstrainedError":
      return "设备不支持所请求的分辨率或参数。";
    case "NotReadableError":
    case "TrackStartError":
      return "摄像头被其他应用占用。请关闭其他正在使用摄像头的程序后重试。";
    case "AbortError":
      return "摄像头启动被中止。";
    case "NotSupportedError":
      return "当前环境不支持摄像头访问，请使用 HTTPS 或 localhost。";
    default:
      return `摄像头启动失败：${err.name} — ${err.message}`;
  }
}

export function useCamera({ videoRef }: UseCameraOptions): UseCameraResult {
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const stop = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.load();
    }
    setStatus("idle");
  }, [videoRef]);

  const start = useCallback(async () => {
    if (status === "requesting" || status === "ready") return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("error");
      setError(
        "当前浏览器不支持摄像头访问，请使用最新版 Chrome / Edge / Firefox。",
      );
      return;
    }

    // 等到 video 元素挂载（最多 2 秒）
    let video = videoRef.current;
    for (let i = 0; i < 20 && !video; i++) {
      await new Promise((r) => setTimeout(r, 100));
      video = videoRef.current;
    }
    if (!video) {
      setStatus("error");
      setError("视频元素尚未挂载，请稍后再试。");
      return;
    }

    setStatus("requesting");
    setError(null);

    // 0) 打印环境诊断（不阻塞）
    console.info("[camera] isSecureContext:", window.isSecureContext);
    console.info("[camera] location:", window.location.href);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      console.info(
        `[camera] enumerateDevices found ${cameras.length} videoinput device(s)`,
        cameras.map((c) => ({ label: c.label, id: c.deviceId.slice(0, 8) })),
      );
    } catch (e) {
      console.warn("[camera] enumerateDevices failed:", e);
    }

    // 1-3) 三层降级尝试
    let result: AttemptResult | undefined;
    for (const plan of ATTEMPT_PLAN) {
      const a = await tryGetUserMedia(plan.video, plan.label);
      console.info(
        `[camera] attempt "${a.label}" → ${a.ok ? "OK" : `fail (${a.err?.name ?? "unknown"})`}`,
      );
      if (a.ok) {
        result = a;
        break;
      }
      if (
        a.err &&
        (a.err.name === "NotAllowedError" ||
          a.err.name === "PermissionDeniedError" ||
          a.err.name === "SecurityError")
      ) {
        result = a;
        break;
      }
      result = a;
    }

    if (!result || !result.ok || !result.stream) {
      const err = result?.err;
      if (!err) {
        setStatus("error");
        setError("摄像头启动失败：未知错误");
        return;
      }
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.name === "SecurityError"
      ) {
        setStatus("denied");
        setError(describeError(err));
      } else {
        setStatus("error");
        setError(describeError(err));
      }
      return;
    }

    streamRef.current = result.stream;
    setStream(result.stream);

    // 关键修复：把流绑定到外部传入的视频元素
    video.srcObject = result.stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    void video.play().catch((e) => {
      console.warn("[camera] play() rejected:", e);
    });

    setStatus("ready");
  }, [status, videoRef]);

  useEffect(() => {
    return () => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { status, error, start, stop, stream };
}