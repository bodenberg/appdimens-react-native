# AppDimens Dynamic for React Native — library map

Read this when you need module locations, the Android ↔ React Native correspondence or core types.

## Entry points (npm `appdimens-react-native` 3.2.0)

| Import | Android artifact | Source |
|---|---|---|
| `appdimens-react-native` | `appdimens-dynamic` (principal) | `src/index.ts` → `src/core/*`, `src/strategies/scaled`, `src/react/*` |
| `appdimens-react-native/<strategy>` | `appdimens-dynamic-<strategy>` | `src/strategies/<strategy>/index.ts` (generated) |
| `appdimens-react-native/<strategy>/number` | — | `src/strategies/<strategy>/number.ts` (generated, opt-in `Number.prototype` getters) |
| `appdimens-react-native/number` | — | `src/number.ts` (scaled getters) |
| `appdimens-react-native/resize` | `appdimens-dynamic-resize` | `src/resize/*` |
| `appdimens-react-native/units` | `appdimens-dynamic-units` | `src/units/index.ts` |

Strategies: `percent` (p), `power` (pw), `fluid` (f), `auto` (a), `diagonal` (dg), `fill` (fl), `fit` (ft), `interpolated` (i), `logarithmic` (log), `perimeter` (pr), `density` (d). Resolution: package `exports` map, plus root proxy folders (`power/package.json`, …) for old Metro / TypeScript `moduleResolution: node`.

## Source layout

- **`src/core/types.ts`** — enums (`DpQualifier`, `Inverter`, `Orientation`, `UiModeType`, `UnitType`, `ScalingStrategy`) and option types. Mirrors `com.appdimens.dynamic.common`.
- **`src/core/DimenMetrics.ts`** — immutable window snapshot (Android `DimenMetrics`), design constants, `effectiveQualifier`, and `computeFactor` — the single source of truth for every strategy formula. Each snapshot owns a lazily filled `Float64Array` factor table.
- **`src/core/DimenCache.ts`** — global store + event-driven watcher (`Dimensions` 'change', `AppState` 'active'), overrides (`setUiModeType`, `setMultiWindowMode`, `setMetricsOverride`), subscriptions.
- **`src/core/kernels.ts`** — specialized kernels (`kernel(...)`), `toDynamic*` factories, `Rotate/Mode/Qualifier/Screen` factories, logic-only `plain*` helpers.
- **`src/core/builder.ts`** — immutable builder base classes, `screen(...)` overload parsing and priority resolution.
- **`src/core/percentSpace.ts`** — literal `space*` helpers (Android `DimenPercentSpace.kt`).
- **`src/core/numberExtensions.ts`** — `installNumberExtensions` / `uninstallNumberExtensions`.
- **`src/react/`** — `useDimenMetrics`/`useAppDimens`, `AppDimensProvider`/`useLocalDimenMetrics`, `createDimenStyles`, `DimenStyleSheet`.
- **`src/resize/`** — `ResizeMath.ts` (steps, binary search, bounds), `textMeasure.ts` (estimator), `DimenResize.ts`, `hooks.tsx` (`AutoResizeText`, `useAutoResize*`).
- **`src/strategies/*`** — **generated** by `scripts/generate.js` from `scripts/naming.js`.

## Strategy → documentation

| Strategy | Guide |
|---|---|
| scaled | [docs/scaled.md](../docs/scaled.md) |
| percent | [docs/percent.md](../docs/percent.md) |
| power | [docs/power.md](../docs/power.md) |
| fluid | [docs/fluid.md](../docs/fluid.md) |
| auto | [docs/auto.md](../docs/auto.md) |
| diagonal | [docs/diagonal.md](../docs/diagonal.md) |
| fill | [docs/fill.md](../docs/fill.md) |
| fit | [docs/fit.md](../docs/fit.md) |
| interpolated | [docs/interpolated.md](../docs/interpolated.md) |
| logarithmic | [docs/logarithmic.md](../docs/logarithmic.md) |
| perimeter | [docs/perimeter.md](../docs/perimeter.md) |
| density | [docs/density.md](../docs/density.md) |
| resize | [docs/resize.md](../docs/resize.md) |
| units | [docs/physical-units.md](../docs/physical-units.md) |

Cross-cutting: [docs/API-CONVENTIONS.md](../docs/API-CONVENTIONS.md) · [docs/MIGRATION-FROM-ANDROID.md](../docs/MIGRATION-FROM-ANDROID.md) · [docs/PERFORMANCE.md](../docs/PERFORMANCE.md)

## Tooling (this repo)

| Command | Purpose |
|---|---|
| `npm run generate` / `generate:check` | regenerate / verify generated strategy modules |
| `npm test` | unit + parity tests (all kernels vs Kotlin formulas, 7 windows) |
| `npm run validate` | generated check, typecheck, lint, format, tests, build, smoke |
| `npm run bench` | ns/op of compiled kernels |

## What this map intentionally omits

`ignoreMultiWindows`, `*i` and `*ia` suffix workflows — omitted from interactive guidance.
