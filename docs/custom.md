# Custom strategies (`appdimens-react-native/custom`)

Define **your own** scaling strategy when none of the built-in curves fits, or when one growth law must be shared by several apps and platforms. This is the React Native port of the Android module `appdimens-dynamic-custom`. The configuration is the **same JSON on every AppDimens platform** (Android, KMP, iOS, Flutter, Web, Games, .NET).

> The class is called `CustomScalingStrategy` (and the helpers `defineCustomStrategy`, `useCustomStrategy`, …) because `ScalingStrategy` is already this package's built-in strategy enum.

## What it computes

```
ratio  = axis(window) / axis(reference)
factor = clamp( curve(ratio) × multiplier × AR , clamp.min, clamp.max )
dp     = formula( valueClamp( value × factor ) )
```

Rules override any field per device class (`phone`, `tablet`, `desktop`, `tv`, `watch`, `car`, `vr`), screen range (smallest width, width, height, aspect ratio), orientation and multi-window.

## Define and use

```tsx
import {defineCustomStrategy, cdp, csp} from 'appdimens-react-native/custom';

export const brand = defineCustomStrategy({
  id: 'brand',
  reference: {width: 360, height: 640},
  curve: {type: 'power', exponent: 0.8},
  clamp: {min: 0.85, max: 1.6},
  fontScale: {max: 1.3},
  rules: [
    {name: 'large', when: {device: ['tablet', 'desktop']}, set: {curve: {type: 'logarithmic', k: 0.4}}},
    {when: {device: 'tv'}, set: {axis: 'height', reference: {width: 960, height: 540}}},
  ],
});

<View style={{padding: cdp(16, brand), borderRadius: brand.dp(12)}}>
  <Text style={{fontSize: csp(14, brand)}}>Hello</Text>
</View>;
```

- `cdp(v, s?)` / `s.dp(v)` return **dp**, so you can use the value directly in styles.
- `cdpPx` / `s.px` return physical px.
- `csp(v, s?)` / `s.sp(v)` return a `fontSize`. React Native applies the user font scale itself, and the strategy's `fontScale` policy is pre-compensated (`'ignore'` keeps text fixed, `{max: 1.3}` caps it).
- `s.spDp(v)` is the final text size in dp. Use it with `allowFontScaling={false}` or for layout math.

### In components (re-render on rotation / resize / font scale)

```tsx
import {CustomStrategyProvider, useCustomStrategy} from 'appdimens-react-native/custom';

<CustomStrategyProvider strategy={brand}>
  <Card />
</CustomStrategyProvider>;

function Card() {
  const s = useCustomStrategy();           // or useCustomStrategy('tvSafe')
  return <View style={{padding: s.dp(16)}}><Text style={{fontSize: s.sp(14)}}>…</Text></View>;
}
```

`useCustomStrategy` honours `AppDimensProvider` snapshots (overrides, previews).

### Defaults and Number extensions

```ts
import {setDefaultCustomStrategy} from 'appdimens-react-native/custom';
import 'appdimens-react-native/custom/number';

setDefaultCustomStrategy(brand);
(16).cdp;               // default strategy (BuiltInStrategies.SCALED until set — same as sdp)
(14).csp;
(16).cdpWith('tvSafe');
```

## Configuration fields

| Field | Example | Default |
|---|---|---|
| `reference` | `{width: 360, height: 640}` | 300 × 533 |
| `axis` | `'smallestWidth'` · `'width'` · `'height'` · `'min'` · `'max'` · `'diagonal'` · `'perimeter'` | `'smallestWidth'` |
| `curve` | `'linear'` · `{type: 'power', exponent}` · `{type: 'logarithmic', k}` · `{type: 'interpolated', t}` · `{type: 'constant', factor}` · `{type: 'breakpoints', points: [{at, factor}]}` · `{type: 'expression', expression}` (free-form text, see below) · `{type: 'custom', fn}` | `'linear'` |
| `multiplier` | `0.9` | 1 |
| `clamp` | `{min, max}` (factor) | none |
| `valueClamp` | `{min, max}` (resulting dp, magnitude) | none |
| `aspectRatio` | `true` · `{enabled, sensitivity}` | off |
| `fontScale` | `'follow'` · `'ignore'` · `{max}` | `'follow'` |
| `ignoreMultiWindow` | `true` | `false` |
| `formula` | `'max(scaled, base)'` — per-value text formula (JSON; `null` clears an inherited one) | none |
| `transform` | `(base, scaled, screen) => …` (code only) | none |
| `rules` | `[{name?, when, set}]`; ranges are `min <= v < max`, later rules win | none |
| `extends` | `'power'`, `'tabletFriendly'`, another id | — |

## Free-form formulas (no limits from the built-in curves)

You are not limited to the built-in curves. Write the formula yourself, as **text** that also works in JSON and gives the same result on every AppDimens platform:

- **Curve expression** returns the **factor** from the screen. It is computed once per window, like any curve, and stays on the one-multiply fast path.
  `"curve": {"type": "expression", "expression": "pow(ratio, 0.8) * (tablet ? 0.9 : 1)"}`
- **Formula** returns the **final value** for each input. It can use `base`, `scaled` and `factor`, and replaces or post-processes the result. The strategy then becomes value-dependent, so results are cached per window.
  `"formula": "base * pow(sw / 360, 0.7) + 2"` · `"formula": "max(scaled, base)"`

| | |
|---|---|
| Operators | `+ - * / % ^` (`^` = power, right-associative; `%` keeps the dividend's sign), `== != < <= > >=`, `&& \|\| !`, `cond ? a : b`, `( )` |
| Functions | `min(a, b, …)` `max(a, b, …)` `clamp(x, lo, hi)` `pow` `sqrt` `ln`/`log` `log10` `log2` `exp` `abs` `sign` `floor` `ceil` `round` (half up) `lerp(a, b, t)` `step(edge, x)` `smoothstep(e0, e1, x)` |
| Screen variables | `sw` `width` `height` `shortSide` `longSide` `diagonal` `perimeter` `aspectRatio` `density` `fontScale`; flags (1/0): `landscape` `portrait` `multiWindow` `phone` `tablet` `desktop` `tv` `watch` `car` `vr`; constants `pi` `e`, `true` / `false` |
| Curve variables | screen variables + `ratio` (axis / reference), `axis` (dp), `ref` (reference dp), `refWidth`, `refHeight` |
| Formula variables | curve variables + `base` (input), `scaled` (base × factor after `valueClamp`), `factor` |

Expressions are parsed when the strategy is created. Unknown variables or functions, wrong arity and syntax errors fail early with the position and the JSON path (e.g. `brand.rules[0].set.curve.expression`). A non-finite factor (for example, a division by zero) throws when the strategy resolves. Rules can swap expressions per device like any other field, and `"formula": null` clears an inherited formula.

For anything the language cannot express, use a code-only function: `{type: 'custom', fn: (ratio, screen) => …}` (factor) or `transform: (base, scaled, screen) => …` (value). Both have full access to your code, but they cannot be serialized to JSON.

```ts
const Hud = defineCustomStrategy({
  id: 'hud',
  curve: {type: 'expression', expression: 'clamp(pow(shortSide / 360, 0.85) * (1 + 0.05 * log(aspectRatio / 1.78)), 0.8, 2)'},
  formula: 'round(scaled)', // whole dp only
  rules: [{when: {device: 'tv'}, set: {curve: {type: 'expression', expression: 'height / 540'}}}],
});
```

## JSON, presets, built-ins

```ts
import {loadCustomStrategies, CustomPresets, BuiltInStrategies} from 'appdimens-react-native/custom';

loadCustomStrategies(require('./appdimens-strategies.json'));   // registers + applies "default"
CustomPresets.TV_SAFE;                                          // tabletFriendly, compactFirst, tvSafe, wearable, gameHud, readableText
BuiltInStrategies.POWER.extend('soft', {curve: {type: 'power', exponent: 0.6}});
brand.withAxis('height');                                       // "brand@height"
brand.toJSON();                                                 // export (exportCustomStrategies() for all)
```

Schema: [`custom-strategy.schema.json`](https://github.com/bodenberg/appdimens-skills/blob/main/schemas/custom-strategy.schema.json). Errors name the path (`brand.rules[0].set.curve.type …`).

## Device class on React Native

The device class is detected in this order:
1. UI mode (`UiModeType.TELEVISION` / `CAR` / `WATCH` / `DESK` / `VR_HEADSET`).
2. `Platform.isTV` → `tv`.
3. `Platform.OS` `macos` / `windows` → `desktop`.
4. Size: `sw >= 600` → `tablet`, otherwise `phone`.

You can override this with `setDeviceClassResolver((metrics) => …)`. `DimenCache.setUiModeType(…)` also changes the result.

## Debug and performance

```ts
console.log(brand.explain());
// [brand] tablet smallestWidth=800dp / ref 360 = 2.2222 -> logarithmic(0.4) = 1.3194 => factor 1.3194 rules=[large]
```

The factor is memoized per window snapshot, so each call is one multiply. Value bounds, `formula` and `transform` add a few operations. Keep `custom` curves and `transform` pure.

The cross-platform fixture `__tests__/fixtures/custom-strategy-fixture.json` (Kotlin reference engine) is checked in CI with a relative tolerance of 1e-4.
