/**
 * Resolution kernels and facilitator factories shared by every strategy module.
 *
 * Kernels are created once per exported name (e.g. `sdp`, `pwhdpLw`) with their factor-table
 * index pre-computed, so the hot path is: load `store.m` → read `_f[idx]` → multiply. This is
 * the JS equivalent of the Android "specialized kernels" (`resolveSdpPx`, `resolveSdpaDp`, …).
 */
import {store} from './DimenCache';
import {
  DimenMetrics,
  FLAG_AR,
  FLAG_IMW,
  INVERTER_INDEX,
  QUALIFIER_INDEX,
  factorIndex,
} from './DimenMetrics';
import {
  DimenFn,
  DimenOptions,
  DpQualifier,
  FacilitatorOptions,
  Inverter,
  Orientation,
  SpFacilitatorOptions,
  UiModeType,
} from './types';

/** Output units of a kernel. */
export const Kind = {
  /** dp (layout units — what React Native styles expect). */
  DP: 0,
  /** physical pixels. */
  PX: 1,
  /** sp for `fontSize` — React Native applies the user font scale on top. */
  SP: 2,
  /** physical pixels of a font-scaled sp. */
  SP_PX: 3,
  /** "fixed" sp (`sem`): compensates the font scale so the rendered size ignores it. */
  EM: 4,
  /** physical pixels of a fixed sp. */
  EM_PX: 5,
} as const;
export type Kind = (typeof Kind)[keyof typeof Kind];

/** @internal Applies the unit conversion of `kind` to a scaled dp/sp value. */
export function applyKind(v: number, kind: number, m: DimenMetrics): number {
  switch (kind) {
    case Kind.PX:
    case Kind.EM_PX:
      return v * m.density;
    case Kind.SP_PX:
      return v * m.density * m.fontScale;
    case Kind.EM:
      return v / m.fontScale;
    default:
      return v;
  }
}

/**
 * Creates a specialized kernel for one (strategy, qualifier, inverter, flags, kind) tuple.
 * `q`/`inv` are numeric indices; `flags` is a bit set of FLAG_AR / FLAG_IMW.
 * @internal
 */
export function kernel(
  strategy: number,
  q: number,
  inv: number,
  flags: number,
  kind: number,
): DimenFn {
  const idx = factorIndex(strategy, q, inv, flags);
  switch (kind) {
    case Kind.PX:
    case Kind.EM_PX:
      return v => {
        const m = store.m;
        const f = m._f[idx];
        return v * (f === f ? f : m.fill(idx)) * m.density;
      };
    case Kind.SP_PX:
      return v => {
        const m = store.m;
        const f = m._f[idx];
        return v * (f === f ? f : m.fill(idx)) * m.density * m.fontScale;
      };
    case Kind.EM:
      return v => {
        const m = store.m;
        const f = m._f[idx];
        return (v * (f === f ? f : m.fill(idx))) / m.fontScale;
      };
    default:
      return v => {
        const m = store.m;
        const f = m._f[idx];
        return v * (f === f ? f : m.fill(idx));
      };
  }
}

function flagsOf(applyAspectRatio?: boolean, ignoreMultiWindows?: boolean): number {
  return (applyAspectRatio ? FLAG_AR : 0) | (ignoreMultiWindows ? FLAG_IMW : 0);
}

/**
 * Generic resolution used by facilitators, builders and `toDynamic*` functions.
 * @internal
 */
export function resolveWith(
  strategy: number,
  value: number,
  q: number,
  inv: number,
  applyAspectRatio: boolean | undefined,
  ignoreMultiWindows: boolean | undefined,
  k: number | null | undefined,
  kind: number,
): number {
  const m = store.m;
  return applyKind(
    value * m.factor(strategy, q, inv, flagsOf(applyAspectRatio, ignoreMultiWindows), k),
    kind,
    m,
  );
}

function qIndex(q: DpQualifier | null | undefined, fallback: number): number {
  if (q == null) return fallback;
  const i = QUALIFIER_INDEX[q];
  if (i === undefined) throw new TypeError(`Unknown DpQualifier: ${String(q)}`);
  return i;
}

function invIndex(inv: Inverter | null | undefined): number {
  if (inv == null) return 0;
  const i = INVERTER_INDEX[inv];
  if (i === undefined) throw new TypeError(`Unknown Inverter: ${String(inv)}`);
  return i;
}

/** Options accepted by the `toDynamic*Dp` / `*Px` escape hatches. */
export interface ToDynamicOptions extends DimenOptions {
  inverter?: Inverter;
}

/** Options accepted by the `toDynamic*Sp` / `*SpPx` escape hatches. */
export interface ToDynamicSpOptions extends ToDynamicOptions {
  fontScale?: boolean;
}

/**
 * Signature of `toDynamic<Strategy>Dp` / `toDynamic<Strategy>Px`. Accepts the Android positional
 * parameters or an options object as the third argument.
 */
export interface ToDynamicFn {
  (
    value: number,
    qualifier: DpQualifier,
    inverter?: Inverter,
    ignoreMultiWindows?: boolean,
    applyAspectRatio?: boolean,
    customSensitivityK?: number | null,
  ): number;
  (value: number, qualifier: DpQualifier, options?: ToDynamicOptions): number;
}

/** Signature of `toDynamic<Strategy>Sp` / `toDynamic<Strategy>SpPx`. */
export interface ToDynamicSpFn {
  (
    value: number,
    qualifier: DpQualifier,
    fontScale?: boolean,
    inverter?: Inverter,
    ignoreMultiWindows?: boolean,
    applyAspectRatio?: boolean,
    customSensitivityK?: number | null,
  ): number;
  (value: number, qualifier: DpQualifier, options?: ToDynamicSpOptions): number;
}

/** @internal Builds `toDynamic<Strategy>Dp` (px = false) or `…Px` (px = true). */
export function toDynamicFactory(strategy: number, px: boolean): ToDynamicFn {
  const kind = px ? Kind.PX : Kind.DP;
  return ((
    value: number,
    qualifier: DpQualifier,
    a?: Inverter | ToDynamicOptions,
    ignoreMultiWindows?: boolean,
    applyAspectRatio?: boolean,
    customSensitivityK?: number | null,
  ): number => {
    if (a !== null && typeof a === 'object') {
      return resolveWith(
        strategy,
        value,
        qIndex(qualifier, 0),
        invIndex(a.inverter),
        a.applyAspectRatio,
        a.ignoreMultiWindows,
        a.customSensitivityK,
        kind,
      );
    }
    return resolveWith(
      strategy,
      value,
      qIndex(qualifier, 0),
      invIndex(a as Inverter | undefined),
      applyAspectRatio,
      ignoreMultiWindows,
      customSensitivityK,
      kind,
    );
  }) as ToDynamicFn;
}

/** @internal Builds `toDynamic<Strategy>Sp` (px = false) or `…SpPx` (px = true). */
export function toDynamicSpFactory(strategy: number, px: boolean): ToDynamicSpFn {
  return ((
    value: number,
    qualifier: DpQualifier,
    a?: boolean | ToDynamicSpOptions,
    inverter?: Inverter,
    ignoreMultiWindows?: boolean,
    applyAspectRatio?: boolean,
    customSensitivityK?: number | null,
  ): number => {
    if (a !== null && typeof a === 'object') {
      const fs = a.fontScale !== false;
      return resolveWith(
        strategy,
        value,
        qIndex(qualifier, 0),
        invIndex(a.inverter),
        a.applyAspectRatio,
        a.ignoreMultiWindows,
        a.customSensitivityK,
        spKind(fs, px),
      );
    }
    return resolveWith(
      strategy,
      value,
      qIndex(qualifier, 0),
      invIndex(inverter),
      applyAspectRatio,
      ignoreMultiWindows,
      customSensitivityK,
      spKind(a !== false, px),
    );
  }) as ToDynamicSpFn;
}

/** @internal */
export function spKind(fontScale: boolean, px: boolean): number {
  if (px) return fontScale ? Kind.SP_PX : Kind.EM_PX;
  return fontScale ? Kind.SP : Kind.EM;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conditional facilitators (Rotate / Mode / Qualifier / Screen + Plain variants)
// ─────────────────────────────────────────────────────────────────────────────

/** @internal */
export function orientationMatches(orientation: Orientation | undefined, m: DimenMetrics): boolean {
  if (orientation === Orientation.LANDSCAPE) return m.isLandscape;
  if (orientation === Orientation.PORTRAIT) return m.isPortrait;
  return false;
}

/** @internal */
export function qualifierMatches(type: DpQualifier, threshold: number, m: DimenMetrics): boolean {
  return m.readScreenDp(type) >= threshold;
}

type AnyOpts = SpFacilitatorOptions | undefined;

function kindFor(sp: boolean, px: boolean, opts: AnyOpts): number {
  if (!sp) return px ? Kind.PX : Kind.DP;
  return spKind(opts?.fontScale !== false, px);
}

function scaleBranch(
  strategy: number,
  value: number,
  q: number,
  sp: boolean,
  px: boolean,
  opts: AnyOpts,
): number {
  return resolveWith(
    strategy,
    value,
    q,
    0,
    opts?.applyAspectRatio,
    opts?.ignoreMultiWindows,
    opts?.customSensitivityK,
    kindFor(sp, px, opts),
  );
}

/** `value.sdpRotate(rotationValue, orientation)` — signature of every `*Rotate` facilitator. */
export type RotateFn<O = FacilitatorOptions> = (
  value: number,
  rotationValue: number,
  orientation?: Orientation,
  options?: O,
) => number;

/** Signature of every `*Mode` facilitator. */
export type ModeFn<O = FacilitatorOptions> = (
  value: number,
  modeValue: number,
  uiModeType: UiModeType,
  options?: O,
) => number;

/** Signature of every `*Qualifier` facilitator. */
export type QualifierFn<O = FacilitatorOptions> = (
  value: number,
  qualifiedValue: number,
  qualifierType: DpQualifier,
  qualifierValue: number,
  options?: O,
) => number;

/** Signature of every `*Screen` facilitator. */
export type ScreenFn<O = FacilitatorOptions> = (
  value: number,
  screenValue: number,
  uiModeType: UiModeType,
  qualifierType: DpQualifier,
  qualifierValue: number,
  options?: O,
) => number;

/**
 * Builds a Rotate facilitator.
 * - `plain = false`: both branches are scaled (receiver on `axis`, alternate on
 *   `finalQualifierResolver ?? axis`).
 * - `plain = true`: the receiver is an already-resolved value returned as is; only the alternate
 *   is scaled when the branch is active (Android `*RotatePlain` with a `Number` alternate).
 * @internal
 */
export function rotateFactory(
  strategy: number,
  axis: number,
  sp: boolean,
  px: boolean,
  plain: boolean,
): RotateFn<SpFacilitatorOptions> {
  return (value, rotationValue, orientation = Orientation.LANDSCAPE, options) => {
    if (orientationMatches(orientation, store.m)) {
      const q = qIndex(options?.finalQualifierResolver, axis);
      return scaleBranch(strategy, rotationValue, q, sp, px, options);
    }
    return plain ? value : scaleBranch(strategy, value, axis, sp, px, options);
  };
}

/** @internal Builds a Mode facilitator (see {@link rotateFactory} for `plain`). */
export function modeFactory(
  strategy: number,
  axis: number,
  sp: boolean,
  px: boolean,
  plain: boolean,
): ModeFn<SpFacilitatorOptions> {
  return (value, modeValue, uiModeType, options) => {
    if (store.m.uiModeType === uiModeType) {
      const q = qIndex(options?.finalQualifierResolver, axis);
      return scaleBranch(strategy, modeValue, q, sp, px, options);
    }
    return plain ? value : scaleBranch(strategy, value, axis, sp, px, options);
  };
}

/** @internal Builds a Qualifier facilitator (see {@link rotateFactory} for `plain`). */
export function qualifierFactory(
  strategy: number,
  axis: number,
  sp: boolean,
  px: boolean,
  plain: boolean,
): QualifierFn<SpFacilitatorOptions> {
  return (value, qualifiedValue, qualifierType, qualifierValue, options) => {
    if (qualifierMatches(qualifierType, qualifierValue, store.m)) {
      const q = qIndex(options?.finalQualifierResolver, axis);
      return scaleBranch(strategy, qualifiedValue, q, sp, px, options);
    }
    return plain ? value : scaleBranch(strategy, value, axis, sp, px, options);
  };
}

/** @internal Builds a Screen facilitator (see {@link rotateFactory} for `plain`). */
export function screenFactory(
  strategy: number,
  axis: number,
  sp: boolean,
  px: boolean,
  plain: boolean,
): ScreenFn<SpFacilitatorOptions> {
  return (value, screenValue, uiModeType, qualifierType, qualifierValue, options) => {
    const m = store.m;
    if (m.uiModeType === uiModeType && qualifierMatches(qualifierType, qualifierValue, m)) {
      const q = qIndex(options?.finalQualifierResolver, axis);
      return scaleBranch(strategy, screenValue, q, sp, px, options);
    }
    return plain ? value : scaleBranch(strategy, value, axis, sp, px, options);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logic-only Plain branches (Android `code.plain.DimenPlainBranch`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns `alternate` when the current orientation matches, otherwise `value`.
 * Both values must already be resolved (no scaling is applied) — use it to chain
 * facilitators without scaling twice.
 */
export function plainRotate(
  value: number,
  alternate: number,
  orientation: Orientation = Orientation.LANDSCAPE,
): number {
  return orientationMatches(orientation, store.m) ? alternate : value;
}

/** Returns `alternate` when the current UI mode is `uiModeType`, otherwise `value`. */
export function plainMode(value: number, alternate: number, uiModeType: UiModeType): number {
  return store.m.uiModeType === uiModeType ? alternate : value;
}

/** Returns `alternate` when the `qualifierType` axis is ≥ `qualifierValue` dp. */
export function plainQualifier(
  value: number,
  alternate: number,
  qualifierType: DpQualifier,
  qualifierValue: number,
): number {
  return qualifierMatches(qualifierType, qualifierValue, store.m) ? alternate : value;
}

/** Returns `alternate` when both the UI mode and the qualifier threshold match. */
export function plainScreen(
  value: number,
  alternate: number,
  uiModeType: UiModeType,
  qualifierType: DpQualifier,
  qualifierValue: number,
): number {
  const m = store.m;
  return m.uiModeType === uiModeType && qualifierMatches(qualifierType, qualifierValue, m)
    ? alternate
    : value;
}

/** Px aliases of the logic-only branches (Android `plainRotatePx`, …). */
export const plainRotatePx = plainRotate;
export const plainModePx = plainMode;
export const plainQualifierPx = plainQualifier;
export const plainScreenPx = plainScreen;
