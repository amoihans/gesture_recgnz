/**
 * ActionDisplay — 中央动作词大屏
 */

import { actionFor } from "@/lib/gestureActions";
import type { GesturePrediction } from "@/types/gestures";

interface Props {
  current: GesturePrediction | null;
}

export function ActionDisplay({ current }: Props) {
  const info = current ? actionFor(current.name) : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-background/70 px-8 py-4 text-center shadow-lg backdrop-blur">
        {info && info.zh ? (
          <>
            <div
              key={current!.name}
              className="flex items-center gap-3 [animation:var(--animate-pop)]"
            >
              <span className="text-5xl md:text-6xl" aria-hidden>
                {info.emoji}
              </span>
              <span className="text-5xl font-bold tracking-tight md:text-6xl">
                {info.zh}
              </span>
            </div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {info.description} · {info.en}
            </p>
          </>
        ) : (
          <p className="text-base font-medium text-muted-foreground">
            请做出手势
          </p>
        )}
      </div>
    </div>
  );
}