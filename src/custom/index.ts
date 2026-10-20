/**
 * Custom scaling strategies for React Native — port of Android `appdimens-dynamic-custom`.
 *
 *   import {defineCustomStrategy, cdp, csp} from 'appdimens-react-native/custom';
 *
 *   const brand = defineCustomStrategy({
 *     id: 'brand',
 *     reference: {width: 360, height: 640},
 *     curve: {type: 'power', exponent: 0.8},
 *     clamp: {min: 0.85, max: 1.6},
 *     rules: [{when: {device: 'tablet'}, set: {curve: {type: 'logarithmic', k: 0.4}}}],
 *   });
 *   cdp(16, brand);   // dp for the current window
 *   csp(14, brand);   // text (font-scale policy applied)
 *
 * The JSON format is shared with every AppDimens platform (`custom-strategy.schema.json`).
 * The class is called `CustomScalingStrategy` because `ScalingStrategy` is already the
 * built-in strategy enum of this package.
 */
import * as React from 'react';
import {Platform} from 'react-native';
import {store} from '../core/DimenCache';
import type {DimenMetrics} from '../core/DimenMetrics';
import {UiModeType} from '../core/types';
import {useLocalDimenMetrics} from '../react/AppDimensProvider';
import {
  BUILT_IN_SPECS,
  configFromSpec,
  configToSpec,
  DEFAULT_CONFIG,
  isValueDependent,
  parseStrategiesDocument,
  PRESET_SPECS,
  resolveScaling,
  ResolvedScaling,
  TABLET_MIN_SMALLEST_WIDTH_DP,
} from './engine';
import type {
  DeviceClass,
  ScalingAxis,
  ScalingConfig,
  ScalingPatchSpec,
  ScalingRuleSpec,
  ScalingStrategiesDocument,
  ScalingStrategySpec,
  ScreenSnapshot,
} from './engine';

export * from './engine';
export * from './expression';

// ── Window snapshot → ScreenSnapshot ───────────────────────────────────────────

let deviceResolver: ((m: DimenMetrics) => DeviceClass) | null = null;

/**
 * Overrides device-class detection. `null` restores the default: UI mode (TV / car / watch /
 * desk / VR), `Platform.isTV`, desktop platforms (`macos`, `windows`), then `sw >= 600` →
 * tablet, else phone.
 */
export function setDeviceClassResolver(resolver: ((m: DimenMetrics) => DeviceClass) | null): void {
  deviceResolver = resolver;
}

/** Default device classification for a React Native snapshot. */
export function defaultDeviceClass(m: DimenMetrics): DeviceClass {
  switch (m.uiModeType) {
    case UiModeType.TELEVISION:
      return 'tv';
    case UiModeType.CAR:
      return 'car';
    case UiModeType.WATCH:
      return 'watch';
    case UiModeType.DESK:
      return 'desktop';
    case UiModeType.VR_HEADSET:
      return 'vr';
  }
  const platform = Platform as {OS?: string; isTV?: boolean};
  if (platform.isTV) return 'tv';
  if (platform.OS === 'macos' || platform.OS === 'windows') return 'desktop';
  return m.smallestWidthDp >= TABLET_MIN_SMALLEST_WIDTH_DP ? 'tablet' : 'phone';
}

/** Platform-free snapshot of a `DimenMetrics`. */
export function toScreenSnapshot(m: DimenMetrics): ScreenSnapshot {
  return Object.freeze({
    widthDp: m.screenWidthDp,
    heightDp: m.screenHeightDp,
    smallestWidthDp: m.smallestWidthDp,
    density: m.density,
    fontScale: m.fontScale,
    isLandscape: m.isLandscape,
    isMultiWindow: m.isInMultiWindowMode,
    device: (deviceResolver ?? defaultDeviceClass)(m),
  });
}

// ── Strategy ───────────────────────────────────────────────────────────────────

/**
 * A named, immutable custom strategy. The factor is memoized per window snapshot, so `dp(16)` is
 * one multiply (plus optional value bounds).
 */
export class CustomScalingStrategy {
  /** True when results depend on the value itself (value bounds / transform). */
  readonly valueDependent: boolean;
  private memoKey: DimenMetrics | null = null;
  private memo: ResolvedScaling | null = null;

  constructor(
    readonly id: string,
    readonly config: ScalingConfig,
  ) {
    if (!id || !id.trim()) throw new TypeError('strategy id must not be blank');
    this.valueDependent = isValueDependent(config);
    Object.freeze(this.config);
  }

  /** Resolution for `metrics` (default: current window) — memoized per snapshot. */
  resolve(metrics: DimenMetrics = store.m): ResolvedScaling {
    if (this.memoKey === metrics && this.memo) return this.memo;
    const r = resolveScaling(this.config, toScreenSnapshot(metrics));
    this.memoKey = metrics;
    this.memo = r;
    return r;
  }

  /** Resolution for an explicit platform-free snapshot (tests, previews). */
  resolveScreen(screen: ScreenSnapshot): ResolvedScaling {
    return resolveScaling(this.config, screen);
  }

  /** Screen-only factor. */
  factor(metrics?: DimenMetrics): number {
    return this.resolve(metrics).factor;
  }

  /** `value` dp → scaled dp (use directly in styles). */
  dp(value: number, metrics?: DimenMetrics): number {
    return this.resolve(metrics).scale(value);
  }

  /** `value` dp → physical px. */
  px(value: number, metrics?: DimenMetrics): number {
    const r = this.resolve(metrics);
    return r.scale(value) * r.screen.density;
  }

  /**
   * Text `fontSize` for `<Text>` (React Native multiplies by the font scale itself unless
   * `allowFontScaling={false}`); the strategy font-scale policy is pre-compensated.
   */
  sp(value: number, metrics?: DimenMetrics): number {
    return this.resolve(metrics).scaleSpUnits(value);
  }

  /** Text size in dp after the effective font scale (for `allowFontScaling={false}` / layout math). */
  spDp(value: number, metrics?: DimenMetrics): number {
    return this.resolve(metrics).scaleSpDp(value);
  }

  /** Text size in physical px. */
  spPx(value: number, metrics?: DimenMetrics): number {
    const r = this.resolve(metrics);
    return r.scaleSpDp(value) * r.screen.density;
  }

  /** Debug breakdown. */
  explain(metrics?: DimenMetrics): string {
    return this.resolve(metrics).explain(this.id);
  }

  /** New strategy starting from this one (parent rules first). Registered unless `register: false`. */
  extend(
    id: string,
    patch: ScalingPatchSpec & {rules?: readonly ScalingRuleSpec[]} = {},
    options: {register?: boolean} = {},
  ): CustomScalingStrategy {
    const s = new CustomScalingStrategy(id, configFromSpec(patch, this.config, id));
    return options.register === false ? s : registerCustomStrategy(s);
  }

  /** Same strategy on another axis. Id `"<id>@<axis>"`, cached. */
  withAxis(axis: ScalingAxis): CustomScalingStrategy {
    if (axis === this.config.axis) return this;
    const id = `${this.id}@${axis}`;
    let s = derived.get(id);
    if (!s || s.config.rules !== this.config.rules) {
      s = new CustomScalingStrategy(id, Object.freeze({...this.config, axis}));
      derived.set(id, s);
    }
    return s;
  }

  /** JSON-ready spec (throws for function curves / transforms). */
  toJSON(): ScalingStrategySpec {
    return configToSpec(this.id, this.config);
  }
}

// ── Registry ───────────────────────────────────────────────────────────────────

const registry = new Map<string, CustomScalingStrategy>();
const derived = new Map<string, CustomScalingStrategy>();
let defaultStrategy: CustomScalingStrategy | null = null;

const fromSpec = (s: ScalingStrategySpec): CustomScalingStrategy =>
  new CustomScalingStrategy(s.id, configFromSpec(s, DEFAULT_CONFIG, s.id));

/** The built-in strategies as custom configs — parents for `extend` / `"extends"`. */
export const BuiltInStrategies = Object.freeze({
  SCALED: fromSpec(BUILT_IN_SPECS.scaled!),
  POWER: fromSpec(BUILT_IN_SPECS.power!),
  LOGARITHMIC: fromSpec(BUILT_IN_SPECS.logarithmic!),
  INTERPOLATED: fromSpec(BUILT_IN_SPECS.interpolated!),
  DIAGONAL: fromSpec(BUILT_IN_SPECS.diagonal!),
  PERIMETER: fromSpec(BUILT_IN_SPECS.perimeter!),
  FIXED: fromSpec(BUILT_IN_SPECS.fixed!),
});

/** Ready-made strategies (found by id in `getCustomStrategy` / `"extends"`). */
export const CustomPresets = Object.freeze({
  TABLET_FRIENDLY: fromSpec(PRESET_SPECS.tabletFriendly!),
  COMPACT_FIRST: fromSpec(PRESET_SPECS.compactFirst!),
  TV_SAFE: fromSpec(PRESET_SPECS.tvSafe!),
  WEARABLE: fromSpec(PRESET_SPECS.wearable!),
  GAME_HUD: fromSpec(PRESET_SPECS.gameHud!),
  READABLE_TEXT: fromSpec(PRESET_SPECS.readableText!),
});

const builtInById = new Map<string, CustomScalingStrategy>(
  [...Object.values(BuiltInStrategies), ...Object.values(CustomPresets)].map(s => [
    s.id.toLowerCase(),
    s,
  ]),
);

/** Registers (or replaces) a strategy instance under its id. */
export function registerCustomStrategy(strategy: CustomScalingStrategy): CustomScalingStrategy {
  registry.set(strategy.id, strategy);
  return strategy;
}

/** Creates **and registers** a strategy from a spec (same shape as the JSON format). */
export function defineCustomStrategy(
  definition: ScalingStrategySpec,
  options: {register?: boolean} = {},
): CustomScalingStrategy {
  let parent = DEFAULT_CONFIG;
  if (definition.extends !== undefined) {
    const p = getCustomStrategy(definition.extends);
    if (!p)
      throw new TypeError(`'${definition.id}' extends unknown strategy '${definition.extends}'`);
    parent = p.config;
  }
  const s = new CustomScalingStrategy(
    definition.id,
    configFromSpec(definition, parent, definition.id),
  );
  return options.register === false ? s : registerCustomStrategy(s);
}

/** Registered strategy, built-in or preset for `id`. */
export function getCustomStrategy(id: string): CustomScalingStrategy | undefined {
  return registry.get(id) ?? builtInById.get(id.toLowerCase());
}

/** Like {@link getCustomStrategy} but throws a descriptive error. */
export function requireCustomStrategy(id: string): CustomScalingStrategy {
  const s = getCustomStrategy(id);
  if (!s)
    throw new TypeError(
      `No scaling strategy '${id}'. Registered: ${[...registry.keys()].sort().join(', ')}`,
    );
  return s;
}

export function unregisterCustomStrategy(id: string): void {
  registry.delete(id);
  if (defaultStrategy?.id === id) defaultStrategy = null;
}

/** Strategies registered by the app (built-ins / presets excluded). */
export function registeredCustomStrategies(): readonly CustomScalingStrategy[] {
  return [...registry.values()];
}

/** Strategy used when none is passed. Default: `BuiltInStrategies.SCALED` (same numbers as `sdp`). */
export function getDefaultCustomStrategy(): CustomScalingStrategy {
  return defaultStrategy ?? BuiltInStrategies.SCALED;
}

export function setDefaultCustomStrategy(strategy: CustomScalingStrategy | string | null): void {
  defaultStrategy = typeof strategy === 'string' ? requireCustomStrategy(strategy) : strategy;
}

/**
 * Parses a strategies document (JSON text or object), registers every strategy and applies its
 * `default`. `loadCustomStrategies(require('./appdimens-strategies.json'))`.
 */
export function loadCustomStrategies(
  input: string | ScalingStrategiesDocument | ScalingStrategySpec | readonly ScalingStrategySpec[],
): Map<string, CustomScalingStrategy> {
  const {configs, defaultId} = parseStrategiesDocument(input, id => getCustomStrategy(id)?.config);
  const out = new Map<string, CustomScalingStrategy>();
  configs.forEach((cfg, id) =>
    out.set(id, registerCustomStrategy(new CustomScalingStrategy(id, cfg))),
  );
  if (defaultId !== undefined)
    setDefaultCustomStrategy(out.get(defaultId) ?? requireCustomStrategy(defaultId));
  return out;
}

/** JSON document for `strategies` (default: every registered strategy). */
export function exportCustomStrategies(
  strategies: readonly CustomScalingStrategy[] = registeredCustomStrategies(),
): ScalingStrategiesDocument {
  return {
    version: 1,
    ...(defaultStrategy ? {default: defaultStrategy.id} : {}),
    strategies: strategies.map(s => s.toJSON()),
  };
}

/** @internal Test helper. */
export function resetCustomStrategiesForTest(): void {
  registry.clear();
  derived.clear();
  defaultStrategy = null;
  deviceResolver = null;
}

/** Resolves an optional strategy argument (instance, id, or the default). */
export function pickCustomStrategy(
  strategy?: CustomScalingStrategy | string | null,
): CustomScalingStrategy {
  return strategy == null
    ? getDefaultCustomStrategy()
    : typeof strategy === 'string'
      ? requireCustomStrategy(strategy)
      : strategy;
}

// ── Short functions, mirroring `sdp` / `ssp` ──────────────────────────────────
/** `value` dp with `strategy` (default strategy when omitted) → dp. */
export const cdp = (value: number, strategy?: CustomScalingStrategy | string): number =>
  pickCustomStrategy(strategy).dp(value);
/** → physical px. */
export const cdpPx = (value: number, strategy?: CustomScalingStrategy | string): number =>
  pickCustomStrategy(strategy).px(value);
/** Text `fontSize` (font-scale policy applied, RN font scaling on). */
export const csp = (value: number, strategy?: CustomScalingStrategy | string): number =>
  pickCustomStrategy(strategy).sp(value);
/** Text → physical px. */
export const cspPx = (value: number, strategy?: CustomScalingStrategy | string): number =>
  pickCustomStrategy(strategy).spPx(value);

/** Strategy helpers bound to one strategy (what the React hook hands out). */
export interface BoundCustomStrategy {
  readonly strategy: CustomScalingStrategy;
  dp(value: number): number;
  px(value: number): number;
  sp(value: number): number;
  spDp(value: number): number;
  spPx(value: number): number;
  factor(): number;
  explain(): string;
}

/** Binds helpers to `strategy` and an optional snapshot (`AppDimensProvider` context). */
export function bindCustomStrategy(
  strategy: CustomScalingStrategy,
  metrics?: DimenMetrics,
): BoundCustomStrategy {
  return Object.freeze({
    strategy,
    dp: (v: number) => strategy.dp(v, metrics),
    px: (v: number) => strategy.px(v, metrics),
    sp: (v: number) => strategy.sp(v, metrics),
    spDp: (v: number) => strategy.spDp(v, metrics),
    spPx: (v: number) => strategy.spPx(v, metrics),
    factor: () => strategy.factor(metrics),
    explain: () => strategy.explain(metrics),
  });
}

// ── React integration ──────────────────────────────────────────────────────────

const CustomStrategyContext = React.createContext<CustomScalingStrategy | null>(null);

/** Every `useCustomStrategy()` without an argument inside `children` uses `strategy`. */
export function CustomStrategyProvider(props: {
  strategy: CustomScalingStrategy | string;
  children?: React.ReactNode;
}): React.ReactElement {
  return React.createElement(
    CustomStrategyContext.Provider,
    {value: pickCustomStrategy(props.strategy)},
    props.children,
  );
}

/**
 * Helpers bound to `strategy` (default: nearest `CustomStrategyProvider`, then the global
 * default), re-rendering on window changes and honouring `AppDimensProvider` snapshots.
 * `const s = useCustomStrategy(); <View style={{padding: s.dp(16)}} />`.
 */
export function useCustomStrategy(strategy?: CustomScalingStrategy | string): BoundCustomStrategy {
  const metrics = useLocalDimenMetrics();
  const scoped = React.useContext(CustomStrategyContext);
  const target =
    strategy === undefined ? (scoped ?? pickCustomStrategy()) : pickCustomStrategy(strategy);
  return React.useMemo(() => bindCustomStrategy(target, metrics), [target, metrics]);
}
