/**
 * SwordHUD — 剑模式指示器
 *
 * 显示当前是否剑阵模式 + 最近一次手势命令。
 */

import { Sparkles, Swords, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GESTURE_ACTIONS } from "@/lib/gestureActions";
import type { SwordMode } from "./swordTypes";

interface Props {
  arrayMode: boolean;
  lastCommand: { mode: SwordMode; ts: number } | null;
}

const MODE_TO_GESTURE_NAME: Record<SwordMode, string> = {
  "follow-palm": "open_palm",
  embrace: "closed_fist",
  thrust: "pointing_up",
  "toggle-array": "victory",
  dash: "thumb_up",
  recall: "thumb_down",
  slash: "iloveyou",
  burst: "ok_sign",
  "sword-array": "call",
  circle: "wave",
  idle: "unknown",
};

const MODE_LABEL: Record<SwordMode, string> = {
  "follow-palm": "御剑·随",
  embrace: "御剑·缠",
  thrust: "御剑·刺",
  "toggle-array": "剑阵",
  dash: "御剑·冲",
  recall: "御剑·归",
  slash: "御剑·斩",
  burst: "御剑·爆",
  "sword-array": "剑阵",
  circle: "御剑·绕",
  idle: "待机",
};

export function SwordHUD({ arrayMode, lastCommand }: Props) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-40 flex flex-col gap-2">
      <Badge
        variant={arrayMode ? "default" : "secondary"}
        className="gap-1 shadow-md backdrop-blur"
      >
        {arrayMode ? <Swords className="h-3 w-3" /> : <Wind className="h-3 w-3" />}
        <span>{arrayMode ? "剑阵模式 (12)" : "单剑模式"}</span>
      </Badge>

      {lastCommand && lastCommand.mode !== "idle" && (
        <Badge
          variant="outline"
          className="gap-1 bg-background/80 shadow-md backdrop-blur"
          key={lastCommand.ts}
        >
          <Sparkles className="h-3 w-3" />
          <span>{MODE_LABEL[lastCommand.mode]}</span>
          <span className="text-muted-foreground">
            · {GESTURE_ACTIONS[MODE_TO_GESTURE_NAME[lastCommand.mode] as keyof typeof GESTURE_ACTIONS]?.emoji ?? ""}
          </span>
        </Badge>
      )}
    </div>
  );
}