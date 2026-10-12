/**
 * AppDimens Dynamic for React Native — shared enums and value types.
 *
 * Mirrors `com.appdimens.dynamic.common` (DpQualifier, Inverter, Orientation, UiModeType,
 * UnitType). Enums are plain string constants so they work with `isolatedModules`, tree-shake
 * well and can be compared with `===` exactly like the Kotlin identity compares.
 */

/** Which screen metric drives a scaling curve (Android `DpQualifier`). */
export const DpQualifier = {
  /** Smallest width of the window (swDP). Default for `sdp` / `ssp`. */
  SMALL_WIDTH: 'SMALL_WIDTH',
  /** Current window height in dp. Default for `hdp` / `hsp`. */
  HEIGHT: 'HEIGHT',
  /** Current window width in dp. Default for `wdp` / `wsp`. */
  WIDTH: 'WIDTH',
} as const;
export type DpQualifier = (typeof DpQualifier)[keyof typeof DpQualifier];

/** Orientation-based axis swaps (Android `Inverter`). */
export const Inverter = {
  /** HEIGHT in portrait becomes WIDTH in landscape. */
  PH_TO_LW: 'PH_TO_LW',
  /** WIDTH in portrait becomes HEIGHT in landscape. */
  PW_TO_LH: 'PW_TO_LH',
  /** HEIGHT in landscape becomes WIDTH in portrait. */
  LH_TO_PW: 'LH_TO_PW',
  /** WIDTH in landscape becomes HEIGHT in portrait. */
  LW_TO_PH: 'LW_TO_PH',
  /** SMALL_WIDTH becomes HEIGHT in landscape. */
  SW_TO_LH: 'SW_TO_LH',
  /** SMALL_WIDTH becomes WIDTH in landscape. */
  SW_TO_LW: 'SW_TO_LW',
  /** SMALL_WIDTH becomes HEIGHT in portrait. */
  SW_TO_PH: 'SW_TO_PH',
  /** SMALL_WIDTH becomes WIDTH in portrait. */
  SW_TO_PW: 'SW_TO_PW',
  /** No swap. */
  DEFAULT: 'DEFAULT',
} as const;
export type Inverter = (typeof Inverter)[keyof typeof Inverter];

/** Device orientation (Android `Orientation`). */
export const Orientation = {
  PORTRAIT: 'PORTRAIT',
  LANDSCAPE: 'LANDSCAPE',
  DEFAULT: 'DEFAULT',
} as const;
export type Orientation = (typeof Orientation)[keyof typeof Orientation];

/** Device / UI mode (Android `UiModeType`, including fold/flip states). */
export const UiModeType = {
  NORMAL: 'NORMAL',
  TELEVISION: 'TELEVISION',
  CAR: 'CAR',
  WATCH: 'WATCH',
  DESK: 'DESK',
  APPLIANCE: 'APPLIANCE',
  VR_HEADSET: 'VR_HEADSET',
  UNDEFINED: 'UNDEFINED',
  FOLD_OPEN: 'FOLD_OPEN',
  FOLD_CLOSED: 'FOLD_CLOSED',
  FLIP_OPEN: 'FLIP_OPEN',
  FLIP_CLOSED: 'FLIP_CLOSED',
  FOLD_HALF_OPENED: 'FOLD_HALF_OPENED',
  FLIP_HALF_OPENED: 'FLIP_HALF_OPENED',
} as const;
export type UiModeType = (typeof UiModeType)[keyof typeof UiModeType];

/** Physical / logical unit types (Android `UnitType`). */
export const UnitType = {
  INCH: 'INCH',
  CM: 'CM',
  MM: 'MM',
  SP: 'SP',
  DP: 'DP',
  PX: 'PX',
} as const;
export type UnitType = (typeof UnitType)[keyof typeof UnitType];

/**
 * Scaling strategies (Android `DimenCache.CalcType` / satellite modules).
 * Numeric so they can index the per-snapshot factor table directly.
 */
export const ScalingStrategy = {
  SCALED: 0,
  PERCENT: 1,
  POWER: 2,
  FLUID: 3,
  AUTO: 4,
  DIAGONAL: 5,
  FILL: 6,
  FIT: 7,
  INTERPOLATED: 8,
  LOGARITHMIC: 9,
  PERIMETER: 10,
  DENSITY: 11,
} as const;
export type ScalingStrategy = (typeof ScalingStrategy)[keyof typeof ScalingStrategy];

/** Number of strategies (size of the strategy dimension in the factor table). */
export const STRATEGY_COUNT = 12;

/** A `DpQualifier` threshold entry (Android `DpQualifierEntry`). */
export interface DpQualifierEntry {
  type: DpQualifier;
  value: number;
}

/** Options shared by every scaling call (same meaning as the Kotlin parameters). */
export interface DimenOptions {
  /** Apply the aspect-ratio correction (the `a` suffix). */
  applyAspectRatio?: boolean;
  /** Return the unscaled base when the window is constrained by multi-window (the `i` suffix). */
  ignoreMultiWindows?: boolean;
  /** Custom aspect-ratio sensitivity `k` (only used when `applyAspectRatio` is true). */
  customSensitivityK?: number | null;
}

/** Options for the conditional facilitators (`*Rotate`, `*Mode`, `*Qualifier`, `*Screen`). */
export interface FacilitatorOptions extends DimenOptions {
  /** Axis used to scale the alternate value when the condition matches. */
  finalQualifierResolver?: DpQualifier | null;
}

/** Options for Sp facilitators. */
export interface SpFacilitatorOptions extends FacilitatorOptions {
  /** Respect the user font scale (default `true`). */
  fontScale?: boolean;
}

/** A function that converts a design value into a scaled value. */
export type DimenFn = (value: number) => number;
