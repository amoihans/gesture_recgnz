/**
 * PermissionPrompt — 未授权摄像头时的引导遮罩
 */

import { Camera, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CameraStatus } from "@/hooks/useCamera";

interface Props {
  status: CameraStatus;
  error: string | null;
  onRequest: () => void;
}

export function PermissionPrompt({ status, error, onRequest }: Props) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {status === "denied" ? (
            <ShieldAlert className="h-7 w-7 text-destructive" />
          ) : status === "error" ? (
            <AlertTriangle className="h-7 w-7 text-destructive" />
          ) : (
            <Camera className="h-7 w-7 text-primary" />
          )}
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">
          {status === "denied"
            ? "摄像头权限被拒绝"
            : status === "error"
              ? "无法启动摄像头"
              : "需要使用摄像头"}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {status === "denied"
            ? "请在浏览器地址栏左侧的权限图标中允许使用摄像头，然后刷新页面。"
            : status === "error"
              ? error ?? "请检查摄像头是否被其他应用占用。"
              : "本网站完全在浏览器内运行，所有视频数据都不会上传到服务器。请点击下方按钮授权使用摄像头。"}
        </p>

        {error && status !== "denied" && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-xs text-destructive">
            {error.split("\n").map((line, i) => (
              <p key={i} className={line.trim().startsWith("浏览器") ? "font-medium" : "mt-0.5"}>
                {line}
              </p>
            ))}
          </div>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={onRequest}
          disabled={status === "requesting"}
        >
          {status === "requesting" ? (
            <>
              <Loader2 className="animate-spin" />
              正在请求权限…
            </>
          ) : status === "denied" ? (
            "重新尝试"
          ) : (
            <>
              <Camera />
              授权摄像头
            </>
          )}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          支持 Chrome / Edge / Firefox / Safari 16+ · 需 HTTPS 或 localhost
        </p>
      </div>
    </div>
  );
}