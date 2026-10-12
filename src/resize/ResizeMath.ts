/**
 * Constraint-based resize math — port of Android `ResizeMath.kt`, `ResizeBound.kt` and
 * `AutoResizePercentBasis.kt`.
 *
 * Resize is not a global curve: it picks the **largest** step in `[min, max]` that still
 * satisfies a `fits` predicate, using a binary search over a pre-built step table.
 */
import {store} from '../core/DimenCache';
import type {DimenMetrics} from '../core/DimenMetrics';
import {DpQualifier} from '../core/types';

const MAX_RESIZE_STEPS = 4096;

/** Builds the ascending candidate table `min, min+step, …, max` (always includes `max`). */
export function buildResizeSteps(min: number, max: number, step: number): Float64Array {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!(step > 0) || !isFinite(lo) || !isFinite(hi)) return Float64Array.of(isFinite(lo) ? lo : 0);
  const capacity = Math.min(Math.max(Math.floor((hi - lo) / step) + 2, 1), MAX_RESIZE_STEPS);
  const buf = new Float64Array(capacity);
  const epsilon = step * 1e-4;
  let count = 0;
  let x = lo;
  while (x <= hi + epsilon && count < capacity) {
    buf[count++] = Math.min(x, hi);
    x = lo + count * step; // multiply instead of accumulate: no drift
  }
  if (count === 0) {
    buf[0] = lo;
    count = 1;
  }
  if (buf[count - 1] < hi - epsilon && count < capacity) buf[count++] = hi;
  return count === capacity ? buf : buf.slice(0, count);
}

/** Android name for {@link buildResizeSteps}. */
export const buildResizeStepsPx = buildResizeSteps;

/**
 * Binary search for the largest candidate where `fits` is true (`fits` must be monotonic:
 * true up to some size, false after). Returns `0` when nothing fits.
 */
export function findLargestFitting(
  sortedSteps: ArrayLike<number>,
  fits: (candidate: number) => boolean,
): number {
  const n = sortedSteps.length;
  if (n === 0) return 0;
  if (n === 1) return fits(sortedSteps[0]) ? sortedSteps[0] : 0;
  let left = 0;
  let right = n - 1;
  let best = 0;
  while (left <= right) {
    const mid = (left + right) >>> 1;
    const v = sortedSteps[mid];
    if (fits(v)) {
      best = v;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return best;
}

/** Android name for {@link findLargestFitting}. */
export const findLargestFittingResizePx = findLargestFitting;

/** A resolved `[min, max]` range with its step table (Android `ResizeRangePx`). */
export class ResizeRange {
  readonly low: number;
  readonly high: number;
  readonly steps: Float64Array;

  constructor(
    readonly min: number,
    readonly max: number,
    readonly step: number,
  ) {
    this.low = Math.min(min, max);
    this.high = Math.max(min, max);
    this.steps = buildResizeSteps(this.low, this.high, step);
  }

  /** Largest step for which `fits` returns true (`0` if none). */
  resolveFitting(fits: (candidate: number) => boolean): number {
    return findLargestFitting(this.steps, fits);
  }
}

/** Android name: ranges built by `DimenResize.rangePx` are in px. */
export {ResizeRange as ResizeRangePx};

/** Which side of a box a percentage refers to (Android `AutoResizePercentBasis`). */
export const AutoResizePercentBasis = {
  HEIGHT: 'HEIGHT',
  WIDTH: 'WIDTH',
  MIN_SIDE: 'MIN_SIDE',
} as const;
export type AutoResizePercentBasis =
  (typeof AutoResizePercentBasis)[keyof typeof AutoResizePercentBasis];

/** A resize bound (Android sealed `ResizeBound`). */
export type ResizeBound =
  | {readonly type: 'FixedDp'; readonly dp: number}
  | {readonly type: 'FixedSp'; readonly sp: number}
  | {readonly type: 'Percent'; readonly value: number; readonly axis: DpQualifier};

/** Fixed bound in dp. */
export const resizeFixedDp = (dp: number): ResizeBound => ({type: 'FixedDp', dp});
/** Fixed bound in sp (font scale applied when resolving). */
export const resizeFixedSp = (sp: number): ResizeBound => ({type: 'FixedSp', sp});
/** `percent`% of the smallest width. */
export const resizePercentSw = (percent: number): ResizeBound => ({
  type: 'Percent',
  value: percent,
  axis: DpQualifier.SMALL_WIDTH,
});
/** `percent`% of the window width. */
export const resizePercentW = (percent: number): ResizeBound => ({
  type: 'Percent',
  value: percent,
  axis: DpQualifier.WIDTH,
});
/** `percent`% of the window height. */
export const resizePercentH = (percent: number): ResizeBound => ({
  type: 'Percent',
  value: percent,
  axis: DpQualifier.HEIGHT,
});

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Resolves a bound to dp (React Native layout units). Invalid inputs are clamped. */
export function resolveBoundToDp(bound: ResizeBound, metrics: DimenMetrics = store.m): number {
  switch (bound.type) {
    case 'FixedDp':
      return Math.max(bound.dp, 0) || 0;
    case 'FixedSp':
      return (Math.max(bound.sp, 0) || 0) * metrics.fontScale;
    case 'Percent':
      return (clamp(bound.value, 0, 100) / 100) * metrics.readScreenDp(bound.axis);
  }
}

/** Resolves a bound to px (Android `ResizeBound.resolveToPx`). */
export function resolveBoundToPx(bound: ResizeBound, metrics: DimenMetrics = store.m): number {
  if (!(metrics.density > 0))
    throw new RangeError(`density must be positive, was ${metrics.density}`);
  return resolveBoundToDp(bound, metrics) * metrics.density;
}
