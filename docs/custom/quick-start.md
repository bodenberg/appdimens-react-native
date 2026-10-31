# Quick start

## 1. Install

```bash
npm install appdimens-react-native   # or: yarn add appdimens-react-native
```

```tsx
import {cdp, cdpPx, csp, customScaleStrategy, scalingFormula, useCustomStrategy} from 'appdimens-react-native/custom';
import 'appdimens-react-native/custom/number';   // optional: (16).cdp, (16).cdpWith(s)
```

The package is pure JavaScript (no native module), works with Expo and the New Architecture.

## 2. Write the math (recommended)

Declare the strategy **once** (at module level), then use it anywhere.

```ts
// Factor: the number that multiplies every value
export const product = customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8));

// Formula: the final value (`base` = the value you pass, the 16 in cdp(16, hud))
export const hud = scalingFormula(({base, sw, pow}) => base * pow(sw / 360, 0.8));
```

The function receives a typed scope (`ScreenScope` / `FormulaScope`): the editor autocompletes `width`, `sw`, `height`, `ratio`, `tablet`, `tv`, `landscape`, `pow`, `clamp`, `min`, `max`, `lerp`… and a typo is a type error. Any other code works too (`Math.*`, `switch`, your own helpers). The full list is in [Code formulas](code-formulas.md).

## 3. Use it

```tsx
<View style={{padding: cdp(16, product)}} />;                // dp, straight into styles
<Text style={{fontSize: csp(18, hud)}}>Score</Text>;         // fontSize, follows the user font scale
const px = cdpPx(24, product);                               // physical px (× PixelRatio)
```

In components, use the hook so the component re-renders on rotation, resize or font-scale changes:

```tsx
function Card() {
  const s = useCustomStrategy(product);
  return (
    <View style={{padding: s.dp(16), borderRadius: s.dp(12)}}>
      <Text style={{fontSize: s.sp(14)}}>Hello</Text>
    </View>
  );
}
```

With the Number extensions: `(16).cdpWith(product)`, `(14).cspWith(hud)`.

Pass `{id: 'product'}` to register a strategy under a name: `cdp(16, 'product')`, `useCustomStrategy('product')` and `(16).cdpWith('product')` then find it.

## 4. Make it the default (optional)

```tsx
import {setDefaultCustomStrategy, CustomStrategyProvider} from 'appdimens-react-native/custom';

setDefaultCustomStrategy(product);       // app-wide: cdp(16), (16).cdp and useCustomStrategy() now use product
<CustomStrategyProvider strategy={hud}><Hud /></CustomStrategyProvider>;   // one subtree
```

## 5. The same thing as text (for JSON and remote config)

```tsx
const remote = scalingFormula('base * pow(sw / 360, 0.8)');
<View style={{padding: cdp(16, 'base * (sw / 360)')}} />;   // inline, shared per text
const s = useCustomStrategy('base * (tablet ? 0.9 : 1)');
```

A string strategy is a strategy **id** first; when no strategy has that id, it is read as a formula. The text form uses the same names (flags are 1 or 0) and works in the strategies JSON (`{"id": "hud", "formula": "base * pow(sw / 360, 0.8)"}`). See [Text formulas](text-formulas.md).

## 6. Need more structure?

Rules per device class, factor bounds, a font-scale cap or a different reference frame go in the full configuration:

```ts
import {defineCustomStrategy} from 'appdimens-react-native/custom';

export const brand = defineCustomStrategy({
  id: 'brand',
  reference: {width: 360, height: 640},
  curve: {type: 'power', exponent: 0.8},
  clamp: {min: 0.85, max: 1.6},
  fontScale: {max: 1.3},
  rules: [{when: {device: ['tablet', 'desktop']}, set: {curve: {type: 'logarithmic', k: 0.4}}}],
});
```

See [Configuration](configuration.md) and [JSON format](json.md).

## 7. Check the numbers

```ts
console.log(product.explain());
// [scale#1] phone smallestWidth=411dp / ref 300 = 1.37 -> custom = 1.1417 => factor 1.1417
```

[Back to the custom docs](README.md)
