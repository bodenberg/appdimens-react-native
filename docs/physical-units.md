# Physical units (`appdimens-react-native/units`)

Converts real-world lengths (mm, cm, inch) into dp and px. It is not a scaling curve.

```ts
import {DimenPhysicalUnits, UnitType, cm, cmPx, inch, inchPx, mm, mmPx} from 'appdimens-react-native/units';
```

## What it is

Physical units turn a real-world measure into a dp value for layout. They suit specs written in millimetres, such as a minimum tap target, or in inches for a physical mockup. React Native does not expose the display's real DPI, so the library uses a logical reference.

## Formula

```text
dpPerInch = 160 (Android), 163 (iOS), 96 (web)
mm   -> dp = mm / 25.4 * dpPerInch
cm   -> dp = (cm * 10) mm -> dp
inch -> dp = inch * dpPerInch
px   = dp * density                     (mmPx, cmPx, inchPx)
sp   = dp / fontScale                   (toSpFromMm, toSpFromCm, toSpFromInch)
```

`DimenPhysicalUnits.setDpPerInch(value)` overrides the reference, and `setDpPerInch(null)` restores the platform default.

## Usage

```tsx
import {View} from 'react-native';
import {mm} from 'appdimens-react-native/units';

// 9 mm square: 56.69 dp on Android
<View style={{width: mm(9), height: mm(9)}} />
```

Font size whose rendered size equals 2 mm, whatever the user's font scale:

```tsx
import {Text} from 'react-native';
import {DimenPhysicalUnits} from 'appdimens-react-native/units';

<Text style={{fontSize: DimenPhysicalUnits.toSpFromMm(2)}}>Label</Text>
```

`mmPx(10)` returns 188.98 px for 10 mm at density 3 on Android. `DimenPhysicalUnits.radiusFromDiameter(24, UnitType.MM)` returns a radius in dp, and `DimenPhysicalUnits.toDp(value, UnitType.CM)` converts any `UnitType`. Conversions between units are available as `mmToCm`, `cmToInch`, `inchToMm` and the rest of the `DimenPhysicalUnits` object.

## When to use / not use

- **Use** it for accessibility minimums stated in mm, print sizes and physical mockups, and anything stakeholders measure in inches.
- **Avoid** it for the layout grid. Real screen density differs between devices and the values use a nominal reference, so use a scaling strategy there.

## Trade-offs

- Speaks real-world units and is independent of the scaling strategies.
- Nominal rather than measured: the result is only as accurate as the dp-per-inch reference.

[Back to index](README.md)
