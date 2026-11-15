# API reference

Everything below is exported by `appdimens-react-native/custom` unless another entry is named. `dp` results go straight into styles; `…Px` results are physical px (× `PixelRatio.get()`); `sp` results are a `fontSize`.

## Building strategies

| Function | Returns | Notes |
|---|---|---|
| `customScaleStrategy(fn, {id?, register?})` | `CustomScalingStrategy` | programmable factor, `ScreenScope` argument ([code formulas](code-formulas.md)) |
| `scalingFormula(fn, {id?, register?})` | `CustomScalingStrategy` | code formula, `FormulaScope` argument |
| `scalingFormula('text', {id?, register?})` | `CustomScalingStrategy` | text formula, shared per text without an id ([text formulas](text-formulas.md)) |
| `getFormulaCustomStrategy('text')` | `CustomScalingStrategy` | the shared strategy for a text formula |
| `defineCustomStrategy(spec, {register?})` | `CustomScalingStrategy` | full configuration, registered by default ([configuration](configuration.md)) |
| `strategy.extend(id, patch?, {register?})` | `CustomScalingStrategy` | child of an existing strategy, registered by default |
| `strategy.withAxis(axis)` | `CustomScalingStrategy` | same strategy on another axis, id `"<id>@<axis>"`, cached per instance |
| `new CustomScalingStrategy(id, config)` | `CustomScalingStrategy` | wrap a normalized `ScalingConfig` (e.g. from `configFromSpec`) |
| `BuiltInStrategies.SCALED` … `FIXED` · `CustomPresets.TV_SAFE` … | `CustomScalingStrategy` | ready-made parents |

## Registry

| Function | Notes |
|---|---|
| `getDefaultCustomStrategy()` | strategy used by `cdp(16)` / `csp(14)` / `(16).cdp` without an argument; initially `BuiltInStrategies.SCALED` |
| `setDefaultCustomStrategy(s \| id \| text \| null)` | change it (`null` restores `SCALED`) |
| `registerCustomStrategy(s)` · `unregisterCustomStrategy(id)` | add or replace · remove |
| `getCustomStrategy(id)` · `requireCustomStrategy(id)` | lookup, including built-ins and presets; `require…` throws `No scaling strategy 'x'. Registered: …` |
| `registeredCustomStrategies()` | strategies registered by the app |
| `pickCustomStrategy(s?)` | resolves an instance, an id, a text formula or the default |
| `loadCustomStrategies(json)` | register a [JSON document](json.md) and apply its `default`; atomic |
| `exportCustomStrategies(list?)` | JSON document of the registered strategies |

## Short functions

| Call | Returns |
|---|---|
| `cdp(16, s?)` | dp |
| `cdpPx(16, s?)` | physical px |
| `csp(14, s?)` | `fontSize` (font-scale policy applied, React Native font scaling on) |
| `cspPx(14, s?)` | text, physical px |

`s` is a `CustomScalingStrategy`, a registered / built-in / preset id or a text formula. Without it the default strategy is used. These functions read the current window when they are called; use the hook in components that must re-render on rotation.

## React

| API | Notes |
|---|---|
| `<CustomStrategyProvider strategy={brand}>` | every `useCustomStrategy()` without an argument inside uses `brand` (instance, id or text) |
| `useCustomStrategy(s?)` | `BoundCustomStrategy` bound to `s`, else the nearest provider, else the default; re-renders on window changes and honours `AppDimensProvider` snapshots (overrides, previews) |
| `bindCustomStrategy(s, metrics?)` | the same helpers without a hook (for a given `DimenMetrics`) |

`BoundCustomStrategy`: `strategy`, `dp(v)`, `px(v)`, `sp(v)`, `spDp(v)`, `spPx(v)`, `factor()`, `explain()`.

## Number extensions (`appdimens-react-native/custom/number`)

```ts
import 'appdimens-react-native/custom/number';

(16).cdp;                 // default strategy, dp
(16).cdpPx;               // physical px
(14).csp;                 // fontSize
(14).cspPx;               // text, physical px
(16).cdpWith(brand);      // explicit strategy (instance, id or text), dp
(14).cspWith('brand');    // explicit strategy, fontSize
```

## Strategy members (`CustomScalingStrategy`)

| Member | Notes |
|---|---|
| `id` · `config` · `valueDependent` | identity · normalized config · whether results depend on the value |
| `dp(v, metrics?)` · `px(v, metrics?)` | dp · physical px |
| `sp(v, metrics?)` | `fontSize` with the policy pre-compensated for React Native font scaling |
| `spDp(v, metrics?)` · `spPx(v, metrics?)` | final text size in dp (for `allowFontScaling={false}` / layout math) · in physical px |
| `factor(metrics?)` · `explain(metrics?)` | debug |
| `resolve(metrics?)` → `ResolvedScaling` | memoized per snapshot: `factor`, `appliedRules`, `valueFactor`, `scale(base)`, `scaleSpDp(base)`, `scaleSpUnits(base)`, `effectiveFontScale()`, `explain(id)` |
| `resolveScreen(screen)` | the same for a `ScreenSnapshot` you build (tests, previews) |
| `extend(…)` · `withAxis(…)` · `toJSON()` | see above; `toJSON()` throws for code functions |

`metrics` defaults to the current window (`DimenCache`). Pass a `DimenMetrics` (`new DimenMetrics({width: 411, height: 891, density: 2.625})`, exported by `appdimens-react-native`) to resolve for another window.

## Engine (platform-free, same as `webdimens/custom`)

| Export | Notes |
|---|---|
| `screenSnapshot({widthDp, heightDp, …})` | builds a `ScreenSnapshot(widthDp, heightDp, smallestWidthDp, density, fontScale, isLandscape, isMultiWindow, device)` with defaults |
| `toScreenSnapshot(metrics)` · `defaultDeviceClass(metrics)` · `setDeviceClassResolver(fn \| null)` | `DimenMetrics` → engine snapshot, device detection |
| `resolveScaling(config, screen)` · `configFromSpec(spec, parent, path)` · `configToSpec(id, config)` · `parseStrategiesDocument(input, lookup)` | the pure engine used by the registry |
| `screenScope(screen)` · `formulaScope(screen, base)` | the scopes code formulas receive |
| `ScalingExpression.parse(text, allowed?)` · `.evaluate(lookup)` · `.source` | the text language |
| `SCREEN_VARIABLES` · `CURVE_VARIABLES` · `FORMULA_VARIABLES` · `SCALING_AXES` · `DEVICE_CLASSES` | name lists |
| `DEFAULT_CONFIG` · `BUILT_IN_SPECS` · `PRESET_SPECS` | defaults and specs of the built-ins and presets |

Types: `ScalingStrategySpec`, `ScalingPatchSpec`, `ScalingRuleSpec`, `ScreenConditionSpec`, `CurveSpec`, `FontScaleSpec`, `ScalingStrategiesDocument`, `ScalingConfig`, `ScreenSnapshot`, `ScreenScope`, `FormulaScope`, `DeviceClass`, `ScalingAxis`, `CurveFunction`, `ValueTransform`, `BoundCustomStrategy`, `ScalingFormulaOptions`.

`resetCustomStrategiesForTest()` clears the registry, the default and the shared formulas (tests only).

[Back to the custom docs](README.md)
