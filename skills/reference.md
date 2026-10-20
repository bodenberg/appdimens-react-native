# AppDimens Dynamic for React Native — API cheat sheet

Supplements [SKILL.md](SKILL.md). Every name below exists in the source; strategies repeat the scaled names with their prefix.

## Kernels (per strategy, prefix `P` ∈ '', p, pw, f, a, dg, fl, ft, i, log, pr, d)

| Family | Names | Returns |
|---|---|---|
| dp | `Psdp`, `Phdp`, `Pwdp` + `a` | dp |
| inverters | `PsdpPh/Lh/Pw/Lw`, `PhdpLw/Pw`, `PwdpLh/Ph` (+ `a`) | dp |
| px | `PsdpPx`, `PsdpaPx`, `PsdpPxLh`, `PsdpPxaLh`, … | px |
| font | `Pssp`, `Phsp`, `Pwsp` (+ `a`, inverters) | sp for `fontSize` |
| fixed font | `Psem`, `Phem`, `Pwem` | sp ignoring font scale |
| font px | `PsspPx`, `PsspPxa`, `PsemPx`, … | px |

## Facilitators (dp and sp stems of every strategy)

```ts
sdpRotate(value, rotationValue, orientation = 'LANDSCAPE', {finalQualifierResolver, applyAspectRatio, customSensitivityK})
sdpMode(value, modeValue, uiModeType, options)
sdpQualifier(value, qualifiedValue, qualifierType, qualifierValue, options)
sdpScreen(value, screenValue, uiModeType, qualifierType, qualifierValue, options)
// + …Px, …Plain (receiver already resolved), …PlainPx; sp stems accept {fontScale}
plainRotate(a, b, orientation) / plainMode / plainQualifier / plainScreen   // logic only
```

## Builders

```ts
scaledDp(48).screen(UiModeType.TELEVISION, DpQualifier.SMALL_WIDTH, 600, 96) // p1
  .screen(UiModeType.CAR, 64)                     // p2
  .screen(DpQualifier.SMALL_WIDTH, 600, 72)       // p3
  .screen(Orientation.LANDSCAPE, 40)              // p4
  .applyAspectRatio()                             // or .aspectRatio(true, k)
  .sdp / .hdp / .wdp / .sdpPx / .dp(q) / .px(q) / .sdpHdpWdpPx()
scaledSp(20).screen({qualifierType: 'SMALL_WIDTH', qualifierValue: 600, customValue: 28}).ssp / .sem / .sspPx
powerDp(16).pwsdp · fluidSp(14).fssp · …
```

## Escape hatches

```ts
toDynamicScaledDp(v, qualifier, inverter?, ignoreMultiWindows?, applyAspectRatio?, k?)
toDynamicScaledDp(v, qualifier, {inverter, applyAspectRatio, customSensitivityK})
toDynamicScaledPx · toDynamicScaledSp(v, q, fontScale?, …) · toDynamicScaledSpPx
toDynamic<Strategy>{Dp,Px,Sp,SpPx}
```

## Percent (`/percent`)

`spaceW`, `spaceH`, `spaceSw` (+`Px`), `space(p, ref)`, `spacePx`, `spaceWSp(p, fontScale?)`, `spaceHSp`, `spaceSwSp`, `spaceSp(p, ref)` (+`Px`).

## React

`useDimenMetrics()` / `useAppDimens()` · `createDimenStyles(m => styles)` → hook (+`.get()`) · `DimenStyleSheet.create({…'16sdp'…})`, `.register(kernels)`, `.resolve(token)` · `<AppDimensProvider uiModeType multiWindowMode metricsOverride>` · `useLocalDimenMetrics()`

## Engine

`DimenCache.currentMetrics` (`screenWidthDp`, `screenHeightDp`, `smallestWidthDp`, `density`, `fontScale`, `orientation`, `uiModeType`, `isInMultiWindowMode`, `version`) · `subscribe` · `refresh` · `setUiModeType` · `setMultiWindowMode` · `setMetricsOverride` · `getCachedUiModeType`

## Custom strategies (`/custom`)

- **Define:** `defineCustomStrategy({id, reference?, axis?, curve?, multiplier?, clamp?, valueClamp?, aspectRatio?, fontScale?, ignoreMultiWindow?, transform?, rules?, extends?})`. It registers the strategy.
- **JSON:** `loadCustomStrategies(json)` registers every strategy and applies `default`. Export with `exportCustomStrategies()`.
- **Use:**
  - `cdp(v, s?)` (dp) · `cdpPx` · `csp(v, s?)` (fontSize) · `cspPx`.
  - `s.dp/px/sp/spDp/spPx/factor/explain/extend/withAxis/toJSON`.
- **React:** `<CustomStrategyProvider strategy>` + `useCustomStrategy(s?)` → bound helpers (re-render on window change).
- **Default:** `setDefaultCustomStrategy(s)`. Before it is set, the default is `BuiltInStrategies.SCALED`, which equals `sdp`.
- **Extensions:** `import '…/custom/number'` → `(16).cdp`, `(14).csp`, `(16).cdpWith(s)`.
- **Presets:** `CustomPresets.{TABLET_FRIENDLY, COMPACT_FIRST, TV_SAFE, WEARABLE, GAME_HUD, READABLE_TEXT}`. Built-ins: `BuiltInStrategies.{SCALED, POWER, …, FIXED}`.

## Resize (`/resize`) and units (`/units`)

`<AutoResizeText minSp maxSp stepSp maxLines constrainHeight measure>` · `useAutoResizeTextSp(text, opts)` · `useAutoResize{Square,Width,Height}Size({min,max,step,contentPadding})` · `…SizePercent({minPercent,maxPercent,stepPercent,basis})` · `DimenResize.range/rangePx/fitting/fittingInner*/fittingTextSp/fittingTextSpPx/fittingTextSpPercent` · `resizeFixedDp/Sp`, `resizePercentSw/W/H`

`mm()`, `cm()`, `inch()` (+`Px`) · `DimenPhysicalUnits.toDpFrom*`, `toPxFrom*`, `toSpFrom*`, `radiusFromDiameter`, `radiusFromCircumference`, `setDpPerInch`
