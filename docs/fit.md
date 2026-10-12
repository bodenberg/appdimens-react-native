# Fit strategy

Prefix `ft`. "Contain" behaviour, the dual of `fill`: the smaller ratio wins, so the value never grows past the tighter side of the window.

```ts
import {ftsdp, fthdp, ftwdp, ftssp, fitDp, fitSp} from 'appdimens-react-native/fit';
```

## What it is

Fit compares the window with the same two reference sizes as `fill` (300 dp wide, 533 dp high) and takes the smaller ratio. This keeps a design box inside the window. `ftsdp`, `fthdp` and `ftwdp` return the same value, so the axis suffix has no effect.

## Formula

```text
factor = min( shorter / 300 , longer / 533 )
out    = value * factor                     (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {ftsdp, ftssp} from 'appdimens-react-native/fit';

// ftsdp(400) = 480 on a 360 x 800 window: min(1.2, 1.501) * 400
<View style={{maxWidth: ftsdp(400)}} />

// ftssp(16) = 19.2 before React Native applies the font scale
<Text style={{fontSize: ftssp(16)}}>Readable body text</Text>
```

Number extensions: `import 'appdimens-react-native/fit/number';`, then `(400).ftsdp`. Builders are `fitDp(v)` and `fitSp(v)`. Facilitators such as `ftsdpRotate`, `ftsdpMode`, `ftsdpQualifier` and `ftsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `fthdp`, `ftwdp`, `ftssp` and `fthsp` families.

## When to use / not use

- **Use** it for readable content boxes, forms and modals, and for landscape or ultrawide windows where `fill` or `wdp` make elements too large.
- **Avoid** it for backgrounds and hero images that must reach the edges.

## Trade-offs

- Conservative and safe on wide windows: nothing grows past the tighter side.
- Leaves empty space at the sides or top and bottom. Plan for it in the design.

[Back to index](README.md)
