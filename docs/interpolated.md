# Interpolated strategy

Prefix `i`. Halfway between a fixed value and the fully linear value. The design value keeps half of its weight.

```ts
import {isdp, ihdp, iwdp, issp, interpolatedDp, interpolatedSp} from 'appdimens-react-native/interpolated';
```

## What it is

Interpolated averages the fixed design value and the linear value (`value * dim / 300`). On a phone it grows by about half of the scaled amount. It is a compromise between "always the same dp" and "fully proportional to the axis". `isdp`, `ihdp` and `iwdp` are the dp names, and `issp`, `isem`, `ihsp` and `iwsp` the font-size names.

## Formula

`dim` is the smallest side (`isdp`), the height (`ihdp`) or the width (`iwdp`).

```text
factor = 0.5 + 0.5 * dim / 300        (= 1 + (dim / 300 - 1) * 0.5)
out    = value * factor               (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1. On a 360 dp smallest side the factor is 1.1.

```tsx
import {Text, View} from 'react-native';
import {isdp, issp} from 'appdimens-react-native/interpolated';

// isdp(14) = 15.4 (sdp gives 16.8)
<View style={{padding: isdp(14)}} />

// issp(14) = 15.4 before React Native applies the font scale
<Text style={{fontSize: issp(14)}}>Title</Text>
```

Number extensions: `import 'appdimens-react-native/interpolated/number';`, then `(14).isdp`. Builders are `interpolatedDp(v)` and `interpolatedSp(v)`. Facilitators such as `isdpRotate`, `isdpMode`, `isdpQualifier` and `isdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `ihdp`, `iwdp`, `issp` and `ihsp` families.

## When to use / not use

- **Use** it when scaled pulls too hard on tablets, but fixed dp looks too small there.
- **Avoid** it when you need exact proportions (use scaled or percent) or the full linear effect.

## Trade-offs

- One simple rule that is easy to explain: "halfway".
- The 0.5 weight is fixed, with no tuning knob. For another blend, use builders with `screen(...)` or choose another strategy.

[Back to index](README.md)
