# Logarithmic strategy

Prefix `log`. Growth follows a natural logarithm around 300 dp: it grows slowly above the reference and shrinks slowly below it.

```ts
import {logsdp, loghdp, logwdp, logssp, logarithmicDp, logarithmicSp} from 'appdimens-react-native/logarithmic';
```

## What it is

The factor is 1 at 300 dp and changes with a logarithm on either side, so the curve is smooth and monotonic. It damps the extremes of a very wide size range without flat plateaus. `logsdp`, `loghdp` and `logwdp` are the dp names, and `logssp`, `logsem`, `loghsp` and `logwsp` the font-size names.

## Formula

`dim` is the smallest side (`logsdp`), the height (`loghdp`) or the width (`logwdp`).

```text
factor = 1 + 0.4 * ln(dim / 300)     if dim > 300
factor = 1 - 0.4 * ln(300 / dim)     if 0 < dim <= 300
out    = value * factor              (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {logsdp, logssp} from 'appdimens-react-native/logarithmic';

// logsdp(16) = 17.17 at 360 dp (sdp gives 19.2)
<View style={{padding: logsdp(16)}} />

// logssp(14) = 15.02 before React Native applies the font scale
<Text style={{fontSize: logssp(14)}}>Title</Text>
```

On a 240 dp smallest side, `logsdp(16)` is 14.57. On a 600 dp side it is 20.44.

Number extensions: `import 'appdimens-react-native/logarithmic/number';`, then `(16).logsdp`. Builders are `logarithmicDp(v)` and `logarithmicSp(v)`. Facilitators such as `logsdpRotate`, `logsdpMode`, `logsdpQualifier` and `logsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `loghdp`, `logwdp`, `logssp` and `loghsp` families.

## When to use / not use

- **Use** it for one token set across a wide range of sizes, such as navigation icons or accent type that should not jump between a compact phone and a tablet.
- **Avoid** it where stakeholders expect linear proportions, and on small phones where the shrink below 300 dp (0.91 at 240 dp) is not wanted.

## Trade-offs

- Smooth and monotonic, anchored at 300 dp.
- Harder to explain than a linear rule. Document these tokens in the design system.

[Back to index](README.md)
