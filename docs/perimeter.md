# Perimeter strategy

Prefix `pr`. The scale follows the sum of the window's two sides, so both width and height count.

```ts
import {prsdp, prhdp, prwdp, prssp, perimeterDp, perimeterSp} from 'appdimens-react-native/perimeter';
```

## What it is

The perimeter factor is the sum of the shorter and longer sides, divided by 833. The constant is `BASE_PERIMETER_DP`, which equals 300 + 533. `prsdp`, `prhdp` and `prwdp` return the same value, so the axis suffix has no effect.

## Formula

```text
factor = (shorter + longer) / 833      833 = BASE_PERIMETER_DP (300 + 533)
out    = value * factor                (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {View} from 'react-native';
import {prsdp} from 'appdimens-react-native/perimeter';

// prsdp(16) = 22.28 on a 360 x 800 window: (360 + 800) / 833 * 16
<View style={{padding: prsdp(16)}} />
```

Number extensions: `import 'appdimens-react-native/perimeter/number';`, then `(16).prsdp`. Builders are `perimeterDp(v)` and `perimeterSp(v)`. Facilitators such as `prsdpRotate`, `prsdpMode`, `prsdpQualifier` and `prsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `prhdp`, `prwdp`, `prssp` and `prhsp` families.

## When to use / not use

- **Use** it for cards, thumbnails and frame-like containers whose size should respond to the total size of the window.
- **Avoid** it for text and for anything that depends on one axis, such as a column width.

## Trade-offs

- Simple and linear in the total of the sides.
- Close to `diagonal` on most windows. Pick one of the two per component family, or the scales can clash on the same screen.

[Back to index](README.md)
