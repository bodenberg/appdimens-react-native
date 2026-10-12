# Diagonal strategy

Prefix `dg`. The scale follows the length of the window's diagonal instead of one side.

```ts
import {dgsdp, dghdp, dgwdp, dgssp, diagonalDp, diagonalSp} from 'appdimens-react-native/diagonal';
```

## What it is

The diagonal combines both sides into one number. `dgsdp`, `dghdp` and `dgwdp` return the same value, so the axis suffix has no effect. The value is also the same in portrait and landscape for the same window, because it depends only on the two sides.

## Formula

```text
diagonal = sqrt(shorter^2 + longer^2)      shorter, longer = the two window sides
factor   = diagonal / 611.6305             611.6305 = sqrt(300^2 + 533^2)
out      = value * factor                  (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {dgsdp, dgssp} from 'appdimens-react-native/diagonal';

// dgsdp(64) = 91.8 dp (the same value in landscape)
<View style={{width: dgsdp(64), height: dgsdp(64)}} />

// dgssp(14) = 20.08 before React Native applies the font scale
<Text style={{fontSize: dgssp(14)}}>Score</Text>
```

Number extensions: `import 'appdimens-react-native/diagonal/number';`, then `(64).dgsdp`. Builders are `diagonalDp(v)` and `diagonalSp(v)`. Facilitators such as `dgsdpRotate`, `dgsdpMode`, `dgsdpQualifier` and `dgsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `dghdp`, `dgwdp`, `dgssp` and `dghsp` families.

## When to use / not use

- **Use** it for sizes that should follow the overall canvas: game boards, pieces, a centred hero icon.
- **Avoid** it for text and for lists, where the width should dominate. The suffix cannot select an axis here.

## Trade-offs

- Balanced between wide and tall windows, and one stable number for "how big is the screen".
- Less intuitive for designers used to width breakpoints. Axis-specific layouts need `sdp`, `hdp` or `wdp`.

[Back to index](README.md)
