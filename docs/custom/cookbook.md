# Cookbook

Ready-to-use strategies. Each one shows the code form and, where it matters, the JSON form. All imports are from `appdimens-react-native/custom`.

## Grow on phones, calm down on tablets

```ts
export const calm = customScaleStrategy(({sw, ratio}) => (sw < 600 ? ratio : 2 + (sw - 600) / 1000));
```

```ts
export const calm = CustomPresets.TABLET_FRIENDLY;   // linear on phones, power(0.5) on tablets, ≤ 1.8
```

## Design frame of 360 dp, never below 85% or above 160%

```ts
export const brand = customScaleStrategy(({sw, clamp}) => clamp(sw / 360, 0.85, 1.6), {id: 'brand'});
```

```json
{ "id": "brand", "reference": { "width": 360, "height": 640 }, "clamp": { "min": 0.85, "max": 1.6 } }
```

## Sublinear growth (big screens grow slower)

```ts
export const soft = customScaleStrategy(({sw, pow}) => pow(sw / 360, 0.75));
```

```json
{ "id": "soft", "reference": { "width": 360, "height": 640 }, "curve": { "type": "power", "exponent": 0.75 } }
```

## TV: scale by height, 10-foot UI

```ts
export const living = customScaleStrategy(({tv, height, ratio, clamp}) => (tv ? clamp(height / 540, 1, 2) : ratio));
```

```json
{ "id": "living", "rules": [ { "when": { "device": "tv" },
  "set": { "axis": "height", "reference": { "width": 960, "height": 540 }, "clamp": { "min": 1, "max": 2 } } } ] }
```

On react-native-tvos `Platform.isTV` makes the device class `tv`; elsewhere set it with `DimenCache.setUiModeType(UiModeType.TELEVISION)`.

## Watch: almost fixed sizes

```ts
export const wrist = customScaleStrategy(({watch, shortSide, ratio, clamp}) => (watch ? clamp(shortSide / 192, 0.85, 1.15) : ratio));
```

## Game HUD: shorter side, aspect-ratio aware

```ts
export const hud = defineCustomStrategy({
  id: 'hud',
  axis: 'min',
  curve: {type: 'power', exponent: 0.85},
  aspectRatio: true,
  clamp: {min: 0.75, max: 2.5},
  fontScale: 'ignore',                     // HUD text never follows the system font size
});
<Text style={{fontSize: csp(14, hud)}}>Lives</Text>;
```

## Readable text: grow slowly, cap the font scale

```tsx
export const body = defineCustomStrategy({id: 'body', curve: {type: 'logarithmic', k: 0.4}, fontScale: {max: 1.3}});
<Text style={{fontSize: csp(16, body)}}>…</Text>;   // React Native applies the font scale, capped at 1.3×
```

## Minimum tap target

```tsx
export const touch = defineCustomStrategy({id: 'touch', valueClamp: {min: 48}});
<Pressable style={{minHeight: cdp(40, touch)}} />;   // never below 48 dp
```

## Whole dp only

```ts
export const snap = scalingFormula(({base, ratio, round}) => round(base * ratio));
```

```json
{ "id": "snap", "formula": "round(base * ratio)" }
```

## Never smaller than the design value

```ts
export const floor = scalingFormula(({base, ratio, max}) => max(base * ratio, base));
```

## Split screen: keep the design values

```ts
export const steady = defineCustomStrategy({id: 'steady', ignoreMultiWindow: true});
```

## Landscape phones: a bit smaller

```ts
export const brand = defineCustomStrategy({
  id: 'brand',
  curve: {type: 'power', exponent: 0.8},
  rules: [{when: {smallestWidth: {max: 600}, orientation: 'landscape'}, set: {multiplier: 0.9}}],
});
```

## A/B test or remote config

```ts
try {
  const json = await fetch('https://example.com/appdimens-strategies.json').then(r => r.text());
  loadCustomStrategies(json);                          // atomic: a bad document changes nothing
} catch (e) {
  console.warn('bad strategies JSON', e);
}
const s = requireCustomStrategy('brand');
```

Load before the first render (or re-render after loading, e.g. with a state flag), because `cdp()` reads the registry when it is called.

## A subtree with its own law

```tsx
<CustomStrategyProvider strategy="hud">
  <Scoreboard />
</CustomStrategyProvider>;

function Scoreboard() {
  const s = useCustomStrategy();
  return <View style={{padding: s.dp(12)}}><Text style={{fontSize: s.sp(18)}}>…</Text></View>;
}
```

## One growth law for a design system

Ship a single `appdimens-strategies.json` with the design tokens, load it at startup with `loadCustomStrategies(require('./appdimens-strategies.json'))`, and use the ids only (`cdp(16, 'brand')`, `(16).cdpWith('brand')`). Android, iOS, Flutter, Web, KMP, Games and .NET read the same file and get the same numbers.

[Back to the custom docs](README.md)
