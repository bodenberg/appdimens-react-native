# Power strategy

Prefix `pw`. Growth is sublinear: the factor follows the 0.75 power of the axis ratio, so large windows grow more slowly than with `sdp`.

```ts
import {pwsdp, pwhdp, pwwdp, pwssp, powerDp, powerSp} from 'appdimens-react-native/power';
```

## What it is

The names mirror scaled with the `pw` prefix: `pwsdp`, `pwhdp`, `pwwdp` for dp, and `pwssp`, `pwsem`, `pwhsp`, `pwwsp` for font sizes. Use it where linear growth is too strong on wide windows, but logarithmic growth would be too flat.

## Formula

`dim` is the smallest side (`pwsdp`), the height (`pwhdp`) or the width (`pwwdp`).

```text
factor = (dim / 300) ^ 0.75
with a: factor * (1 + k * ln(nAR)),  k = 0.08 / 30
out    = value * factor
```

`nAR` is defined as in the scaled guide.

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {pwsdp, pwssp} from 'appdimens-react-native/power';

// pwsdp(16) = 18.34 (sdp gives 19.2)
<View style={{padding: pwsdp(16)}} />

// pwssp(14) = 16.05 before React Native applies the font scale
<Text style={{fontSize: pwssp(14)}}>Title</Text>
```

On a 768 dp smallest side, `pwsdp(16)` is 32.38, against 40.96 for `sdp(16)`.

Builders use the same pattern as scaled. `powerDp(16).screen(UiModeType.TELEVISION, 24).pwsdp` returns 27.52 on a TV and 18.34 otherwise. Facilitators such as `pwsdpRotate`, `pwsdpMode`, `pwsdpQualifier` and `pwsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, and so do the `pwhdp`, `pwwdp`, `pwssp` and `pwhsp` families.

```ts
import {UiModeType} from 'appdimens-react-native';
import {powerDp} from 'appdimens-react-native/power';

const padding = powerDp(16).screen(UiModeType.TELEVISION, 24).pwsdp;
```

Number extensions: `import 'appdimens-react-native/power/number';`, then `(16).pwsdp`.

## When to use / not use

- **Use** it on tablets, monitors and landscape layouts for icons, margins and containers that should grow less fast than `sdp`.
- **Avoid** it as the only curve for a whole design system. On phones the values stay close to scaled, so the gain is small and a mixed token set is harder to review.

## Trade-offs

- Smooth, with no breakpoints, and the same API shape as scaled.
- Still grows with the window, only more slowly. Components that use `pw*` differ from the `sdp` baseline, so document which family each one uses.

[Back to index](README.md)
