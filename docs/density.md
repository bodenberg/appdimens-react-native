# Density strategy

Prefix `d`. The value is multiplied by the screen's pixel density (`PixelRatio.get()`, which is `densityDpi / 160` on Android), so the result is in dp and grows with density.

```ts
import {dsdp, dhdp, dwdp, dssp, densityDp, densitySp} from 'appdimens-react-native/density';
```

## What it is

Density does not respond to the window size. It aligns sizes with the pixel-density bucket of the device, which suits assets that exist per bucket (`drawable-xxhdpi` and so on). `dsdp`, `dhdp` and `dwdp` return the same value, so the axis suffix has no effect.

## Formula

```text
factor = density                 (PixelRatio.get(): 1, 1.5, 2, 2.625, 3, ...)
out    = value * factor          (with a: * (1 + k * ln(nAR)), k = 0.08 / 30)
```

## Usage

Example values assume density 3.

```tsx
import {View} from 'react-native';
import {dsdp} from 'appdimens-react-native/density';

// dsdp(16) = 48 dp on a density 3 device (sdp(16) = 19.2 dp on the phone window above)
<View style={{width: dsdp(16), height: dsdp(16)}} />
```

Number extensions: `import 'appdimens-react-native/density/number';`, then `(16).dsdp`. Builders are `densityDp(v)` and `densitySp(v)`. Facilitators such as `dsdpRotate`, `dsdpMode`, `dsdpQualifier` and `dsdpScreen` (with `Px`, `Plain` and `PlainPx` variants) exist, as do the `dhdp`, `dwdp`, `dssp` and `dhsp` families.

## When to use / not use

- **Use** it for icons or strokes that must match the density buckets of static assets, or for a stated "approximate physical size" next to static resources.
- **Avoid** it for layout. A value of 16 becomes 48 dp on a 3x device and 16 dp on a 1x device, so the UI looks three times larger on the 3x device even though the design value is the same.

## Trade-offs

- Predictable for density-first thinking.
- It diverges from width-based responsive layout: devices with the same width in dp get different sizes. Use it deliberately and document the exception.

[Back to index](README.md)
