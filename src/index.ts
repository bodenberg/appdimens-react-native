/**
 * AppDimens Dynamic for React Native.
 *
 * Main entry = Android principal artifact (`appdimens-dynamic`): core + **scaled** strategy
 * (`sdp`, `hdp`, `wdp`, `ssp`, `sem`, facilitators, builders) + React integration.
 *
 * Other strategies live in sub-paths, mirroring the Android satellites:
 *   appdimens-react-native/{percent,power,fluid,auto,diagonal,fill,fit,interpolated,
 *                            logarithmic,perimeter,density,resize,units}
 */

// Shared types and enums (com.appdimens.dynamic.common)
export {
  DpQualifier,
  Inverter,
  Orientation,
  UiModeType,
  UnitType,
  ScalingStrategy,
} from './core/types';
export type {
  DimenFn,
  DimenOptions,
  DpQualifierEntry,
  FacilitatorOptions,
  SpFacilitatorOptions,
} from './core/types';

// Core engine (com.appdimens.dynamic.core)
export {DimenCache} from './core/DimenCache';
export {
  DimenMetrics,
  effectiveQualifier,
  BASE_WIDTH_DP,
  BASE_HEIGHT_DP,
  BASE_DIAGONAL_DP,
  BASE_PERIMETER_DP,
  REFERENCE_ASPECT_RATIO,
  INV_BASE_RATIO,
  ADJUSTMENT_SCALE,
  SENSITIVITY_DEFAULT,
} from './core/DimenMetrics';
export type {DimenMetricsInput} from './core/DimenMetrics';
export {
  Kind,
  plainRotate,
  plainMode,
  plainQualifier,
  plainScreen,
  plainRotatePx,
  plainModePx,
  plainQualifierPx,
  plainScreenPx,
} from './core/kernels';
export type {
  RotateFn,
  ModeFn,
  QualifierFn,
  ScreenFn,
  ToDynamicFn,
  ToDynamicSpFn,
  ToDynamicOptions,
  ToDynamicSpOptions,
} from './core/kernels';
export {DimenBuilderBase, DimenDpBuilder, DimenSpBuilder} from './core/builder';
export type {ScreenEntry} from './core/builder';
export {installNumberExtensions, uninstallNumberExtensions} from './core/numberExtensions';

// Scaled strategy (com.appdimens.dynamic.compose / code.scaled)
export * from './strategies/scaled';

// React integration
export {useDimenMetrics, useAppDimens} from './react/hooks';
export {AppDimensProvider, useLocalDimenMetrics} from './react/AppDimensProvider';
export type {AppDimensProviderProps} from './react/AppDimensProvider';
export {createDimenStyles, DimenStyleSheet} from './react/styles';
export type {DimenStylesHook, DimenToken} from './react/styles';

/** Library version (aligned with appdimens-dynamic for Android). */
export const VERSION = '3.2.0';
