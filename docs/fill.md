# Fill strategy

Prefix `fl`. "Cover" behaviour: the larger of two ratios wins, so the value grows enough to fill the window on whichever side is tighter.

```ts
import {flsdp, flhdp, flwdp, flssp, fillDp, fillSp} from 'appdimens-react-native/fill';
```

## What it is

Fill compares the window with the two reference sizes, 300 dp wide and 533 dp high, and takes the larger ratio. `flsdp`, `flhdp` and `flwdp` return the same value, so the axis suffix has no effect.

## Formula

```text
factor = max( shorter / 300 , longer / 533 )
out    = value * factor                     (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

`300` and `533` are `BASE_WIDTH_DP` and `BASE_HEIGHT_DP`.

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {View} from 'react-native';
import {flsdp} from 'appdimens-react-native/fill';

// flsdp(120) = 180.11 on a 360 x 800 window: max(1.2, 1.501) * 120
<View style={{height: flsdp(120)}} />
```

Number extensions: `import 'appdimens-react-native/fill/number';`, then `(120).flsdp`. Builders are `fillDp(v)` and `fillSp(v)`. Facilitators such as `flsdpRotate`, `flsdpMode`, `flsdpQualifier` and `flsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `flhdp`, `flwdp`, `flssp` and `flhsp` families.

Font sizes follow the same rule. `flssp(14)` is `14 * 1.501 = 21.01` on a 360 x 800 window, before React Native applies the font scale.

## When to use / not use

- **Use** it for backgrounds, hero images and full-bleed sections that should dominate the available space.
- **Avoid** it for global padding and margins. On tall phones the factor follows the height, so paddings become large.

## Trade-offs

- Strong fill effect, which suits marketing visuals and landscape layouts.
- Content can overflow a fixed box. Pair it with `fit` for text panels on the same screen.

[Back to index](README.md)
