# Configuration

`defineCustomStrategy({id, …})` builds a full strategy: the [code](code-formulas.md) and [text](text-formulas.md) one-liners are shortcuts for the simplest cases of it. In React Native the configuration is a plain object with **the same shape as the [JSON format](json.md)** (`ScalingStrategySpec`), so every field below works in code and in JSON, on every platform. Only `curve: {type: 'custom', fn}` and `transform` are code-only.

```ts
import {defineCustomStrategy} from 'appdimens-react-native/custom';

export const brand = defineCustomStrategy({     // creates AND registers "brand"
  id: 'brand',
  reference: {width: 360, height: 640},         // design frame (dp)
  axis: 'smallestWidth',                        // what to compare
  curve: {type: 'power', exponent: 0.8},        // how the ratio becomes a factor
  multiplier: 1,
  clamp: {min: 0.85, max: 1.6},                 // factor bounds
  valueClamp: {min: 10, max: 64},               // dp bounds (value-dependent)
  aspectRatio: {enabled: true, sensitivity: 0.004},   // long/thin screen correction
  fontScale: {max: 1.3},                        // csp policy
  ignoreMultiWindow: false,
  rules: [{name: 'large', when: {device: ['tablet', 'desktop']}, set: {curve: {type: 'logarithmic', k: 0.4}}}],
});
```

Pass `{register: false}` as the second argument to build a throwaway strategy.

## The formula

```
ratio  = axis(window) / axis(reference)
factor = clamp( curve(ratio) × multiplier × AR , clamp.min, clamp.max )
scaled = valueClamp( base × factor )   // the configured result
value  = formula ? formula(base, scaled, factor) : scaled   // a formula replaces the result (it gets the original base)
```

## Fields

| Field | Spec / JSON | Default |
|---|---|---|
| Reference frame (dp) | `reference: {width: 360, height: 640}` | 300 × 533 |
| Axis | `axis: 'height'` | `'smallestWidth'` |
| Curve | `curve: {type: 'power', exponent: 0.8}` | `'linear'` |
| Multiplier | `multiplier: 0.9` | 1 |
| Factor bounds | `clamp: {min: 0.85, max: 1.6}` | none |
| Value bounds (dp, ≥ 0) | `valueClamp: {min: 10, max: 32}` | none |
| Aspect ratio | `aspectRatio: true` · `{enabled: true, sensitivity: 0.004}` | off, k = 0.08 / 30 |
| Font scale (`csp`) | `fontScale: 'follow'` · `'ignore'` · `{max: 1.3}` | `'follow'` |
| Multi-window | `ignoreMultiWindow: true` | `false` |
| Per-value formula | `formula: 'max(scaled, base)'` | none |
| Per-value code hook | `transform: (base, scaled, screen) => …` (code only) | none |
| Rules | `rules: [{name?, when: {…}, set: {…}}]` | none |
| Parent | `extends: 'power'` · `BuiltInStrategies.POWER.extend('x', {…})` | none |

## Axes

| Axis | Value | Screen value | Reference value |
|---|---|---|---|
| Smallest width | `'smallestWidth'` | `sw` | `min(refW, refH)` |
| Width · height | `'width'` · `'height'` | window width · height | `refW` · `refH` |
| Shorter · longer side | `'min'` · `'max'` | shorter · longer side | `min` · `max` of the reference |
| Diagonal | `'diagonal'` | `√(w² + h²)` | `√(refW² + refH²)` |
| Perimeter | `'perimeter'` | `w + h` | `refW + refH` |

The built-in `hdp` divides the height by **300**. A custom `'height'` axis divides by `reference.height` (533 by default), which is what a designer drawing on a full frame expects.

## Curves

| Curve | Spec / JSON | Factor |
|---|---|---|
| Linear | `'linear'` | `r` (= `sdp` with the default reference) |
| Power | `{type: 'power', exponent: 0.8}` | `r^e` (built-in power uses 0.75, the default when `exponent` is omitted) |
| Logarithmic | `{type: 'logarithmic', k: 0.4}` | `1 + k·ln(r)` (default `k` 0.4) |
| Interpolated | `{type: 'interpolated', t: 0.5}` | `1 + (r − 1)·t` (default `t` 0.5) |
| Constant | `{type: 'constant', factor: 1}` | `f` (`factor: 1` = plain dp) |
| Breakpoints | `{type: 'breakpoints', points: [{at: 360, factor: 1}, {at: 600, factor: 1.25}]}` | piecewise linear over the **absolute** axis value (dp), clamped to the first and last points |
| Text expression | `{type: 'expression', expression: 'pow(ratio, 0.8)'}` | your formula ([text formulas](text-formulas.md)) |
| Code | `{type: 'custom', fn: (ratio, screen) => …}` (code only) | your formula, pure |

## Bounds

- `clamp` limits the **factor**. If rules leave `min > max`, the max wins. Declared configs are validated up front (`RangeError: strategy: minFactor must be <= maxFactor`).
- `valueClamp` limits the **resulting dp**. The bounds apply to the magnitude, so a negative offset mirrors a positive one and 0 stays 0; they must be ≥ 0. Value bounds make the strategy value-dependent (evaluated per value).
- `clamp: null`, `valueClamp: null` and `formula: null` clear what a parent set.

## Aspect ratio

`aspectRatio: true` multiplies the factor by `1 + k·ln(AR / 1.78)`, where `AR = longSide / shortSide` and the default `k` is the built-in 0.08 / 30. Raise `k` (`sensitivity`) for a stronger correction on very long or very square screens. `sensitivity` can also be set on its own, which is useful in a rule.

## Font scale (`csp`)

| Policy | Effect on `csp(14, brand)` |
|---|---|
| `'follow'` (default) | follows the user font scale, like `ssp` |
| `'ignore'` | fixed size; the system font scale is cancelled |
| `{max: 1.3}` | follows it up to 1.3×, then stops |

React Native multiplies every `fontSize` by the user font scale (`PixelRatio.getFontScale()`) itself, unless `allowFontScaling={false}`. So `csp` / `s.sp` return a `fontSize` in which the policy is **pre-compensated**: with `{max: 1.3}` and a system scale of 2, `csp(14, s)` returns `14 × factor × 1.3 / 2`, which React Native turns into `14 × factor × 1.3` on screen. `s.spDp(v)` returns that final size in dp, for `allowFontScaling={false}` or layout math. Never pass `cspPx` / `spPx` to `fontSize`.

## Multi-window

`ignoreMultiWindow: true` keeps values unscaled in split screen and freeform windows: the factor is 1, and formulas and transforms are skipped. Value bounds still apply. To react to split screen yourself instead, use a rule (`when: {multiWindow: true}`) or read `multiWindow` in a formula. The library reports multi-window when the window is smaller than 85% of the screen on either side; force it with `DimenCache.setMultiWindowMode(true | false | null)` or `<AppDimensProvider multiWindowMode>`.

## Rules

A rule changes some fields when its condition matches the window.

```ts
defineCustomStrategy({
  id: 'brand',
  curve: {type: 'power', exponent: 0.8},
  rules: [
    {name: 'large', when: {device: ['tablet', 'desktop']}, set: {curve: {type: 'logarithmic', k: 0.4}}},
    {when: {smallestWidth: {min: 600}, orientation: 'landscape'}, set: {multiplier: 0.9}},
    {when: {device: 'watch'}, set: {axis: 'min', reference: {width: 192, height: 192}, clamp: {min: 0.85, max: 1.15}}},
    {when: {orientation: 'landscape'}, set: {multiplier: 0.95}},
    {when: {multiWindow: true}, set: {clamp: {max: 1.2}}},
    {when: {smallestWidth: {min: 600}}, set: {fontScale: {max: 1.2}}},
  ],
});
```

| Condition | `when` |
|---|---|
| Device class | `device: 'tv'` or `['tablet', 'desktop']` |
| Orientation | `orientation: 'landscape'` · `'portrait'` |
| Smallest width / width / height (dp) | `smallestWidth: {min: 600}`, `width: {max: 1200}`, `height: {…}` |
| Aspect ratio | `aspectRatio: {min: 2}` |
| Split screen | `multiWindow: true` |

- A condition matches when **every** field set in it matches. Ranges are `min <= value < max`. An omitted `when` matches every window.
- All matching rules apply **in declaration order**. A later rule overrides the fields an earlier one set; fields a rule leaves out keep their current value.
- Applied rule names show in `explain()`. Rules without a name show as `#index`.
- Device classes: `phone`, `tablet`, `desktop`, `tv`, `watch`, `car`, `vr`.

### Device class on React Native

The device class is detected in this order:

1. UI mode (`UiModeType.TELEVISION` → `tv`, `CAR` → `car`, `WATCH` → `watch`, `DESK` → `desktop`, `VR_HEADSET` → `vr`), set with `DimenCache.setUiModeType(…)` or `<AppDimensProvider uiModeType>`.
2. `Platform.isTV` → `tv`.
3. `Platform.OS` `macos` / `windows` → `desktop`.
4. Size: `sw >= 600` → `tablet`, otherwise `phone`.

Replace it with `setDeviceClassResolver((metrics) => …)` (pass `null` to restore the default). Range rules (`when: {smallestWidth: {min: 600}}`) do not depend on detection; prefer them when only the size matters.

## Extending

```ts
import {BuiltInStrategies, CustomPresets, defineCustomStrategy} from 'appdimens-react-native/custom';

const soft = BuiltInStrategies.POWER.extend('soft', {curve: {type: 'power', exponent: 0.6}});
const myTv = CustomPresets.TV_SAFE.extend('myTv', {rules: [{when: {device: 'tv'}, set: {clamp: {max: 1.6}}}]});
const kiosk = defineCustomStrategy({id: 'kiosk', extends: 'tvSafe', multiplier: 1.1});
const heights = brand.withAxis('height');   // "brand@height", cached per strategy instance, not registered
```

`extend(id, patch, {register?})` keeps the parent's fields and rules (the parent's rules first) and lets you change any of them; it registers the new strategy unless `register: false`. `extends` in a spec takes a registered id, a built-in or a preset.

### Built-ins as configs

`BuiltInStrategies.SCALED`, `POWER`, `LOGARITHMIC`, `INTERPOLATED`, `DIAGONAL`, `PERIMETER` and `FIXED` (ids `scaled`, `power`, `logarithmic`, `interpolated`, `diagonal`, `perimeter`, `fixed`). Their factors match the built-in strategies on the default smallest-width path, so they are a safe starting point. `BuiltInStrategies.SCALED` is the default strategy until `setDefaultCustomStrategy` is called, so `cdp(16)` equals `sdp(16)`.

### Presets (`CustomPresets`)

| Preset | Id | What it does |
|---|---|---|
| `TABLET_FRIENDLY` | `tabletFriendly` | Linear on phones; `power(0.5)` on tablets and desktop; factor ≤ 1.8 |
| `COMPACT_FIRST` | `compactFirst` | Reference 360×640, `interpolated(0.5)`, factor 0.9–1.4 |
| `TV_SAFE` | `tvSafe` | On TV: height axis vs 540 dp, factor 1–2 |
| `WEARABLE` | `wearable` | On watch: shorter side vs 192 dp, factor 0.85–1.15 |
| `GAME_HUD` | `gameHud` | Shorter side, `power(0.85)`, aspect ratio on, 0.75–2.5, fixed-size text |
| `READABLE_TEXT` | `readableText` | `logarithmic(0.4)`, font scale capped at 1.3 |

Presets are not registered by default, but `getCustomStrategy('tvSafe')`, `cdp(16, 'tvSafe')` and JSON `extends` find them by id.

[Back to the custom docs](README.md)
