# AppDimens Dynamic for React Native

**Responsive `dp` / `sp` for React Native — the same API as [AppDimens Dynamic for Android](https://github.com/bodenberg/appdimens-dynamic) (3.2.0).**

`sdp`, `hdp`, `wdp`, `ssp`, `sem`, the `a` / `Ph` / `Lw` / `Px` suffixes, 12 scaling strategies, conditional facilitators (`*Rotate`, `*Mode`, `*Qualifier`, `*Screen`), `scaledDp().screen(…)` builders, constraint-based **resize** and **physical units** — with the exact Android formulas, verified by parity tests against every one of the 3,168 generated functions.

- **Pure JavaScript / TypeScript.** No native module, no linking: works with the old and the New Architecture, Expo (managed and bare), Hermes and React Native Web.
- **Fast.** All curves are linear in the design value, so each call is `value × factor` with the factor read from a per-window table (O(1), no allocations). See [Performance](#performance).
- **Event-driven.** An immutable `DimenMetrics` snapshot is rebuilt only when the window actually changes (rotation, resize, split-screen, font scale) — the Android `DimenMetrics` / config-watcher model.
- **Typed.** Every name is a declared, documented export (great autocompletion), plus opt-in `(16).sdp` Number extensions that read exactly like Kotlin.

```tsx
import {sdp, hdp, ssp, useDimenMetrics} from 'appdimens-react-native';

function Card() {
  useDimenMetrics(); // re-render on rotation / resize / font scale
  return (
    <View style={{padding: sdp(16), borderRadius: sdp(12), height: hdp(120)}}>
      <Text style={{fontSize: ssp(18)}}>Hello</Text>
    </View>
  );
}
```

| Android (Compose) | React Native |
|---|---|
| `Modifier.padding(16.sdp)` | `{padding: sdp(16)}` or `{padding: (16).sdp}` |
| `fontSize = 18.ssp` | `{fontSize: ssp(18)}` |
| `12.psdp` / `12.pwsdp` | `psdp(12)` / `pwsdp(12)` from `…/percent`, `…/power` |
| `80.sdpRotate(50, Orientation.LANDSCAPE)` | `sdpRotate(80, 50, Orientation.LANDSCAPE)` |
| `16.scaledDp().screen(UiModeType.TELEVISION, 24).sdp` | `scaledDp(16).screen(UiModeType.TELEVISION, 24).sdp` |
| `10.spaceW` | `spaceW(10)` from `…/percent` |
| `autoResizeTextSp(...)` in `BoxWithConstraints` | `useAutoResizeTextSp(...)` / `<AutoResizeText>` |

---

## Installation

```bash
npm install appdimens-react-native
# or
yarn add appdimens-react-native
```

Requirements: React Native ≥ 0.64 (React ≥ 16.8; React 18 uses `useSyncExternalStore`). Nothing to link, no pods to install.

### Modules (same split as the Android artifacts)

| Import | Android artifact | Contents |
|---|---|---|
| `appdimens-react-native` | `appdimens-dynamic` | core, **scaled** (`sdp`…), builders, facilitators, React hooks/styles |
| `appdimens-react-native/percent` | `…-percent` | `psdp`… + literal `spaceW` / `spaceH` / `spaceSw` / `space(…)` |
| `appdimens-react-native/power` | `…-power` | `pwsdp`… (sublinear `(d/300)^0.75`) |
| `appdimens-react-native/fluid` | `…-fluid` | `fsdp`… (0.8× → 1.2× between 320–768 dp) |
| `appdimens-react-native/auto` | `…-auto` | `asdp`… (linear, then logarithmic after 480 dp) |
| `appdimens-react-native/diagonal` | `…-diagonal` | `dgsdp`… (screen diagonal) |
| `appdimens-react-native/fill` | `…-fill` | `flsdp`… (cover-like, `max` ratio) |
| `appdimens-react-native/fit` | `…-fit` | `ftsdp`… (contain-like, `min` ratio) |
| `appdimens-react-native/interpolated` | `…-interpolated` | `isdp`… (halfway between fixed and linear) |
| `appdimens-react-native/logarithmic` | `…-logarithmic` | `logsdp`… (strong damping) |
| `appdimens-react-native/perimeter` | `…-perimeter` | `prsdp`… (`(w+h)/833`) |
| `appdimens-react-native/density` | `…-density` | `dsdp`… (pixel density) |
| `appdimens-react-native/resize` | `…-resize` | `AutoResizeText`, `useAutoResize*`, `DimenResize` |
| `appdimens-react-native/units` | `…-units` | `mm()`, `cm()`, `inch()`, `DimenPhysicalUnits` |
| `appdimens-react-native/custom` | `…-custom` | **your own strategies**: `cdp(16, 'base * …')`, `scalingFormula`, `customScaleStrategy`, `defineCustomStrategy`, `cdp` / `csp`, `useCustomStrategy`, presets, JSON |

Strategies you do not import are not bundled. Per-strategy guides: [docs/](docs/README.md). Naming rules: [docs/API-CONVENTIONS.md](docs/API-CONVENTIONS.md). Coming from Android: [docs/MIGRATION-FROM-ANDROID.md](docs/MIGRATION-FROM-ANDROID.md).

> Using an old Metro without package `exports` support? The sub-paths still resolve through the proxy folders shipped in the package (`power/package.json`, …).

---

## Core concepts

- **Design base:** values are designed for a **300 dp** wide reference (Android `BASE_WIDTH_DP`); `sdp(16)` is 16 dp on a 300 dp-wide phone, 19.2 dp on 360 dp, 42.7 dp on an 800 dp tablet.
- **Axis (`DpQualifier`)**: `sdp` scales with the smallest width, `hdp` with the window height, `wdp` with the window width.
- **Units:** results are **dp** (React Native layout units). `…Px` variants return physical pixels. Text: `ssp` returns the size for `fontSize` (React Native then applies the user font scale, as Android does for `sp`); `sem` ignores the user font scale.
- **Suffixes** (identical to Compose):

| Suffix | Meaning | Example |
|---|---|---|
| *(none)* | default curve on the axis | `sdp(16)` |
| `a` | aspect-ratio correction | `sdpa(16)` |
| `Ph` / `Lh` / `Pw` / `Lw` | use height/width in portrait/landscape (`Inverter`) | `sdpLh(16)`, `hdpLw(40)`, `wdpPh(20)` |
| `Px` | physical pixels | `sdpPx(2)`, `sdpaPx(2)`, `sdpPxaLh(2)`, `sspPx(14)` |

Every strategy uses the same names with its prefix: `p`, `pw`, `f`, `a`, `dg`, `fl`, `ft`, `i`, `log`, `pr`, `d` (`pwhdpLw`, `fssp`, `logsem`, …).

---

## Usage

### 1. Functions

```tsx
import {sdp, hdp, wdp, ssp, sem, sdpa, hdpLw, sdpPx} from 'appdimens-react-native';
import {pwsdp, pwssp} from 'appdimens-react-native/power';

<View style={{margin: sdp(8), height: hdp(56), width: wdp(120)}} />
<Text style={{fontSize: ssp(14)}}>Respects the user font size</Text>
<Text style={{fontSize: sem(14)}}>Ignores the user font size</Text>
```

Functions read the current window snapshot. To refresh a component when the window changes, call **`useDimenMetrics()`** in it (or use the style helpers below) — the React counterpart of reading `LocalConfiguration` in Compose.

### 2. Styles computed once per window (recommended)

```tsx
import {createDimenStyles, sdp, ssp} from 'appdimens-react-native';

const useStyles = createDimenStyles(() => ({
  card: {padding: sdp(16), borderRadius: sdp(12)},
  title: {fontSize: ssp(18), fontWeight: '700'},
}));

function Card() {
  const styles = useStyles(); // subscribes + returns the cached StyleSheet
  return <View style={styles.card}><Text style={styles.title}>Title</Text></View>;
}
```

The factory runs **once per window snapshot**, shared by every component using the hook.

Prefer declaring units as strings? Use token sheets:

```tsx
import {DimenStyleSheet} from 'appdimens-react-native';
import {powerKernels} from 'appdimens-react-native/power';

DimenStyleSheet.register(powerKernels); // enable `…pwsdp` tokens (scaled tokens are built in)

const useStyles = DimenStyleSheet.create({
  card: {padding: '16sdp', marginTop: '-4hdp', width: '120pwsdp'},
  title: {fontSize: '18ssp'},
});
```

### 3. Kotlin-style Number extensions (opt-in)

```ts
// index.js — once, before your app
import 'appdimens-react-native/number';        // scaled: (16).sdp, (14).ssp, (2).sdpPx …
import 'appdimens-react-native/power/number';  // (16).pwsdp …
```

```tsx
<View style={{padding: (16).sdp, height: (48).hdp}} />
```

Getters are non-enumerable, typed (`declare global { interface Number … }`) and never override an existing member.

### 4. Conditional facilitators

```ts
import {
  sdpRotate, sdpMode, sdpQualifier, sdpScreen, sdpRotatePlain, plainRotate,
  Orientation, UiModeType, DpQualifier,
} from 'appdimens-react-native';

sdpRotate(80, 50, Orientation.LANDSCAPE);                    // 80.sdp, or 50.sdp in landscape
sdpMode(30, 200, UiModeType.TELEVISION);                     // 200.sdp on TV
sdpQualifier(60, 120, DpQualifier.SMALL_WIDTH, 600);         // 120.sdp when sw ≥ 600
sdpScreen(70, 150, UiModeType.TELEVISION, DpQualifier.SMALL_WIDTH, 600);
sdpRotate(80, 50, Orientation.LANDSCAPE, {finalQualifierResolver: DpQualifier.WIDTH, applyAspectRatio: true});

// Plain = chainable without scaling twice (receiver is already resolved)
sdpRotatePlain(sdp(16), 50, Orientation.LANDSCAPE);
plainRotate(sdp(16), sdp(24), Orientation.LANDSCAPE);       // logic only
```

Available for `sdp` / `hdp` / `wdp` / `ssp` / `hsp` / `wsp` of every strategy, with `Px`, `Plain` and `PlainPx` variants (`hspModePx`, `pwsdpQualifierPlain`, …).

### 5. Builders (`scaledDp` / `scaledSp`)

```ts
import {scaledDp, scaledSp, UiModeType, DpQualifier, Orientation, Inverter} from 'appdimens-react-native';

// Declare once (module scope is fine) — values resolve on access.
const avatar = scaledDp(48)
  .screen(UiModeType.TELEVISION, DpQualifier.SMALL_WIDTH, 600, 96) // 1: mode + threshold
  .screen(UiModeType.CAR, 64)                                       // 2: mode
  .screen(DpQualifier.SMALL_WIDTH, 600, 72)                         // 3: threshold
  .screen(Orientation.LANDSCAPE, 40)                                // 4: orientation
  .applyAspectRatio();

avatar.sdp; avatar.hdp; avatar.wdp; avatar.sdpPx;

const title = scaledSp(20).screen({qualifierType: 'SMALL_WIDTH', qualifierValue: 600, customValue: 28});
title.ssp; title.sem; title.sspPx;
```

Priorities and tie-breaks are the Android ones. Every strategy has its own builder: `powerDp(16).pwsdp`, `fluidSp(14).fssp`, …

### 6. Escape hatches

```ts
import {toDynamicScaledDp, Inverter, DpQualifier} from 'appdimens-react-native';

toDynamicScaledDp(16, DpQualifier.HEIGHT, Inverter.PH_TO_LW, false, true, 0.01); // Android positional order
toDynamicScaledDp(16, 'HEIGHT', {inverter: 'PH_TO_LW', applyAspectRatio: true, customSensitivityK: 0.01});
```

### 7. Percent of the screen

```ts
import {spaceW, spaceH, spaceSw, space, spaceWSp} from 'appdimens-react-native/percent';

spaceW(90);      // 90% of the window width (dp)
space(25, 200);  // 25% of 200 dp
spaceWSp(5);     // font size = 5% of the width
```

### 8. Auto-resize (constraint fitting)

```tsx
import {AutoResizeText, useAutoResizeTextSp, useAutoResizeSquareSize, DimenResize} from 'appdimens-react-native/resize';

<AutoResizeText minSp={12} maxSp={28} maxLines={2} style={styles.title}>{title}</AutoResizeText>

function Thumb() {
  const {size, onLayout} = useAutoResizeSquareSize({min: 24, max: 160, step: 4, contentPadding: 8});
  return <View style={{flex: 1}} onLayout={onLayout}><Image style={{width: size, height: size}} /></View>;
}

DimenResize.fittingTextSp({text, maxWidth: 200, minSp: 10, maxSp: 24, maxLines: 1});
```

The container passed to `onLayout` plays the role of `BoxWithConstraints`. Text is measured with a fast built-in estimator (per-glyph advances + word wrap); pass `measure` for exact native measurements. High-level helpers fall back to `min` when nothing fits.

### 9. Physical units

```ts
import {mm, cm, inch, DimenPhysicalUnits, UnitType} from 'appdimens-react-native/units';

<View style={{width: mm(10), height: mm(10)}} />           // ≈ 1 cm square
DimenPhysicalUnits.radiusFromDiameter(30, UnitType.MM);
DimenPhysicalUnits.setDpPerInch(myNativeDpi);               // optional calibration
```

React Native does not expose the physical DPI, so conversions use the platform reference (160 dp/in Android, 163 pt/in iOS, 96 px/in web) unless you calibrate.

### 10. Provider and overrides

```tsx
import {AppDimensProvider, UiModeType, DimenCache} from 'appdimens-react-native';

<AppDimensProvider uiModeType={isUnfolded ? UiModeType.FOLD_OPEN : undefined}>
  <App />
</AppDimensProvider>

DimenCache.setUiModeType(UiModeType.CAR);      // without a provider
DimenCache.setMetricsOverride({width: 800, height: 1280}); // Storybook / tests
```

TV is detected automatically (`Platform.isTV`), and visionOS as `VR_HEADSET`. Fold/flip, car, watch or desk modes cannot be detected from JavaScript — feed them from your hinge/posture library through the provider or `DimenCache.setUiModeType`.

---

### 11. Custom strategies (your own scaling)

When no built-in curve fits, define your own. The simplest way is to write the formula: `base` is the value you pass, and the result is the scaled value.

```tsx
import {cdp, customScaleStrategy, scalingFormula} from 'appdimens-react-native/custom';

<View style={{padding: cdp(16, 'base * pow(sw / 360, 0.8)')}} />; // inline
const hud = scalingFormula('base * (tablet ? 0.9 : 1) * clamp(sw / 360, 0.85, 1.6)');
const fancy = scalingFormula((base, screen) => base * Math.pow(screen.smallestWidthDp / 360, 0.8)); // plain JS
const product = customScaleStrategy(screen => Math.min(Math.max(screen.widthDp / 360, 0.85), 1.8)); // programmable factor
```

For rules per device, factor bounds or a font-scale policy, use the full configuration. The same JSON works on Android, iOS, Flutter, Web, KMP, Games and .NET:

```tsx
import {defineCustomStrategy, cdp, csp, useCustomStrategy} from 'appdimens-react-native/custom';

const brand = defineCustomStrategy({
  id: 'brand',
  reference: {width: 360, height: 640},
  curve: {type: 'power', exponent: 0.8},
  clamp: {min: 0.85, max: 1.6},
  rules: [{when: {device: 'tablet'}, set: {curve: {type: 'logarithmic', k: 0.4}}}],
});

<View style={{padding: cdp(16, brand)}}><Text style={{fontSize: csp(14, brand)}}>Hi</Text></View>;
const s = useCustomStrategy(brand); // re-renders on window changes
```

The module also includes presets (`CustomPresets.TV_SAFE`, `TABLET_FRIENDLY`, …), `BuiltInStrategies.POWER.extend(…)`, `loadCustomStrategies(require('./strategies.json'))`, `<CustomStrategyProvider>` and `(16).cdp` via `appdimens-react-native/custom/number`. Guide: [docs/custom.md](docs/custom.md).

---

## API reference (summary)

| Area | Exports |
|---|---|
| Enums | `DpQualifier`, `Inverter`, `Orientation`, `UiModeType`, `UnitType`, `ScalingStrategy` |
| Engine | `DimenCache` (`currentMetrics`, `subscribe`, `refresh`, `setUiModeType`, `setMultiWindowMode`, `setMetricsOverride`, `getCachedUiModeType`), `DimenMetrics`, constants (`BASE_WIDTH_DP`, …), `effectiveQualifier` |
| Kernels | `sdp hdp wdp ssp hsp wsp sem hem wem` × suffixes × `Px` (264 per strategy) |
| Facilitators | `{s,h,w}{dp,sp}{Rotate,Mode,Qualifier,Screen}{,Px,Plain,PlainPx}`, `plainRotate/Mode/Qualifier/Screen` |
| Builders | `scaledDp` → `DimenScaled`, `scaledSp` → `ScaledSp`; `<strategy>Dp` / `<strategy>Sp` |
| Escape hatches | `toDynamic<Strategy>{Dp,Px,Sp,SpPx}` |
| React | `useDimenMetrics`, `useAppDimens`, `AppDimensProvider`, `useLocalDimenMetrics`, `createDimenStyles`, `DimenStyleSheet` |
| Extensions | `appdimens-react-native/number`, `…/<strategy>/number`, `installNumberExtensions` |
| Custom | `/custom`: `defineCustomStrategy`, `loadCustomStrategies`, `cdp` / `cdpPx` / `csp` / `cspPx`, `CustomScalingStrategy`, `CustomStrategyProvider`, `useCustomStrategy`, `CustomPresets`, `BuiltInStrategies`, `/custom/number` |

Full math: [docs/](docs/README.md), [docs/PERFORMANCE.md](docs/PERFORMANCE.md) and the Android [MATHEMATICS-AND-CALCULUS.md](https://github.com/bodenberg/appdimens-dynamic/blob/main/DOCUMENTATION/MATHEMATICS-AND-CALCULUS.md).

---

## Performance

Each exported function is a specialized kernel created once with its factor-table index baked in (the JS counterpart of Android's `resolveSdpPx`/`resolveSdpaDp` kernels). The hot path is: read the current snapshot → read `factors[index]` (computed lazily once per window) → multiply.

`npm run bench` (Node 22, compiled output, monomorphic call sites) on a CI-class machine:

| Call | ns/op |
|---|---|
| `v * constant` (baseline) | ~1 |
| `sdp(v)`, `sdpa(v)`, `hdpLw(v)`, `ssp(v)`, `pwsdp(v)` | ~5–14 |
| `toDynamicScaledDp(v, 'HEIGHT', opts)` | ~18 |
| `sdpRotate(v, 20)`, builder with 2 `screen` entries | ~40–50 |

Numbers vary by machine and engine (Hermes vs V8); the point is that dimension resolution is never a bottleneck. Rotation creates one new snapshot (a ~10 KB table filled lazily); nothing else is recomputed until a value is used.

---

## Differences from Android

- Results are **dp** numbers (RN layout units) instead of `Dp` objects; `Px` variants return physical pixels.
- `smallestScreenWidthDp` is the smallest side of the current window.
- Multi-window (`…i` variants): uses `Dimensions.get('screen')` vs `('window')` (window smaller than 85% of the display); can be forced with `DimenCache.setMultiWindowMode`.
- Physical units use the platform's logical DPI unless calibrated.
- Text auto-resize uses an estimator unless you pass a `measure` function.
- High-level resize helpers return `min` instead of `0` when nothing fits.

## For AI assistants

[skills/SKILL.md](skills/SKILL.md) (with [library-map.md](skills/library-map.md) and [reference.md](skills/reference.md)) is an agent skill covering install, strategy selection, reactivity and resize; [LLMS.txt](LLMS.txt) indexes the docs for LLM tools.

## Development

```bash
npm ci
npm run generate      # regenerate strategy modules from scripts/naming.js
npm run validate      # generated check + typecheck + lint + format + tests + build + smoke
npm run bench
```

Generated files (`src/strategies/*`, root proxy folders) must not be edited by hand. See [CONTRIBUTING.md](CONTRIBUTING.md). CI runs `validate` on Node 18/20/22; pushing a `vX.Y.Z` tag publishes to npm (needs the `NPM_TOKEN` secret).

## Português (resumo)

Porte da AppDimens Dynamic (Android) para React Native com **a mesma API**: `sdp(16)`, `ssp(14)`, `hdpLw(40)`, `pwsdp(16)` (de `appdimens-react-native/power`), facilitadores `sdpRotate/Mode/Qualifier/Screen`, builders `scaledDp(16).screen(...)`, resize (`<AutoResizeText>`) e unidades físicas (`mm(10)`). Estratégias personalizadas: `defineCustomStrategy({...})` + `cdp(16, brand)` em `appdimens-react-native/custom`, com o mesmo JSON das outras plataformas. Use `useDimenMetrics()` ou `createDimenStyles(...)` nos componentes para atualizar ao girar/redimensionar. Opcional: `import 'appdimens-react-native/number'` para escrever `(16).sdp` como no Kotlin. JS puro, sem módulo nativo, compatível com Expo e New Architecture.

## License

Apache-2.0 © Jean Bodenberg
