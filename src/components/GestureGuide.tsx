/**
 * GestureGuide — 侧边栏手势图例（10 种手势）
 */

import { GESTURE_ACTIONS, GESTURE_ORDER } from "@/lib/gestureActions";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GestureName } from "@/types/gestures";

interface Props {
  active: GestureName | null;
}

export function GestureGuide({ active }: Props) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">手势图例</h2>
        <p className="text-xs text-muted-foreground">
          做出下列任意手势，屏幕中央会显示对应的中文动作词
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 scrollbar-thin">
        {GESTURE_ORDER.map((name) => {
          const info = GESTURE_ACTIONS[name];
          const isActive = active === name;
          return (
            <Card
              key={name}
              className={cn(
                "transition-all",
                isActive
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:bg-accent/40",
              )}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-2xl"
                  aria-hidden
                >
                  {info.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{info.zh}</span>
                    <span className="text-xs text-muted-foreground">
                      {info.description}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {info.en}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-auto rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p>💡 提示</p>
        <ul className="mt-1 space-y-1 list-disc pl-4">
          <li>手掌朝向摄像头效果最佳</li>
          <li>保持手势约 0.3 秒以确认</li>
          <li>挥手时左右摆动手掌</li>
        </ul>
      </div>
    </div>
  );
}