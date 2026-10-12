# Fluid strategy

Prefix `f`. A clamp-like curve: growth is limited to a band between 0.8 and 1.2 times the design value, with a linear ramp between 320 dp and 768 dp.

```ts
import {fsdp, fhdp, fwdp, fssp, fsem, fluidDp, fluidSp} from 'appdimens-react-native/fluid';
```

## What it is

Fluid keeps phone sizes close to the design value and stops growth at both ends. Below 320 dp the factor is 0.8. Above 768 dp it is 1.2. In between it is a straight line, so there are no breakpoints.

## Formula

`dim` is the smallest side (`fsdp`, `fssp`), the height (`fhdp`) or the width (`fwdp`).

```text
factor = 0.8                              if dim <= 320
factor = 0.8 + 0.4 * (dim - 320) / 448    if 320 < dim < 768
factor = 1.2                              if dim >= 768
out    = value * factor                   (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {fsdp, fssp} from 'appdimens-react-native/fluid';

// fsdp(16) = 13.37 (sdp gives 19.2)
<View style={{padding: fsdp(16)}} />

// fssp(14) = 11.70 before React Native applies the font scale
<Text style={{fontSize: fssp(14)}}>Body</Text>
```

Number extensions: `import 'appdimens-react-native/fluid/number';`, then `(16).fsdp`. Builders are `fluidDp(v)` and `fluidSp(v)`. Facilitators such as `fsdpRotate`, `fsdpMode`, `fsdpQualifier` and `fsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `fhdp`, `fwdp`, `fssp` and `fhsp` families.

## When to use / not use

- **Use** it for type and spacing that should stay steady on common phones (320 to 768 dp), for example card bodies and dense lists.
- **Avoid** it on tablets and TVs. Above 768 dp the value stops growing, so a 16 dp token is 19.2 dp on every large screen.

## Trade-offs

- Stable on phones, with no breakpoints.
- Flat at both ends: every window below 320 dp gets the 0.8 factor, and every window above 768 dp gets the 1.2 factor. Check both edges in QA.

[Back to index](README.md)
