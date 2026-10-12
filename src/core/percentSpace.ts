/**
 * Literal percentage helpers — port of Android `DimenPercentSpace.kt` / `PercentSpaceMath.kt`.
 *
 * The first argument is a percentage **0–100**; the result is that fraction of a screen axis
 * (or of a reference length) in dp, px or sp:
 *
 *   spaceW(15)        // 15% of the window width, in dp
 *   space(25, 200)    // 25% of 200 dp → 50 dp
 *
 * Variants ending in `i` honour `ignoreMultiWindows` (they return the raw percentage when the
 * window is constrained by multi-window — the exact behaviour of Android
 * `literalPercentOfScreenDp`). Prefer the variants without `i` for layout lengths.
 */
import {store} from './DimenCache';
import {DimenMetrics, Q_H, Q_SW, Q_W} from './DimenMetrics';

function literal(percent: number, q: number, ignoreMultiWindows: boolean, m: DimenMetrics): number {
  if (!isFinite(percent)) return 0;
  if (ignoreMultiWindows && m.isInMultiWindowMode) return percent;
  return (percent / 100) * m.readAxis(q);
}

function ofReference(percent: number, referenceDp: number): number {
  if (!isFinite(percent)) return 0;
  return (percent / 100) * referenceDp;
}

// ── Screen axes (dp / px) ───────────────────────────────────────────────────

/** `percent`% of the window width (dp). */
export const spaceW = (percent: number): number => literal(percent, Q_W, false, store.m);
/** `percent`% of the window width (dp), multi-window aware. */
export const spaceWi = (percent: number): number => literal(percent, Q_W, true, store.m);
/** `percent`% of the window width (px). */
export const spaceWPx = (percent: number): number =>
  literal(percent, Q_W, false, store.m) * store.m.density;
/** `percent`% of the window width (px), multi-window aware. */
export const spaceWPxi = (percent: number): number =>
  literal(percent, Q_W, true, store.m) * store.m.density;

/** `percent`% of the smallest width (dp). */
export const spaceSw = (percent: number): number => literal(percent, Q_SW, false, store.m);
/** `percent`% of the smallest width (dp), multi-window aware. */
export const spaceSwi = (percent: number): number => literal(percent, Q_SW, true, store.m);
/** `percent`% of the smallest width (px). */
export const spaceSwPx = (percent: number): number =>
  literal(percent, Q_SW, false, store.m) * store.m.density;
/** `percent`% of the smallest width (px), multi-window aware. */
export const spaceSwPxi = (percent: number): number =>
  literal(percent, Q_SW, true, store.m) * store.m.density;

/** `percent`% of the window height (dp). */
export const spaceH = (percent: number): number => literal(percent, Q_H, false, store.m);
/** `percent`% of the window height (dp), multi-window aware. */
export const spaceHi = (percent: number): number => literal(percent, Q_H, true, store.m);
/** `percent`% of the window height (px). */
export const spaceHPx = (percent: number): number =>
  literal(percent, Q_H, false, store.m) * store.m.density;
/** `percent`% of the window height (px), multi-window aware. */
export const spaceHPxi = (percent: number): number =>
  literal(percent, Q_H, true, store.m) * store.m.density;

// ── Reference length ────────────────────────────────────────────────────────

/** `percent`% of `referenceDp` (dp). */
export const space = (percent: number, referenceDp: number): number =>
  ofReference(percent, referenceDp);
/** Same as {@link space} (multi-window flag has no effect on a reference length). */
export const spaceI = space;
/** `percent`% of `referenceDp`, in px. */
export const spacePx = (percent: number, referenceDp: number): number =>
  ofReference(percent, referenceDp) * store.m.density;
/** Same as {@link spacePx}. */
export const spacePxi = spacePx;

// ── Font sizes ──────────────────────────────────────────────────────────────

function asSp(dp: number, fontScale: boolean): number {
  return fontScale ? dp : dp / store.m.fontScale;
}
function asSpPx(dp: number, fontScale: boolean): number {
  const m = store.m;
  return dp * m.density * (fontScale ? m.fontScale : 1);
}

/** Font size equal to `percent`% of the window width. */
export const spaceWSp = (percent: number, fontScale = true, ignoreMultiWindows = false): number =>
  asSp(literal(percent, Q_W, ignoreMultiWindows, store.m), fontScale);
export const spaceWSpi = (percent: number, fontScale = true): number =>
  spaceWSp(percent, fontScale, true);
export const spaceWSpPx = (percent: number, fontScale = true, ignoreMultiWindows = false): number =>
  asSpPx(literal(percent, Q_W, ignoreMultiWindows, store.m), fontScale);
export const spaceWSpiPx = (percent: number, fontScale = true): number =>
  spaceWSpPx(percent, fontScale, true);

/** Font size equal to `percent`% of the smallest width. */
export const spaceSwSp = (percent: number, fontScale = true, ignoreMultiWindows = false): number =>
  asSp(literal(percent, Q_SW, ignoreMultiWindows, store.m), fontScale);
export const spaceSwSpi = (percent: number, fontScale = true): number =>
  spaceSwSp(percent, fontScale, true);
export const spaceSwSpPx = (
  percent: number,
  fontScale = true,
  ignoreMultiWindows = false,
): number => asSpPx(literal(percent, Q_SW, ignoreMultiWindows, store.m), fontScale);
export const spaceSwSpiPx = (percent: number, fontScale = true): number =>
  spaceSwSpPx(percent, fontScale, true);

/** Font size equal to `percent`% of the window height. */
export const spaceHSp = (percent: number, fontScale = true, ignoreMultiWindows = false): number =>
  asSp(literal(percent, Q_H, ignoreMultiWindows, store.m), fontScale);
export const spaceHSpi = (percent: number, fontScale = true): number =>
  spaceHSp(percent, fontScale, true);
export const spaceHSpPx = (percent: number, fontScale = true, ignoreMultiWindows = false): number =>
  asSpPx(literal(percent, Q_H, ignoreMultiWindows, store.m), fontScale);
export const spaceHSpiPx = (percent: number, fontScale = true): number =>
  spaceHSpPx(percent, fontScale, true);

/** Font size equal to `percent`% of `referenceDp`. */
export const spaceSp = (percent: number, referenceDp: number, fontScale = true): number =>
  asSp(ofReference(percent, referenceDp), fontScale);
export const spaceSpi = spaceSp;
export const spaceSpPx = (percent: number, referenceDp: number, fontScale = true): number =>
  asSpPx(ofReference(percent, referenceDp), fontScale);
export const spaceSpiPx = spaceSpPx;
