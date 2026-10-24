# Migrating from AppDimens Dynamic for Android

Same names, same formulas, same constants (300 dp base, 1.78 reference aspect ratio). The differences come from the platforms: Kotlin extension properties become functions, `Dp`/`TextUnit` become plain numbers, and React components must subscribe to window changes.

## Translation table

| Android (Compose) | React Native |
|---|---|
| `implementation("io.github.bodenberg:appdimens-dynamic")` | `npm i appdimens-react-native` |
| `implementation("…:appdimens-dynamic-power")` | `import … from 'appdimens-react-native/power'` |
| `Modifier.padding(16.sdp)` | `{padding: sdp(16)}` |
| `Text(fontSize = 14.ssp)` | `<Text style={{fontSize: ssp(14)}}>` |
| `14.sem` | `sem(14)` |
| `2f.sdpPx` | `sdpPx(2)` |
| `40.hdpLw` / `20.sdpLha` | `hdpLw(40)` / `sdpLha(20)` |
| `12.pwsdp` | `pwsdp(12)` |
| `80.sdpRotate(50, Orientation.LANDSCAPE)` | `sdpRotate(80, 50, Orientation.LANDSCAPE)` |
| `30.sdpMode(200, UiModeType.TELEVISION)` | `sdpMode(30, 200, UiModeType.TELEVISION)` |
| `60.sdpQualifier(120, DpQualifier.SMALL_WIDTH, 600)` | `sdpQualifier(60, 120, DpQualifier.SMALL_WIDTH, 600)` |
| `16.sdp.sdpRotatePlain(50)` | `sdpRotatePlain(sdp(16), 50)` |
| `30.sdp.sdpRotatePlain(20.sdp)` | `plainRotate(sdp(30), sdp(20))` |
| `16.scaledDp().screen(UiModeType.TELEVISION, 24).sdp` | `scaledDp(16).screen(UiModeType.TELEVISION, 24).sdp` |
| `10.spaceW` | `spaceW(10)` |
| `Number.toDynamicScaledDp(qualifier, inverter, …)` | `toDynamicScaledDp(value, qualifier, inverter, …)` |
| `DimenSdp.sdp(context, 16)` (Views) | `sdpPx(16)` (px) or `sdp(16)` (dp) |
| `AppDimensProvider { … }` | `<AppDimensProvider>…</AppDimensProvider>` (optional) |
| `LocalDimenMetrics.current` | `useDimenMetrics()` / `useLocalDimenMetrics()` |
| `BoxWithConstraints { autoResizeTextSp(…) }` | `<AutoResizeText …>` or `useAutoResizeTextSp(text, …)` + `onLayout` |
| `autoResizeSquareSize(min, max, step)` | `useAutoResizeSquareSize({min, max, step})` |
| `DimenResize.fittingTextSpPx(…)` | `DimenResize.fittingTextSpPx({…})` |
| `DimenPhysicalUnits.toDpFromMm(10f, resources)` | `DimenPhysicalUnits.toDpFromMm(10)` / `mm(10)` |
| `DimenCache.invalidateOnConfigChange()` | not needed (`DimenCache.refresh()` exists for parity) |
| `scalingStrategy("brand") { curve = power(0.8f); on(DeviceClass.TABLET) { … } }` | `defineCustomStrategy({id: 'brand', curve: {type: 'power', exponent: 0.8}, rules: [{when: {device: 'tablet'}, set: {…}}]})` |
| `16.cdp(Brand)` / `14.csp(Brand)` | `cdp(16, brand)` / `csp(14, brand)` |
| `ProvideScalingStrategy(Brand) { … }` | `<CustomStrategyProvider strategy={brand}>` + `useCustomStrategy()` |
| `ScalingStrategies.loadAsset(context, "x.json")` | `loadCustomStrategies(require('./x.json'))`, with the same JSON file |

Prefer Kotlin-looking code? `import 'appdimens-react-native/number'` once, then `(16).sdp`, `(14).ssp`.

## Behavioural differences

| Topic | Android | React Native |
|---|---|---|
| Recomposition | automatic on configuration change | call `useDimenMetrics()` or use `createDimenStyles` / `DimenStyleSheet` |
| `smallestScreenWidthDp` | from `Configuration` | smallest side of the current window |
| UI mode | `UiModeManager`, hinge sensor, WindowManager | TV and visionOS detected; fold/flip/car/watch/desk set by the app (`AppDimensProvider` or `DimenCache.setUiModeType`) |
| Multi-window | `Activity.isInMultiWindowMode` | window < 85% of the display (`Dimensions` window vs screen), or `DimenCache.setMultiWindowMode` |
| Physical units | real `xdpi` | platform reference (160 dp/in Android, 163 pt/in iOS, 96 px/in web) unless `setDpPerInch` |
| Text measurement (resize) | `TextMeasurer` | fast estimator, or a custom `measure` function |
| Nothing fits (high-level resize) | `0` | the range minimum |
| Precision | 32-bit `Float` | 64-bit doubles (differences < 1e-4) |

## Checklist

1. Replace imports (one sub-path per satellite you used).
2. Turn `16.sdp` into `sdp(16)` (or install the Number extensions).
3. Move style objects into `createDimenStyles(() => ({…}))` hooks.
4. Feed fold/posture state to `AppDimensProvider` if the app used `UiModeType.FOLD_*`.
5. Replace `BoxWithConstraints` resize calls by the `useAutoResize*` hooks.
