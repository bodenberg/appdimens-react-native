# Resize (`appdimens-react-native/resize`)

Constraint-based sizing. Resize is not a scaling curve. It picks the largest step in a range that fits a container, for text, squares, widths and heights.

```ts
import {AutoResizeText, DimenResize, resizePercentW, useAutoResizeSquareSize, useAutoResizeTextSp} from 'appdimens-react-native/resize';
```

## What it is

A range `[min, max]` becomes a list of candidate steps. A monotonic `fits` test runs as a binary search, and the largest passing step is returned. The low-level `DimenResize.fitting` returns 0 when nothing fits. The `fitting*` helpers and the hooks fall back to the minimum, so text never collapses to 0.

## Formula

```text
steps  = min, min + step, ..., max         (max is always included)
result = largest step for which fits(step) is true   (binary search)
```

Bounds are dp numbers or `ResizeBound` values:

- `resizeFixedDp(dp)` and `resizeFixedSp(sp)` (sp is multiplied by the font scale)
- `resizePercentSw(p)`, `resizePercentW(p)`, `resizePercentH(p)` (percent of the screen axis, clamped to 0 to 100)

In a 360 dp wide window, `DimenResize.range(resizePercentW(50), 200)` spans 180 to 200 dp. `DimenResize.range` steps by 1 by default, while the box hooks step by 2.

## Usage

Text in a bounded container:

```tsx
import {AutoResizeText} from 'appdimens-react-native/resize';

export function Title({children}: {children: string}) {
  return (
    <AutoResizeText minSp={12} maxSp={28} maxLines={2} containerStyle={{flex: 1}}>
      {children}
    </AutoResizeText>
  );
}
```

Hook with your own `Text`:

```tsx
import {Text, View} from 'react-native';
import {useAutoResizeTextSp} from 'appdimens-react-native/resize';

export function Headline({title}: {title: string}) {
  const {fontSize, onLayout} = useAutoResizeTextSp(title, {minSp: 12, maxSp: 28, maxLines: 2});
  return (
    <View style={{flex: 1}} onLayout={onLayout}>
      <Text style={{fontSize}}>{title}</Text>
    </View>
  );
}
```

Square box:

```tsx
import {View} from 'react-native';
import {useAutoResizeSquareSize} from 'appdimens-react-native/resize';

export function Tile() {
  const {size, onLayout} = useAutoResizeSquareSize({min: 40, max: 200, step: 2, contentPadding: 8});
  return (
    <View style={{flex: 1}} onLayout={onLayout}>
      <View style={{width: size, height: size, backgroundColor: '#4a90e2'}} />
    </View>
  );
}
```

Without React, `DimenResize.fittingTextSp({text, maxWidth: 200, minSp: 10, maxSp: 40, maxLines: 1})` returns the largest font size (sp) that fits.

- Attach `onLayout` to the container whose size limits the content. The container needs a bounded size (for example `flex: 1`), or it shrinks with the content. Before measurement, the hooks return the minimum (`...SizePercent` returns 0); pass `width` and `height` to skip that first frame.

## When to use / not use

- **Use** it for titles, labels and tiles that must adapt to their container, for example a headline limited to two lines.
- **Avoid** it for general typography, where a scaling strategy needs no measurement, and for long lists, where each item would be measured.

## Trade-offs

- The result depends on the container and the text, not on a formula. Measurement happens after layout, so the first render uses the fallback.
- React Native has no synchronous text measurer, so the built-in estimator is used. Pass `measure` for exact results. The estimator breaks overlong words, so set `maxLines` or `maxHeight` to constrain them.
- `AutoResizeText` does not forward `lineHeight` to `Text`. Repeat the same `lineHeight` in `style` when you set one.

[Back to index](README.md)
