# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A browser-based hand gesture recognition website (React 19 + TS + Vite + MediaPipe). The webcam captures a hand, MediaPipe detects 21 landmarks, a custom rule-based classifier picks one of 10 gestures, and the screen shows a Chinese action word. See `DESIGN.md` for full architecture and algorithm details, and `README.md` for user-facing docs.

## Commands

```bash
npm install         # install deps
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # type-check + production build
npm run lint        # oxlint
npm run preview     # serve the built dist/
npx tsc -b          # type check only (no emit)
```

There are **no tests** in this project. CI in `.github/workflows/ci.yml` runs `npx tsc -b && npm run build`.

## Architecture (one-paragraph mental model)

Three layers feed forward, no global state:

1. **`useCamera({ videoRef })`** — `getUserMedia` lifecycle. Receives the `videoRef` from the page; **must** receive it because the `<video>` element only lives in `HomePage.tsx` (it stays mounted even before camera is ready, so `videoRef.current` is never null when `start()` runs).
2. **`useHandDetection(videoRef, active)`** — wraps MediaPipe `HandLandmarker`. Runs `requestAnimationFrame` loop; reads `video.readyState >= 2 && video.videoWidth > 0` before each `detectForVideo`; passes monotonically increasing `performance.now()` timestamps (store in a ref; never reuse).
3. **`useGestureRecognizer(hands)`** — pure classifier + debounce + wave-motion. Uses **stable `useRef`** for ring buffers; **never** put computed values like `hands.length === 0` into the effect dependency array (it oscillates and resets state every frame).

`HomePage.tsx` is the composition root and the **only** place where the `<video>` element is rendered. `PermissionPrompt` overlays it absolutely when the camera isn't ready.

## Critical constraints

### TypeScript 6 has `erasableSyntaxOnly: true`
**No `class` keyword allowed.** `useRef` and `createRingBuffer`-style factory functions are how we create instances. See `src/lib/smoothing.ts` for the pattern (`createRingBuffer<T>(capacity)` returns an object literal with methods).

### Path aliases
`@/*` maps to `./src/*` in `tsconfig.app.json` and `vite.config.ts`. Always use the alias for cross-directory imports.

### MediaPipe model
`public/hand_landmarker.task` (7.5 MB) is **committed to git** so clones work offline. Don't add it to `.gitignore`. `useHandDetection` loads it from `CONFIG.modelUrl` (default `/hand_landmarker.task`).

### MediaPipe sourcemap noise
`@mediapipe/tasks-vision/vision_bundle.mjs` ships without a `.map` file. `vite.config.ts` has a custom `suppressMediaPipeSourceMapWarning()` plugin (load hook, strips the `sourceMappingURL` comment). Don't remove it without understanding why it's there.

### GitHub Pages base path
When deployed to `https://amoihans.github.io/gesture_recgnz/`, the site needs `base: '/gesture_recgnz/'`. The `vite.config.ts` reads `process.env.GITHUB_PAGES` (set by `.github/workflows/deploy.yml`) to switch base automatically. Local dev uses `/`.

### Camera fallback strategy
`useCamera` tries three `getUserMedia` constraint sets in order (`true` → `{ facingMode: 'user' }` → full `CONFIG.videoConstraints`). It also short-circuits on `NotAllowedError`. All `DOMException.name` values map to Chinese user-friendly messages in `describeError()`.

## File map (where to make changes)

| To change... | Edit |
|---|---|
| Recognized gesture set or Chinese wording | `src/lib/gestureActions.ts` + `src/lib/gestureClassifier.ts` |
| Confidence thresholds, debounce window, model URL | `src/lib/config.ts` |
| Landmark geometry helpers | `src/lib/landmarks.ts` (21-point MediaPipe layout) |
| Ring buffer / debounce / wave detection | `src/lib/smoothing.ts` |
| Page layout, video element, mode toggles | `src/pages/HomePage.tsx` |
| shadcn theme tokens / Tailwind v4 `@theme inline` | `src/index.css` |
| Path alias | both `tsconfig.app.json` and `vite.config.ts` |
| Deployment workflow / GitHub Pages base | `.github/workflows/deploy.yml` + `vite.config.ts` |

## Tailwind v4 / shadcn notes

- Tailwind v4 uses `@import "tailwindcss"` and `@theme inline` for CSS variables. Theme tokens (`--color-background` etc.) are defined once in `src/index.css`.
- shadcn components live in `src/components/ui/`. They're copied locally — run `npx shadcn@latest add <name>` to add more, but **don't** delete the existing ones unless you know what depends on them.
- `cn()` helper at `src/lib/utils.ts` (clsx + tailwind-merge).

## Verifying changes

After editing anything:
1. `npx tsc -b` — must pass with zero errors. The project uses `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`.
2. `npm run build` — produces `dist/` (~123 kB gzipped).
3. `npm run dev` and verify in Chrome (Edge also works on Windows where Chrome may be blocked by camera permissions).

Camera testing requires HTTPS or `localhost`. The browser will pop a permission dialog on first use.

## Known gotchas (learned the hard way)

- **`videoRef` must be the same object across `useCamera`, `useHandDetection`, and the `<video>` element.** If you create a new ref inside the hook, `videoRef.current` will be `null` and `srcObject = stream` will silently no-op.
- **`<video>` must stay mounted even before camera is ready** — otherwise `start()` runs before the ref is attached. Render it always, toggle visibility with `opacity-0`.
- **`useEffect` deps must not include derived booleans from frequently-changing values** (e.g., `hands.length === 0`). They cause the effect to re-run dozens of times per second, resetting any ring buffers inside.
- **MediaPipe `detectForVideo` requires strictly monotonic timestamps.** Reusing a timestamp throws. Track `lastTsRef` and pass `Math.max(now, last + 1)`.
- **`video.play()` should not be awaited** — it can hang with `Timeout starting video source`. Fire-and-forget; downstream code already gates on `readyState >= 2`.

## Memory pointer

The user's machine has Chrome that cannot enumerate videoinput devices (system camera app works fine, Chrome does not). Edge works. They use Edge for testing. Don't propose Chrome-specific fixes for camera issues — confirm the user's browser first.
