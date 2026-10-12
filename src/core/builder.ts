/**
 * Custom-dimension builders — port of Android `DimenScaled` / `ScaledSp` and the strategy
 * builders (`DimenPower`, `DimenAuto`, …).
 *
 * Builders are immutable: every configuration call returns a new instance, so a builder can be
 * declared once at module scope and read during render (values resolve against the current
 * window snapshot at access time).
 *
 * Priority of `screen(...)` entries (same as Android):
 *   1. UI mode + qualifier threshold   2. UI mode only
 *   3. qualifier threshold only        4. orientation only
 * Within the same priority, larger qualifier thresholds are evaluated first.
 */
import {store} from './DimenCache';
import {INVERTER_INDEX, QUALIFIER_INDEX, Q_H, Q_SW, Q_W} from './DimenMetrics';
import {Kind, orientationMatches, resolveWith, spKind} from './kernels';
import {DpQualifier, Inverter, Orientation, UiModeType} from './types';

/** One conditional entry of a builder (Android `CustomDpEntry` / `CustomSpEntry`). */
export interface ScreenEntry {
  uiModeType?: UiModeType | null;
  qualifierType?: DpQualifier | null;
  qualifierValue?: number | null;
  orientation?: Orientation | null;
  customValue: number;
  finalQualifierResolver?: DpQualifier | null;
  inverter?: Inverter | null;
  /** Sp builders only: respect the font scale for this entry (default `true`). */
  fontScale?: boolean;
}

interface InternalEntry extends ScreenEntry {
  priority: number;
}

const UI_MODES = new Set<string>(Object.values(UiModeType));
const QUALIFIERS = new Set<string>(Object.values(DpQualifier));
const ORIENTATIONS = new Set<string>(Object.values(Orientation));

function isUiMode(v: unknown): v is UiModeType {
  return typeof v === 'string' && UI_MODES.has(v);
}
function isQualifier(v: unknown): v is DpQualifier {
  return typeof v === 'string' && QUALIFIERS.has(v);
}
function isOrientation(v: unknown): v is Orientation {
  return typeof v === 'string' && ORIENTATIONS.has(v);
}

function inferPriority(e: ScreenEntry): number {
  const hasUi = e.uiModeType != null;
  const hasQ = e.qualifierType != null && e.qualifierValue != null;
  if (hasUi && hasQ) return 1;
  if (hasUi) return 2;
  if (hasQ) return 3;
  return 4;
}

function num(v: unknown, name: string): number {
  if (typeof v !== 'number' || !isFinite(v)) {
    throw new TypeError(`screen(): '${name}' must be a finite number, got ${String(v)}`);
  }
  return v;
}

/** Parses every Android `screen(...)` overload (or a single {@link ScreenEntry} object). */
function parseScreenArgs(args: unknown[]): InternalEntry {
  const a0 = args[0];
  if (args.length === 1 && a0 !== null && typeof a0 === 'object') {
    const e = a0 as ScreenEntry;
    num(e.customValue, 'customValue');
    return {...e, priority: inferPriority(e)};
  }
  if (isUiMode(a0)) {
    if (isQualifier(args[1])) {
      // (uiModeType, qualifierType, qualifierValue, customValue, finalQualifierResolver?, orientation?, inverter?)
      // (uiModeType, qualifierType, qualifierValue, orientation, customValue, finalQualifierResolver?, inverter?)
      if (isOrientation(args[3])) {
        return {
          priority: 1,
          uiModeType: a0,
          qualifierType: args[1],
          qualifierValue: num(args[2], 'qualifierValue'),
          orientation: args[3],
          customValue: num(args[4], 'customValue'),
          finalQualifierResolver: (args[5] as DpQualifier) ?? null,
          inverter: (args[6] as Inverter) ?? null,
        };
      }
      return {
        priority: 1,
        uiModeType: a0,
        qualifierType: args[1],
        qualifierValue: num(args[2], 'qualifierValue'),
        customValue: num(args[3], 'customValue'),
        finalQualifierResolver: (args[4] as DpQualifier) ?? null,
        orientation: (args[5] as Orientation) ?? null,
        inverter: (args[6] as Inverter) ?? null,
      };
    }
    // (uiModeType, customValue, finalQualifierResolver?, orientation?, inverter?)
    return {
      priority: 2,
      uiModeType: a0,
      customValue: num(args[1], 'customValue'),
      finalQualifierResolver: (args[2] as DpQualifier) ?? null,
      orientation: (args[3] as Orientation) ?? null,
      inverter: (args[4] as Inverter) ?? null,
    };
  }
  if (isQualifier(a0)) {
    // (qualifierType, qualifierValue, customValue, finalQualifierResolver?, orientation?, inverter?)
    return {
      priority: 3,
      qualifierType: a0,
      qualifierValue: num(args[1], 'qualifierValue'),
      customValue: num(args[2], 'customValue'),
      finalQualifierResolver: (args[3] as DpQualifier) ?? null,
      orientation: (args[4] as Orientation) ?? null,
      inverter: (args[5] as Inverter) ?? null,
    };
  }
  if (isOrientation(a0)) {
    // (orientation, customValue, finalQualifierResolver?, inverter?)
    return {
      priority: 4,
      orientation: a0,
      customValue: num(args[1], 'customValue'),
      finalQualifierResolver: (args[2] as DpQualifier) ?? null,
      inverter: (args[3] as Inverter) ?? null,
    };
  }
  throw new TypeError(
    'screen(): first argument must be a UiModeType, DpQualifier, Orientation or an entry object',
  );
}

/**
 * Base class of every builder. Subclasses (generated per strategy) only add the prefixed
 * terminal getters (`sdp`, `pwsdp`, `ssp`, …).
 */
export abstract class DimenBuilderBase {
  /** @internal */ protected _strategy: number;
  /** @internal */ protected _base: number;
  /** @internal */ protected _entries: readonly InternalEntry[] = [];
  /** @internal */ protected _ar = false;
  /** @internal */ protected _imw = false;
  /** @internal */ protected _k: number | null = null;

  protected constructor(strategy: number, initialBaseValue: number) {
    if (typeof initialBaseValue !== 'number' || !isFinite(initialBaseValue)) {
      throw new TypeError(`initial base value must be a finite number, got ${initialBaseValue}`);
    }
    this._strategy = strategy;
    this._base = initialBaseValue;
  }

  /** @internal Shallow clone keeping the concrete subclass. */
  protected _copy(patch: Record<string, unknown>): this {
    const c = Object.create(Object.getPrototypeOf(this)) as this;
    Object.assign(c, this, patch);
    return c;
  }

  /** Enables (or disables) the aspect-ratio correction. */
  applyAspectRatio(apply = true): this {
    return this._copy({_ar: apply});
  }

  /** Compose-style alias: aspect ratio on/off with an optional custom sensitivity `k`. */
  aspectRatio(enable = true, sensitivityK: number | null = null): this {
    if (sensitivityK != null && !isFinite(sensitivityK)) {
      throw new RangeError('sensitivityK must be finite');
    }
    return this._copy({_ar: enable, _k: sensitivityK});
  }

  /** Returns the base value unscaled when the window is constrained by multi-window. */
  ignoreMultiWindows(ignore = true): this {
    return this._copy({_imw: ignore});
  }

  /** Adds a conditional value from an entry object (priority inferred from its fields). */
  screen(entry: ScreenEntry): this;
  /** Priority 1 — UI mode + qualifier threshold. */
  screen(
    uiModeType: UiModeType,
    qualifierType: DpQualifier,
    qualifierValue: number,
    customValue: number,
    finalQualifierResolver?: DpQualifier | null,
    orientation?: Orientation | null,
    inverter?: Inverter | null,
  ): this;
  /** Priority 1 — UI mode + qualifier threshold + orientation (Android Float overload order). */
  screen(
    uiModeType: UiModeType,
    qualifierType: DpQualifier,
    qualifierValue: number,
    orientation: Orientation,
    customValue: number,
    finalQualifierResolver?: DpQualifier | null,
    inverter?: Inverter | null,
  ): this;
  /** Priority 2 — UI mode only. */
  screen(
    uiModeType: UiModeType,
    customValue: number,
    finalQualifierResolver?: DpQualifier | null,
    orientation?: Orientation | null,
    inverter?: Inverter | null,
  ): this;
  /** Priority 3 — qualifier threshold only. */
  screen(
    qualifierType: DpQualifier,
    qualifierValue: number,
    customValue: number,
    finalQualifierResolver?: DpQualifier | null,
    orientation?: Orientation | null,
    inverter?: Inverter | null,
  ): this;
  /** Priority 4 — orientation only. */
  screen(
    orientation: Orientation,
    customValue: number,
    finalQualifierResolver?: DpQualifier | null,
    inverter?: Inverter | null,
  ): this;
  screen(...args: unknown[]): this {
    const entry = parseScreenArgs(args);
    const entries = [...this._entries, entry].sort(
      (x, y) => x.priority - y.priority || (y.qualifierValue ?? 0) - (x.qualifierValue ?? 0),
    );
    return this._copy({_entries: entries});
  }

  /** @internal First matching entry for the current snapshot. */
  protected _match(): InternalEntry | undefined {
    const m = store.m;
    for (const e of this._entries) {
      const orientationOk =
        e.orientation === Orientation.LANDSCAPE || e.orientation === Orientation.PORTRAIT
          ? orientationMatches(e.orientation, m)
          : true;
      if (!orientationOk) continue;
      const uiOk = e.uiModeType == null || e.uiModeType === m.uiModeType;
      if (e.priority === 1 || e.priority === 3) {
        const qOk = m.readScreenDp(e.qualifierType as DpQualifier) >= (e.qualifierValue as number);
        if (qOk && (e.priority === 3 || uiOk)) return e;
      } else if (e.priority === 4 || uiOk) {
        return e;
      }
    }
    return undefined;
  }

  /** @internal */
  protected _resolve(qualifier: DpQualifier, kind: number, forceNoFontScale = false): number {
    const e = this._match();
    const value = e ? e.customValue : this._base;
    const finalQ = e?.finalQualifierResolver ?? qualifier;
    const inv = e?.inverter ? INVERTER_INDEX[e.inverter] : 0;
    let k = kind;
    if (kind === Kind.SP || kind === Kind.SP_PX) {
      const fs = !forceNoFontScale && e?.fontScale !== false;
      k = spKind(fs, kind === Kind.SP_PX);
    }
    return resolveWith(
      this._strategy,
      value,
      QUALIFIER_INDEX[finalQ],
      inv,
      this._ar,
      this._imw,
      this._k,
      k,
    );
  }
}

/** Dp builder base: generic terminals in dp and px. */
export abstract class DimenDpBuilder extends DimenBuilderBase {
  /** Resolves on `qualifier` in dp. */
  dp(qualifier: DpQualifier = DpQualifier.SMALL_WIDTH): number {
    return this._resolve(qualifier, Kind.DP);
  }

  /** Resolves on `qualifier` in physical pixels. */
  px(qualifier: DpQualifier = DpQualifier.SMALL_WIDTH): number {
    return this._resolve(qualifier, Kind.PX);
  }

  /** `[sdp, hdp, wdp]` in px (Android `sdpHdpWdpPx`). */
  sdpHdpWdpPx(): [number, number, number] {
    return [
      this._resolve(DpQualifier.SMALL_WIDTH, Kind.PX),
      this._resolve(DpQualifier.HEIGHT, Kind.PX),
      this._resolve(DpQualifier.WIDTH, Kind.PX),
    ];
  }
}

/** Sp builder base: generic terminals for font sizes. */
export abstract class DimenSpBuilder extends DimenBuilderBase {
  /** Font size (sp) on `qualifier`; React Native applies the font scale. */
  sp(qualifier: DpQualifier = DpQualifier.SMALL_WIDTH): number {
    return this._resolve(qualifier, Kind.SP);
  }

  /** Font size that ignores the user font scale. */
  em(qualifier: DpQualifier = DpQualifier.SMALL_WIDTH): number {
    return this._resolve(qualifier, Kind.SP, true);
  }

  /** Font size in physical pixels (font scale applied). */
  spPx(qualifier: DpQualifier = DpQualifier.SMALL_WIDTH): number {
    return this._resolve(qualifier, Kind.SP_PX);
  }

  /** Font size in physical pixels ignoring the font scale. */
  emPx(qualifier: DpQualifier = DpQualifier.SMALL_WIDTH): number {
    return this._resolve(qualifier, Kind.SP_PX, true);
  }
}

/** @internal Axis indices re-exported for generated code. */
export const AXIS = {SW: Q_SW, H: Q_H, W: Q_W} as const;
