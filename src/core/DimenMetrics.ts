/**
 * Immutable per-window metrics snapshot — port of Android `DimenMetrics`.
 *
 * Every scaling curve in the library is linear in the base value
 * (`out = base × factor(strategy, axis, inverter, flags)`), so each snapshot owns a lazily
 * filled `Float64Array` with one slot per combination. A resolution is therefore one property
 * load, one typed-array read, one NaN check and one multiply — no allocations, no Map lookups.
 * A new snapshot (and a fresh table) is created only when the window really changes.
 */
import {
  DpQualifier,
  Inverter,
  Orientation,
  ScalingStrategy,
  STRATEGY_COUNT,
  UiModeType,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Design constants (Android `DesignScaleConstants` + `DimenCache` math constants)
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_WIDTH_DP = 300;
export const BASE_HEIGHT_DP = 533;
export const BASE_DIAGONAL_DP = 611.6305;
export const BASE_PERIMETER_DP = 833;
export const REFERENCE_ASPECT_RATIO = 1.78;
export const INV_REFERENCE_ASPECT_RATIO = 1 / REFERENCE_ASPECT_RATIO;
export const INV_BASE_RATIO = 1 / 300;
export const ADJUSTMENT_SCALE = 0.1 / 30;
export const SENSITIVITY_DEFAULT = 0.08 / 30;

/** Multi-window heuristic: the window is "constrained" below this fraction of the display. */
export const MULTI_WINDOW_THRESHOLD = 0.85;

// ─────────────────────────────────────────────────────────────────────────────
// Internal numeric indices
// ─────────────────────────────────────────────────────────────────────────────

/** @internal */ export const Q_SW = 0;
/** @internal */ export const Q_H = 1;
/** @internal */ export const Q_W = 2;

/** @internal */ export const QUALIFIER_INDEX: Readonly<Record<DpQualifier, number>> = {
  SMALL_WIDTH: Q_SW,
  HEIGHT: Q_H,
  WIDTH: Q_W,
};

/** @internal */ export const QUALIFIERS: readonly DpQualifier[] = [
  DpQualifier.SMALL_WIDTH,
  DpQualifier.HEIGHT,
  DpQualifier.WIDTH,
];

/** @internal Inverter indices; DEFAULT is 0. */
export const INVERTER_INDEX: Readonly<Record<Inverter, number>> = {
  DEFAULT: 0,
  PH_TO_LW: 1,
  PW_TO_LH: 2,
  LH_TO_PW: 3,
  LW_TO_PH: 4,
  SW_TO_LH: 5,
  SW_TO_LW: 6,
  SW_TO_PH: 7,
  SW_TO_PW: 8,
};

/** @internal */ export const INVERTER_COUNT = 9;
/** @internal flag bit: apply aspect ratio. */ export const FLAG_AR = 1;
/** @internal flag bit: ignore multi-window. */ export const FLAG_IMW = 2;
const FLAG_COUNT = 4;

/** @internal Total number of factor slots per snapshot. */
export const FACTOR_SLOTS = STRATEGY_COUNT * 3 * INVERTER_COUNT * FLAG_COUNT;

/** @internal Index of a factor slot. */
export function factorIndex(strategy: number, q: number, inv: number, flags: number): number {
  return ((strategy * 3 + q) * INVERTER_COUNT + inv) * FLAG_COUNT + flags;
}

/**
 * Port of `DimenCalculationPlumbing.effectiveQualifier` on numeric indices.
 * @internal
 */
export function effectiveQualifierIndex(
  q: number,
  inv: number,
  isLandscape: boolean,
  isPortrait: boolean,
): number {
  switch (inv) {
    case 1: // PH_TO_LW
      return isLandscape && q === Q_H ? Q_W : q;
    case 2: // PW_TO_LH
      return isLandscape && q === Q_W ? Q_H : q;
    case 3: // LH_TO_PW
      return isPortrait && q === Q_H ? Q_W : q;
    case 4: // LW_TO_PH
      return isPortrait && q === Q_W ? Q_H : q;
    case 5: // SW_TO_LH
      return isLandscape && q === Q_SW ? Q_H : q;
    case 6: // SW_TO_LW
      return isLandscape && q === Q_SW ? Q_W : q;
    case 7: // SW_TO_PH
      return isPortrait && q === Q_SW ? Q_H : q;
    case 8: // SW_TO_PW
      return isPortrait && q === Q_SW ? Q_W : q;
    default:
      return q;
  }
}

/** Public port of `DimenCalculationPlumbing.effectiveQualifier`. */
export function effectiveQualifier(
  qualifier: DpQualifier,
  inverter: Inverter,
  isLandscape: boolean,
  isPortrait: boolean,
): DpQualifier {
  return QUALIFIERS[
    effectiveQualifierIndex(
      QUALIFIER_INDEX[qualifier],
      INVERTER_INDEX[inverter] ?? 0,
      isLandscape,
      isPortrait,
    )
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot
// ─────────────────────────────────────────────────────────────────────────────

/** Raw inputs used to build a snapshot (all lengths in dp). */
export interface DimenMetricsInput {
  /** Window width in dp (`Dimensions.get('window').width`). */
  width: number;
  /** Window height in dp. */
  height: number;
  /** Physical display width in dp (`Dimensions.get('screen').width`). Defaults to `width`. */
  screenWidth?: number;
  /** Physical display height in dp. Defaults to `height`. */
  screenHeight?: number;
  /** Pixels per dp (`PixelRatio.get()`). Defaults to 1. */
  density?: number;
  /** User font scale (`PixelRatio.getFontScale()`). Defaults to 1. */
  fontScale?: number;
  /** Current UI mode. Defaults to `NORMAL`. */
  uiModeType?: UiModeType;
  /** Force the multi-window state; when omitted the display/window heuristic is used. */
  isInMultiWindowMode?: boolean;
}

function finitePositive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : fallback;
}

function nonNegative(v: number | undefined): number {
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0;
}

let versionCounter = 0;

export class DimenMetrics {
  /** Monotonic id of this snapshot (changes whenever the window changes). */
  readonly version: number;
  readonly screenWidthDp: number;
  readonly screenHeightDp: number;
  /** Smallest side of the current window (Android `smallestScreenWidthDp`). */
  readonly smallestScreenWidthDp: number;
  readonly displayWidthDp: number;
  readonly displayHeightDp: number;
  readonly density: number;
  readonly fontScale: number;
  readonly orientation: Orientation;
  readonly isLandscape: boolean;
  readonly isPortrait: boolean;
  readonly uiModeType: UiModeType;
  readonly isInMultiWindowMode: boolean;
  readonly minDimensionDp: number;
  readonly maxDimensionDp: number;
  /** Smallest width with the Android fallbacks (min side, then 300). */
  readonly smallestWidthDp: number;
  /** `smallestWidthDp / 300`. */
  readonly scale: number;
  readonly screenWidthFactor: number;
  readonly screenHeightFactor: number;
  readonly normalizedAspectRatio: number;
  readonly logNormalizedAspectRatio: number;
  /** `1 + SENSITIVITY_DEFAULT × ln(normalizedAr)` (satellite aspect-ratio multiplier). */
  readonly defaultAspectRatioMultiplier: number;
  /** `1 + (sw − 300) × (ADJUSTMENT_SCALE + SENSITIVITY_DEFAULT × ln(normalizedAr))`. */
  readonly defaultScaledAspectRatioMultiplier: number;

  /** @internal Lazily filled factor table (NaN = not computed yet). */
  readonly _f: Float64Array;

  private readonly _mwInput: boolean | undefined;
  private _power?: number;
  private _interpolated?: number;
  private _diagonal?: number;
  private _perimeter?: number;
  private _logarithmic?: number;

  constructor(input: DimenMetricsInput) {
    this.version = ++versionCounter;
    const w = nonNegative(input.width);
    const h = nonNegative(input.height);
    this.screenWidthDp = w;
    this.screenHeightDp = h;
    this.minDimensionDp = Math.min(w, h);
    this.maxDimensionDp = Math.max(w, h);
    this.smallestScreenWidthDp = this.minDimensionDp;
    this.displayWidthDp = nonNegative(input.screenWidth) || w;
    this.displayHeightDp = nonNegative(input.screenHeight) || h;
    this.density = finitePositive(input.density, 1);
    this.fontScale = finitePositive(input.fontScale, 1);
    this.isLandscape = w > h;
    this.isPortrait = !this.isLandscape;
    this.orientation = this.isLandscape ? Orientation.LANDSCAPE : Orientation.PORTRAIT;
    this.uiModeType = input.uiModeType ?? UiModeType.NORMAL;

    this._mwInput =
      typeof input.isInMultiWindowMode === 'boolean' ? input.isInMultiWindowMode : undefined;
    if (typeof input.isInMultiWindowMode === 'boolean') {
      this.isInMultiWindowMode = input.isInMultiWindowMode;
    } else {
      const dMin = Math.min(this.displayWidthDp, this.displayHeightDp);
      const dMax = Math.max(this.displayWidthDp, this.displayHeightDp);
      this.isInMultiWindowMode =
        dMin > 0 &&
        (this.minDimensionDp < dMin * MULTI_WINDOW_THRESHOLD ||
          this.maxDimensionDp < dMax * MULTI_WINDOW_THRESHOLD);
    }

    this.smallestWidthDp = this.minDimensionDp > 0 ? this.minDimensionDp : BASE_WIDTH_DP;
    this.scale = this.smallestWidthDp * INV_BASE_RATIO;
    this.screenWidthFactor = w * INV_BASE_RATIO;
    this.screenHeightFactor = h * INV_BASE_RATIO;

    const rawAr = this.minDimensionDp > 0 ? this.maxDimensionDp / this.minDimensionDp : 1;
    const nar = rawAr / REFERENCE_ASPECT_RATIO;
    this.normalizedAspectRatio = isFinite(nar) && nar > 0 ? nar : 1;
    this.logNormalizedAspectRatio = Math.log(this.normalizedAspectRatio);
    this.defaultAspectRatioMultiplier = 1 + SENSITIVITY_DEFAULT * this.logNormalizedAspectRatio;
    this.defaultScaledAspectRatioMultiplier =
      1 +
      (this.smallestWidthDp - BASE_WIDTH_DP) *
        (ADJUSTMENT_SCALE + SENSITIVITY_DEFAULT * this.logNormalizedAspectRatio);

    this._f = new Float64Array(FACTOR_SLOTS).fill(NaN);
  }

  /** `(sw / 300)^0.75` — power strategy, default SW path. */
  get powerScale(): number {
    if (this._power === undefined) {
      this._power = Math.pow(this.smallestWidthDp / BASE_WIDTH_DP, 0.75);
    }
    return this._power;
  }

  /** `1 + (sw / 300 − 1) × 0.5` — interpolated strategy, default SW path. */
  get interpolatedScale(): number {
    if (this._interpolated === undefined) {
      this._interpolated = 1 + (this.smallestWidthDp * INV_BASE_RATIO - 1) * 0.5;
    }
    return this._interpolated;
  }

  /** `√(min² + max²) / 611.63` — diagonal strategy. */
  get diagonalScale(): number {
    if (this._diagonal === undefined) {
      const a = this.minDimensionDp;
      const b = this.maxDimensionDp;
      this._diagonal = Math.sqrt(a * a + b * b) / BASE_DIAGONAL_DP;
    }
    return this._diagonal;
  }

  /** `(min + max) / 833` — perimeter strategy. */
  get perimeterScale(): number {
    if (this._perimeter === undefined) {
      this._perimeter = (this.minDimensionDp + this.maxDimensionDp) / BASE_PERIMETER_DP;
    }
    return this._perimeter;
  }

  /** Piecewise `1 ± 0.4 × ln(…)` on sw — logarithmic strategy, default SW path. */
  get logarithmicScale(): number {
    if (this._logarithmic === undefined) {
      this._logarithmic = logarithmicCurve(this.smallestWidthDp);
    }
    return this._logarithmic;
  }

  /** Dp value of an axis (Android `DimenCalculationPlumbing.readScreenDp`). */
  readScreenDp(qualifier: DpQualifier): number {
    return this.readAxis(QUALIFIER_INDEX[qualifier]);
  }

  /** @internal */
  readAxis(q: number): number {
    return q === Q_H
      ? this.screenHeightDp
      : q === Q_W
        ? this.screenWidthDp
        : this.smallestScreenWidthDp;
  }

  /** Android `DimenMetrics.scaledMultiplier`. */
  scaledMultiplier(applyAspectRatio: boolean, customSensitivityK?: number | null): number {
    if (!applyAspectRatio) return this.scale;
    if (customSensitivityK == null) return this.defaultScaledAspectRatioMultiplier;
    return checkedMultiplier(
      1 +
        (this.smallestWidthDp - BASE_WIDTH_DP) *
          (ADJUSTMENT_SCALE + checkedK(customSensitivityK) * this.logNormalizedAspectRatio),
    );
  }

  /** Android `DimenMetrics.aspectRatioMultiplier`. */
  aspectRatioMultiplier(customSensitivityK?: number | null): number {
    if (customSensitivityK == null) return this.defaultAspectRatioMultiplier;
    return checkedMultiplier(1 + checkedK(customSensitivityK) * this.logNormalizedAspectRatio);
  }

  /**
   * Multiplier for one (strategy, qualifier, inverter, flags) combination.
   * Cached in the snapshot table unless a custom sensitivity is supplied.
   * @internal
   */
  factor(strategy: number, q: number, inv: number, flags: number, k?: number | null): number {
    if (!(strategy >= 0 && strategy < STRATEGY_COUNT)) {
      throw new RangeError(`Unknown scaling strategy: ${strategy}`);
    }
    if (k == null || (flags & FLAG_AR) === 0) {
      const idx = factorIndex(strategy, q, inv, flags);
      const cached = this._f[idx];
      if (cached === cached) return cached;
      const f = computeFactor(this, strategy, q, inv, flags, null);
      this._f[idx] = f;
      return f;
    }
    return computeFactor(this, strategy, q, inv, flags, k);
  }

  /** @internal Fills and returns slot `idx` (kernel slow path). */
  fill(idx: number): number {
    let rest = idx;
    const flags = rest % FLAG_COUNT;
    rest = (rest - flags) / FLAG_COUNT;
    const inv = rest % INVERTER_COUNT;
    rest = (rest - inv) / INVERTER_COUNT;
    const q = rest % 3;
    const strategy = (rest - q) / 3;
    const f = computeFactor(this, strategy, q, inv, flags, null);
    this._f[idx] = f;
    return f;
  }

  /** True when a value with the same inputs would resolve identically. */
  equalsInput(o: DimenMetricsInput): boolean {
    return (
      nonNegative(o.width) === this.screenWidthDp &&
      nonNegative(o.height) === this.screenHeightDp &&
      (nonNegative(o.screenWidth) || nonNegative(o.width)) === this.displayWidthDp &&
      (nonNegative(o.screenHeight) || nonNegative(o.height)) === this.displayHeightDp &&
      finitePositive(o.density, 1) === this.density &&
      finitePositive(o.fontScale, 1) === this.fontScale &&
      (o.uiModeType ?? UiModeType.NORMAL) === this.uiModeType &&
      (typeof o.isInMultiWindowMode === 'boolean' ? o.isInMultiWindowMode : undefined) ===
        this._mwInput
    );
  }

  /** Reference snapshot: 300×533 dp, density 1 (Android `DimenMetrics.DEFAULT`). */
  static readonly DEFAULT = new DimenMetrics({width: BASE_WIDTH_DP, height: BASE_HEIGHT_DP});
}

function checkedK(k: number): number {
  if (!isFinite(k)) throw new RangeError('customSensitivityK must be finite');
  return k;
}

function checkedMultiplier(m: number): number {
  if (!isFinite(m)) {
    throw new RangeError('customSensitivityK produces a non-finite dimension multiplier');
  }
  return m;
}

/** @internal Logarithmic curve shared by the default and axis paths. */
export function logarithmicCurve(dim: number): number {
  if (dim > BASE_WIDTH_DP) return 1 + 0.4 * Math.log(dim * INV_BASE_RATIO);
  if (dim > 0) return 1 - 0.4 * Math.log(BASE_WIDTH_DP / dim);
  return 1;
}

/**
 * The strategy formulas — a faithful port of every `calculate<Strategy>Dp` in the Android
 * satellites (Sp variants use the same formula).
 * @internal
 */
export function computeFactor(
  m: DimenMetrics,
  strategy: number,
  q: number,
  inv: number,
  flags: number,
  k: number | null,
): number {
  if ((flags & FLAG_IMW) !== 0 && m.isInMultiWindowMode) return 1;
  const ar = (flags & FLAG_AR) !== 0;
  const actual = effectiveQualifierIndex(q, inv, m.isLandscape, m.isPortrait);
  const isDefaultSw = q === Q_SW && inv === 0;

  switch (strategy) {
    case ScalingStrategy.SCALED: {
      if (isDefaultSw && k == null) return m.scaledMultiplier(ar, null);
      const dim = m.readAxis(actual);
      if (!ar) return dim * INV_BASE_RATIO;
      const adj = (k == null ? SENSITIVITY_DEFAULT : checkedK(k)) * m.logNormalizedAspectRatio;
      return checkedMultiplier(1 + (dim - BASE_WIDTH_DP) * (ADJUSTMENT_SCALE + adj));
    }
    case ScalingStrategy.PERCENT: {
      const dim = m.readAxis(actual);
      if (!ar) return dim * INV_BASE_RATIO;
      const adj = (k == null ? SENSITIVITY_DEFAULT : checkedK(k)) * m.logNormalizedAspectRatio;
      return checkedMultiplier(1 + (dim - BASE_WIDTH_DP) * (ADJUSTMENT_SCALE + adj));
    }
    default:
      break;
  }

  let base: number;
  switch (strategy) {
    case ScalingStrategy.POWER:
      base = isDefaultSw ? m.powerScale : Math.pow(m.readAxis(actual) / BASE_WIDTH_DP, 0.75);
      break;
    case ScalingStrategy.FLUID: {
      const dim = m.readAxis(actual);
      base = dim <= 320 ? 0.8 : dim >= 768 ? 1.2 : 0.8 + (0.4 * (dim - 320)) / (768 - 320);
      break;
    }
    case ScalingStrategy.AUTO: {
      const dim = m.readAxis(actual);
      base =
        dim <= 480
          ? dim * INV_BASE_RATIO
          : 480 * INV_BASE_RATIO + 0.4 * Math.log(1 + (dim - 480) * INV_BASE_RATIO);
      break;
    }
    case ScalingStrategy.DIAGONAL:
      base = m.diagonalScale;
      break;
    case ScalingStrategy.FILL:
      base = Math.max(m.minDimensionDp / BASE_WIDTH_DP, m.maxDimensionDp / BASE_HEIGHT_DP);
      break;
    case ScalingStrategy.FIT:
      base = Math.min(m.minDimensionDp / BASE_WIDTH_DP, m.maxDimensionDp / BASE_HEIGHT_DP);
      break;
    case ScalingStrategy.INTERPOLATED:
      base = isDefaultSw ? m.interpolatedScale : 0.5 + 0.5 * m.readAxis(actual) * INV_BASE_RATIO;
      break;
    case ScalingStrategy.LOGARITHMIC:
      base = isDefaultSw ? m.logarithmicScale : logarithmicCurve(m.readAxis(actual));
      break;
    case ScalingStrategy.PERIMETER:
      base = m.perimeterScale;
      break;
    case ScalingStrategy.DENSITY:
      base = m.density;
      break;
    default:
      throw new RangeError(`Unknown scaling strategy: ${strategy}`);
  }
  return ar ? base * m.aspectRatioMultiplier(k) : base;
}
