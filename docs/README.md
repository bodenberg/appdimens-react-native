# AppDimens for React Native: guides

Responsive dimension helpers for React Native. Each strategy has its own guide. Start with the scaled guide, and change strategy only where a layout needs a different curve.

## Cross-cutting guides

- [API conventions](API-CONVENTIONS.md) — prefixes, suffixes, `Px` naming, facilitators, Plain chains, builders, escape hatches.
- [Migrating from Android](MIGRATION-FROM-ANDROID.md) — Compose/Views → React Native translation and behavioural differences.
- [Performance](PERFORMANCE.md) — snapshot + factor-table architecture and benchmark.
- [Agent skill](../skills/SKILL.md) — workflow for AI assistants working with the library.

## Strategy index

| Guide | Import | Prefix | When to use |
|---|---|---|---|
| [Scaled](scaled.md) | `appdimens-react-native` | none | Default for spacing, sizes and text. Start here. |
| [Percent](percent.md) | `/percent` | `p` | A literal share of the screen, such as "30% of the width". |
| [Power](power.md) | `/power` | `pw` | Large screens where linear growth is too strong. |
| [Fluid](fluid.md) | `/fluid` | `f` | Type and spacing that should stay steady on phones. |
| [Auto](auto.md) | `/auto` | `a` | Phone-first tokens that should not double on tablets. |
| [Diagonal](diagonal.md) | `/diagonal` | `dg` | Sizes that follow the overall canvas, such as boards. |
| [Fill](fill.md) | `/fill` | `fl` | Backgrounds, hero images and full-bleed sections. |
| [Fit](fit.md) | `/fit` | `ft` | Readable content boxes that must not overflow. |
| [Interpolated](interpolated.md) | `/interpolated` | `i` | Halfway between a fixed value and the linear value. |
| [Logarithmic](logarithmic.md) | `/logarithmic` | `log` | Damped growth across a wide range of sizes. |
| [Perimeter](perimeter.md) | `/perimeter` | `pr` | Cards whose size follows width plus height. |
| [Density](density.md) | `/density` | `d` | Matching pixel-density buckets of static assets. |
| [Resize](resize.md) | `/resize` | none | Fitting text and boxes inside a container. |
| [Physical units](physical-units.md) | `/units` | none | Real-world values in mm, cm and inches. |
| [Custom](custom.md) | `/custom` | `cdp` / `csp` | Your own strategy (config / JSON shared with every AppDimens platform, rules per device and screen). |

"Import" is the path after `appdimens-react-native`. For example, `appdimens-react-native/power`.

## Shared conventions

- **Names.** Each strategy module has the same family, with its prefix: `sdp`, `hdp`, `wdp` (dp on the smallest side, height and width), `ssp`, `hsp`, `wsp` (font sizes), and `sem`, `hem`, `wem` (fixed font sizes). Example: `pwsdp` in the power module.
- **Suffixes.** `Px` returns physical pixels. `a` applies the aspect-ratio correction. Inverters `Ph`, `Lh`, `Pw` and `Lw` read another axis by orientation (see the scaled guide). Variants with `i` or `ia` (ignore multi-window) also exist and are not covered here.
- **Facilitators.** `<prefix>sdpRotate`, `...Mode`, `...Qualifier` and `...Screen`, each with `Px`, `Plain` and `PlainPx` variants, for dp and sp.
- **Builders.** `<strategy>Dp(v)` and `<strategy>Sp(v)`, for example `powerDp(16).screen(UiModeType.TELEVISION, 24).pwsdp`.
- **Number extensions.** Opt in with `import 'appdimens-react-native/number'` (or `.../<strategy>/number`), then `(16).sdp`.
- **Font sizes.** Use `ssp`, `hsp`, `wsp` or `sem` for `fontSize`. Do not use `*Px` values there, because React Native would apply the font scale twice.
- **Reactivity.** Functions read the current window when they are called. A component re-renders on rotation only if it subscribes with `useDimenMetrics()` (alias `useAppDimens()`), or uses `DimenStyleSheet` or `createDimenStyles`.
- **Overrides.** `DimenCache.setUiModeType(UiModeType.FOLD_OPEN)` and `DimenCache.setMetricsOverride({...})` change what the library sees, for example on a foldable or in a preview. `AppDimensProvider` provides the same as a component.

## Reference values

The example values in these guides assume a 360 x 800 dp portrait window, density 3 and font scale 1, so the smallest side is 360 dp. Constants exported from the root import: `BASE_WIDTH_DP` (300), `BASE_HEIGHT_DP` (533), `BASE_DIAGONAL_DP` (611.6305), `BASE_PERIMETER_DP` (833) and `REFERENCE_ASPECT_RATIO` (1.78).

## Choosing a strategy

1. Start with [scaled](scaled.md) for the whole screen.
2. Check the layout on a small phone and on a large tablet.
3. Where the curve is wrong, switch only that component family: wide screens to [power](power.md), [logarithmic](logarithmic.md) or [auto](auto.md); phone text to [fluid](fluid.md); backgrounds to [fill](fill.md); readable boxes to [fit](fit.md).
