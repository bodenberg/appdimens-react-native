/**
 * Non-React resize helpers — port of Android `code.resize.DimenResize`.
 *
 * React Native lays out in dp, so the primary API works in dp; `*Px` variants exist for parity.
 * High-level helpers (`fitting*`) fall back to the range minimum when nothing fits, so a value
 * is never collapsed to 0 in production UIs (the low-level `findLargestFitting` keeps the
 * Android contract and returns 0).
 */
import {store} from '../core/DimenCache';
import {
  AutoResizePercentBasis,
  ResizeBound,
  ResizeRange,
  resolveBoundToDp,
  resolveBoundToPx,
} from './ResizeMath';
import {estimateTextBlock, TextEstimateOptions, TextMeasurer} from './textMeasure';

/** Padding of the box that constrains a resize (dp). A number means the same on every side. */
export type ContentPadding =
  | number
  | {
      all?: number;
      horizontal?: number;
      vertical?: number;
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
      start?: number;
      end?: number;
    };

/** Inner size of a `width × height` box after removing `padding`. Never negative. */
export function innerMaxDimensions(
  width: number,
  height: number,
  padding?: ContentPadding | null,
): {width: number; height: number} {
  if (padding == null) return {width: Math.max(width, 0), height: Math.max(height, 0)};
  if (typeof padding === 'number') {
    return {width: Math.max(width - 2 * padding, 0), height: Math.max(height - 2 * padding, 0)};
  }
  const all = padding.all ?? 0;
  const h = padding.horizontal ?? all;
  const v = padding.vertical ?? all;
  const left = padding.left ?? padding.start ?? h;
  const right = padding.right ?? padding.end ?? h;
  const top = padding.top ?? v;
  const bottom = padding.bottom ?? v;
  return {
    width: Math.max(width - left - right, 0),
    height: Math.max(height - top - bottom, 0),
  };
}

function toBoundDp(v: ResizeBound | number): number {
  return typeof v === 'number' ? Math.max(v, 0) : resolveBoundToDp(v);
}

function toBoundPx(v: ResizeBound | number): number {
  return typeof v === 'number' ? Math.max(v, 0) * store.m.density : resolveBoundToPx(v);
}

function basisLength(width: number, height: number, basis: AutoResizePercentBasis): number {
  if (basis === AutoResizePercentBasis.WIDTH) return width;
  if (basis === AutoResizePercentBasis.HEIGHT) return height;
  return Math.min(width, height);
}

function fallback(range: ResizeRange, best: number): number {
  return best > 0 ? best : range.low;
}

/** Options of {@link DimenResize.fittingTextSp}. */
export interface FittingTextOptions extends TextEstimateOptions {
  /** Text to fit. */
  text: string;
  /** Available width in dp. */
  maxWidth: number;
  /** Available height in dp (unbounded when omitted). */
  maxHeight?: number;
  /** Smallest font size (sp). */
  minSp: number;
  /** Largest font size (sp). */
  maxSp: number;
  /** Granularity (sp), default 1. */
  stepSp?: number;
  /** Maximum number of lines (unbounded when omitted). */
  maxLines?: number;
  /** Whether the rendered size includes the user font scale (default true, like `Text`). */
  fontScale?: boolean;
  /** Custom measurer (defaults to the built-in estimator). */
  measure?: TextMeasurer;
}

function textFits(o: FittingTextOptions, sp: number): boolean {
  const fontSize = o.fontScale === false ? sp : sp * store.m.fontScale;
  const measure = o.measure ?? estimateTextBlock;
  const block = measure(o.text, fontSize, o.maxWidth, o);
  if (block.width > o.maxWidth + 0.01) return false;
  if (o.maxLines != null && block.lines > o.maxLines) return false;
  if (o.maxHeight != null && block.height > o.maxHeight + 0.01) return false;
  return true;
}

export const DimenResize = {
  /** Range in dp. Numbers are dp; bounds may be fixed dp/sp or a screen-axis percentage. */
  range(
    min: ResizeBound | number,
    max: ResizeBound | number,
    step: ResizeBound | number = 1,
  ): ResizeRange {
    return new ResizeRange(toBoundDp(min), toBoundDp(max), toBoundDp(step));
  },

  /** Range in px (Android `DimenResize.rangePx`). Numbers are dp. */
  rangePx(
    min: ResizeBound | number,
    max: ResizeBound | number,
    step: ResizeBound | number = 1,
  ): ResizeRange {
    return new ResizeRange(toBoundPx(min), toBoundPx(max), toBoundPx(step));
  },

  /** Range expressed as percentages (0–100) of the inner box side chosen by `basis`, in dp. */
  rangePercentOfInnerBox(
    minPercent: number,
    maxPercent: number,
    stepPercent: number,
    innerWidth: number,
    innerHeight: number,
    basis: AutoResizePercentBasis = AutoResizePercentBasis.MIN_SIDE,
  ): ResizeRange {
    const len = basisLength(innerWidth, innerHeight, basis);
    const c = (p: number) => (Math.min(Math.max(p, 0), 100) / 100) * len;
    return new ResizeRange(c(minPercent), c(maxPercent), c(stepPercent));
  },

  /** Largest step of `range` for which `fits` is true (0 when none — Android contract). */
  fitting(range: ResizeRange, fits: (candidate: number) => boolean): number {
    return range.resolveFitting(fits);
  },

  /** Android alias of {@link DimenResize.fitting}. */
  fittingPx(range: ResizeRange, fits: (candidate: number) => boolean): number {
    return range.resolveFitting(fits);
  },

  /** Largest width step that fits the inner width of the box. */
  fittingInnerWidth(range: ResizeRange, boxWidth: number, padding?: ContentPadding | null): number {
    const limit = innerMaxDimensions(boxWidth, 0, padding).width;
    return fallback(
      range,
      range.resolveFitting(c => c <= limit),
    );
  },

  /** Largest height step that fits the inner height of the box. */
  fittingInnerHeight(
    range: ResizeRange,
    boxHeight: number,
    padding?: ContentPadding | null,
  ): number {
    const limit = innerMaxDimensions(0, boxHeight, padding).height;
    return fallback(
      range,
      range.resolveFitting(c => c <= limit),
    );
  },

  /** Largest square side that fits the inner box. */
  fittingInnerSquareSide(
    range: ResizeRange,
    boxWidth: number,
    boxHeight: number,
    padding?: ContentPadding | null,
  ): number {
    const inner = innerMaxDimensions(boxWidth, boxHeight, padding);
    const limit = Math.min(inner.width, inner.height);
    return fallback(
      range,
      range.resolveFitting(c => c <= limit),
    );
  },

  /** Largest font size (sp) in `[minSp, maxSp]` whose text block fits the constraints. */
  fittingTextSp(options: FittingTextOptions): number {
    const range = new ResizeRange(options.minSp, options.maxSp, options.stepSp ?? 1);
    return fallback(
      range,
      range.resolveFitting(sp => textFits(options, sp)),
    );
  },

  /** {@link DimenResize.fittingTextSp} returned in px (font scale included unless disabled). */
  fittingTextSpPx(options: FittingTextOptions): number {
    const sp = DimenResize.fittingTextSp(options);
    const m = store.m;
    return sp * m.density * (options.fontScale === false ? 1 : m.fontScale);
  },

  /**
   * Font size whose bounds are percentages (0–100) of the inner box side chosen by `basis`
   * (Android `fittingTextSpPercentPx` / `autoResizeTextSpPercent`).
   */
  fittingTextSpPercent(
    options: Omit<FittingTextOptions, 'minSp' | 'maxSp' | 'stepSp'> & {
      maxHeight: number;
      minPercent: number;
      maxPercent: number;
      stepPercent?: number;
      basis?: AutoResizePercentBasis;
    },
  ): number {
    const len = basisLength(options.maxWidth, options.maxHeight, options.basis ?? 'MIN_SIDE');
    const fs = options.fontScale === false ? 1 : store.m.fontScale;
    const c = (p: number) => ((Math.min(Math.max(p, 0), 100) / 100) * len) / fs;
    return DimenResize.fittingTextSp({
      ...options,
      minSp: c(options.minPercent),
      maxSp: c(options.maxPercent),
      stepSp: Math.max(c(options.stepPercent ?? 1), 0.5),
    });
  },
};
