# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Versions are aligned with
[AppDimens Dynamic for Android](https://github.com/bodenberg/appdimens-dynamic).

## [Unreleased]

### Added
- **Custom scaling strategies (`appdimens-react-native/custom`)**, a port of Android `appdimens-dynamic-custom`.
  - **Config format:** the same JSON as every AppDimens platform. It covers reference frame, axis, curves (linear, power, logarithmic, interpolated, constant, breakpoints, function), factor/value bounds, aspect ratio, font-scale policy, and rules per device class / screen range / orientation / multi-window.
  - **Composition:** `extends` built-ins and presets.
  - **APIs:** `defineCustomStrategy`, `loadCustomStrategies`, `cdp` / `csp` / `cdpPx` / `cspPx`, `CustomStrategyProvider` / `useCustomStrategy`, `setDefaultCustomStrategy`, and opt-in `(16).cdp` / `(16).cdpWith(brand)` via `/custom/number`.
  - **Device class** comes from UI mode, `Platform.isTV`, desktop platforms and size, and can be overridden.
  - **Tests:** a cross-platform parity fixture.

## [3.2.0] - 2026-10-12

Complete rewrite as a port of **AppDimens Dynamic 3.2.0** (Android). The 2.x API
(`balanced`, `fx`, `dy`, `AppDimensBuilder`, …) is removed.

### Added
- Core engine: immutable `DimenMetrics` window snapshot with a lazily filled factor table,
  event-driven `DimenCache` watcher (`Dimensions` + `AppState`), UI-mode / multi-window /
  metrics overrides.
- Scaled strategy in the main entry with the Android names: `sdp`, `hdp`, `wdp`, `ssp`, `hsp`,
  `wsp`, `sem`, `hem`, `wem`, suffixes `a`, `i`, `ia`, inverters `Ph`/`Lh`/`Pw`/`Lw`, `Px`
  variants (264 kernels per strategy).
- 11 strategy sub-paths mirroring the satellites: `percent`, `power`, `fluid`, `auto`,
  `diagonal`, `fill`, `fit`, `interpolated`, `logarithmic`, `perimeter`, `density`.
- Conditional facilitators `*Rotate`, `*Mode`, `*Qualifier`, `*Screen` with `Px`, `Plain`,
  `PlainPx` variants, and logic-only `plainRotate/Mode/Qualifier/Screen`.
- Builders `scaledDp` / `scaledSp` and one pair per strategy with every Android `screen(...)`
  overload and priority rule.
- `toDynamic<Strategy>{Dp,Px,Sp,SpPx}` escape hatches (positional Android order or options).
- Percent literal helpers `spaceW`, `spaceH`, `spaceSw`, `space(...)` and Sp/Px variants.
- Resize module: `ResizeRange`, `ResizeBound`, `DimenResize`, `AutoResizeText`,
  `useAutoResizeTextSp`, `useAutoResize{Square,Width,Height}Size[Percent]`.
- Physical units module: `mm`, `cm`, `inch`, `DimenPhysicalUnits`.
- React integration: `useDimenMetrics`, `AppDimensProvider`, `useLocalDimenMetrics`,
  `createDimenStyles`, `DimenStyleSheet` (string tokens such as `'16sdp'`).
- Opt-in Kotlin-style Number extensions: `import 'appdimens-react-native/number'` → `(16).sdp`.
- Parity test-suite comparing every generated kernel with the Kotlin formulas on 7 window
  configurations, React tests, compiled-package smoke test (CJS + ESM), benchmark, CI and
  release workflows.
