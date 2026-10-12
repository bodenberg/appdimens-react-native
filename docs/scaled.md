# Scaled strategy

Scaled is the default strategy and the root export of the package. No sub-path import is needed.

```ts
import {sdp, hdp, wdp, ssp, hsp, wsp, sem, hem, wem} from 'appdimens-react-native';
```

## What it is

Scaled grows a design value linearly with the window, around a **300 dp** reference. `sdp` reads the smallest side of the window, `hdp` its height and `wdp` its width. `ssp`, `hsp` and `wsp` do the same for font sizes. `sem`, `hem` and `wem` are fixed font sizes that ignore the user's font scale.

## Formula

`dim` is the axis in dp: the smaller of width and height (`sdp`), the height (`hdp`) or the width (`wdp`).

```text
factor = dim / 300                                  without a
factor = 1 + (dim - 300) * (1/300 + k * ln(nAR))    with a (aspect ratio)
out    = value * factor

nAR = (longer side / shorter side) / 1.78
k   = 0.08 / 30 (about 0.00267), the default sensitivity
```

`1/300` is the library constant `ADJUSTMENT_SCALE` (`0.1 / 30`). Without `a`, the result is exactly `value * dim / 300`.

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {sdp, ssp} from 'appdimens-react-native';

export function Card() {
  return (
    // sdp(16) = 19.2 dp
    <View style={{padding: sdp(16)}}>
      {/* ssp(14) = 16.8; React Native applies the user's font scale to fontSize */}
      <Text style={{fontSize: ssp(14)}}>Title</Text>
    </View>
  );
}
```

| Name | Result |
|---|---|
| `sdp`, `hdp`, `wdp` | dp on the smallest side, height, width |
| `sdpPx` | the same value in physical pixels (`dp * density`) |
| `sdpa`, `sdpaPx` | with the aspect-ratio correction (`a` suffix) |
| `sdpPh`, `sdpLh`, `sdpPw`, `sdpLw` | smallest side read as height or width, chosen by orientation |
| `hdpLw`, `hdpPw`, `wdpLh`, `wdpPh` | height or width read as the other axis, chosen by orientation |
| `ssp`, `sspPx`, `sem`, `semPx` | font sizes; `sem` ignores the user font scale |

Inverter suffixes: `Ph` = height in portrait, `Lh` = height in landscape, `Pw` = width in portrait, `Lw` = width in landscape. In a 1024 x 768 landscape window, `sdpLw(16)` reads the 1024 dp width and returns 54.61.

Facilitators choose a value by orientation, UI mode or a qualifier. Each has `Px`, `Plain` and `PlainPx` variants, and the same family exists for `hdp`, `wdp`, `ssp`, `hsp` and `wsp`:

```ts
import {DpQualifier, Orientation, UiModeType, scaledDp, sdpQualifier, sdpRotate} from 'appdimens-react-native';

sdpRotate(16, 24, Orientation.PORTRAIT); // 24 scaled in portrait, otherwise 16 scaled
sdpQualifier(16, 24, DpQualifier.SMALL_WIDTH, 600); // 24 scaled if smallest width >= 600, else 16
scaledDp(16).screen(UiModeType.TELEVISION, 24).sdp; // 24 on TV, 16 otherwise
```

For `fontSize`, use `ssp`, `hsp`, `wsp` or `sem`. Do not use the `*Px` values there, because React Native would apply the font scale a second time.

Number extensions are opt-in: `import 'appdimens-react-native/number';` then `(16).sdp`.

Values are read when the function is called. A component updates on rotation only if it subscribes, so call `useDimenMetrics()` (alias `useAppDimens()`) or use `DimenStyleSheet` / `createDimenStyles`.

## When to use / not use

- **Use** for spacing, component sizes and text in most screens. It is the baseline the other strategies are compared with.
- **Avoid** relying on it alone for very large screens (tablets, TVs, desktops), where linear growth gets large. Compare with `power` or `logarithmic` there.

## Trade-offs

- Predictable and cheap: each call reads one cached factor and multiplies.
- Linear growth on wide windows. The aspect-ratio correction (`a`) is opt-in.

[Back to index](README.md)
