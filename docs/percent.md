# Percent strategy

Prefix `p`. The module has two families: percent-prefixed copies of the scaled names (`psdp`, `phdp`, `pwdp`, `pssp`, ...) and literal percentage helpers (`spaceW`, `spaceH`, `space`, ...).

```ts
import {psdp, phdp, pwdp, pssp, spaceW, spaceH, spaceSw, space, spacePx} from 'appdimens-react-native/percent';
```

## What it is

- `psdp`, `phdp` and `pwdp` produce the same values as `sdp`, `hdp` and `wdp`: linear in the axis over 300 dp.
- `space*` helpers take a percentage from 0 to 100 and return that share of a screen axis or of a reference length, in dp (or px with `Px`).

## Formula

```text
psdp, phdp, pwdp = value * dim / 300           (with a: as in scaled)
spaceW(p)        = p / 100 * window width      (dp)
spaceH(p)        = p / 100 * window height     (dp)
spaceSw(p)       = p / 100 * smallest side     (dp)
space(p, ref)    = p / 100 * ref               (dp)
spacePx(p, ref)  = space(p, ref) * density     (px)
```

Font variants: `spaceWSp(p, fontScale = true)` returns the dp-like size for `fontSize`. With `fontScale = false` it divides by the font scale, so the rendered size stays fixed. `spaceSp(p, ref, fontScale = true)` does the same for a reference length.

## Usage

Example values assume a 360 x 800 dp portrait window, density 3 and font scale 1.

```tsx
import {Text, View} from 'react-native';
import {psdp, spaceSwSp, spaceW} from 'appdimens-react-native/percent';

// spaceW(90) = 324 dp; psdp(16) = 19.2 dp
<View style={{width: spaceW(90), padding: psdp(16)}} />

// spaceSwSp(4) = 14.4 (4% of 360); React Native applies the font scale
<Text style={{fontSize: spaceSwSp(4)}}>Caption</Text>
```

`spaceW(15)` returns 54. `spacePx(25, 200)` returns 150 px (25% of 200 dp at density 3).

Builders follow the scaled pattern: `percentDp(16)` exposes `psdp`, `phdp` and `pwdp`, and `percentSp(14)` exposes `pssp`. Facilitators such as `psdpRotate` and `psdpQualifier` (with `Px`, `Plain` and `PlainPx` variants) exist for every `p` family name.

Number extensions: `import 'appdimens-react-native/percent/number';`, then `(16).psdp`.

The `i`-suffixed helpers (for example `spaceWi`) ignore multi-window. In a constrained window they return the raw percentage instead of a length, so prefer the plain names.

## When to use / not use

- **Use** `space*` when the spec is a literal share of the screen: two-column splits, "always 30% of the width", percentage gutters, or text sized as a percentage of the window.
- **Avoid** `space*` for general token spacing. It is a length of the current window, so it changes on rotation and split-screen and gives large values on wide windows.
- **Avoid** `psdp` as a different curve. It returns the same values as `sdp`, so it adds no new behaviour.

## Trade-offs

- Literal and easy to explain: `spaceW(30)` answers "how many dp is 30% here" directly.
- The helpers depend on the current window size, so every token that uses them moves on rotation.

[Back to index](README.md)
