# Auto strategy

Prefix `a`. Linear like scaled up to 480 dp, then a logarithmic tail. Tablets grow less than a straight line, without the flat plateaus of `fluid`.

```ts
import {asdp, ahdp, awdp, assp, autoDp, autoSp} from 'appdimens-react-native/auto';
```

## What it is

Auto has the same names as scaled with the `a` prefix: `asdp`, `ahdp`, `awdp` for dp, and `assp`, `asem`, `ahsp`, `awsp` for font sizes. Below 480 dp it matches scaled exactly (without `a`). Above 480 dp, growth continues on a log curve, so the tablet result is smaller than the linear one.

## Formula

`dim` is the smallest side (`asdp`), the height (`ahdp`) or the width (`awdp`).

```text
factor = dim / 300                                  if dim <= 480
factor = 1.6 + 0.4 * ln(1 + (dim - 480) / 300)      if dim > 480
out    = value * factor                             (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

At 480 dp both branches give 1.6, so the curve is continuous.

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {asdp, assp} from 'appdimens-react-native/auto';

// asdp(16) = 19.2 at a 360 dp smallest side
<View style={{padding: asdp(16)}} />

// assp(14) = 16.8 at 360 dp, before React Native applies the font scale
<Text style={{fontSize: assp(14)}}>Title</Text>
```

On a 600 dp smallest side, `asdp(16)` is 27.75, while `sdp(16)` is 32.

Number extensions: `import 'appdimens-react-native/auto/number';`, then `(16).asdp`. Builders are `autoDp(v)` and `autoSp(v)`. Facilitators such as `asdpRotate`, `asdpMode`, `asdpQualifier` and `asdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `ahdp`, `awdp`, `assp` and `ahsp` families.

## When to use / not use

- **Use** it for phone-first tokens that should not double on tablets, so one token set works across screen sizes without per-breakpoint values.
- **Avoid** it where exact proportions matter on large windows, such as grids that must match a percentage. Check the values above 480 dp.

## Trade-offs

- Without `a`, identical to scaled up to 480 dp, so phone layouts do not change. With `a` the two differ.
- Above 480 dp the growth bends. Long copy and grids there need a visual check.

[Back to index](README.md)
