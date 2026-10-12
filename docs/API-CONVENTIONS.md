# API conventions

The React Native surface mirrors the Android/Compose one ([COMPOSE-API-CONVENTIONS.md](https://github.com/bodenberg/appdimens-dynamic/blob/main/DOCUMENTATION/COMPOSE-API-CONVENTIONS.md)). Every generated name comes from [`scripts/naming.js`](../scripts/naming.js); the parity tests check all of them.

## 1. Imports

```ts
import {sdp, hdp, wdp, ssp, sem, DpQualifier, Orientation, UiModeType} from 'appdimens-react-native';
import {psdp, spaceW} from 'appdimens-react-native/percent';
import {pwsdp} from 'appdimens-react-native/power';
```

## 2. Strategy prefix map

| Strategy | Import | Dp (SW / H / W) | Sp | Fixed Sp |
|---|---|---|---|---|
| scaled | `appdimens-react-native` | `sdp` / `hdp` / `wdp` | `ssp` / `hsp` / `wsp` | `sem` / `hem` / `wem` |
| percent | `/percent` | `psdp` / `phdp` / `pwdp` | `pssp` / `phsp` / `pwsp` | `psem` / `phem` / `pwem` |
| power | `/power` | `pwsdp` / `pwhdp` / `pwwdp` | `pwssp` / … | `pwsem` / … |
| fluid | `/fluid` | `fsdp` / `fhdp` / `fwdp` | `fssp` / … | `fsem` / … |
| auto | `/auto` | `asdp` / `ahdp` / `awdp` | `assp` / … | `asem` / … |
| diagonal | `/diagonal` | `dgsdp` / … | `dgssp` / … | `dgsem` / … |
| fill | `/fill` | `flsdp` / … | `flssp` / … | `flsem` / … |
| fit | `/fit` | `ftsdp` / … | `ftssp` / … | `ftsem` / … |
| interpolated | `/interpolated` | `isdp` / … | `issp` / … | `isem` / … |
| logarithmic | `/logarithmic` | `logsdp` / … | `logssp` / … | `logsem` / … |
| perimeter | `/perimeter` | `prsdp` / … | `prssp` / … | `prsem` / … |
| density | `/density` | `dsdp` / … | `dssp` / … | `dsem` / … |

## 3. Suffixes

| Suffix | Meaning |
|---|---|
| *(none)* | default curve on the axis |
| `a` | aspect-ratio correction (`applyAspectRatio`) |
| `i`, `ia` | ignore multi-window (returns the base when the window is constrained) — exists for parity, rarely needed |

### Inverters (middle of the name)

| Stem | Tokens | Inverter |
|---|---|---|
| `sdp` / `ssp` / `sem` | `Ph`, `Lh`, `Pw`, `Lw` | `SW_TO_PH`, `SW_TO_LH`, `SW_TO_PW`, `SW_TO_LW` |
| `hdp` / `hsp` / `hem` | `Lw`, `Pw` | `PH_TO_LW`, `LH_TO_PW` |
| `wdp` / `wsp` / `wem` | `Lh`, `Ph` | `PW_TO_LH`, `LW_TO_PH` |

Order: `stem + inverter + flag` → `sdpLha`, `hdpLwi`.

### `Px` naming (identical to Compose)

| Case | Dp | Sp / fixed Sp |
|---|---|---|
| no inverter | `sdpPx`, `sdpaPx`, `sdpiPx`, `sdpiaPx` | `sspPx`, `sspPxa`, `sspPxi`, `sspPxia` |
| with inverter | `sdpPxLh`, `sdpPxaLh`, `sdpPxiLh`, `sdpPxiaLh` | `sspPxLh`, `sspPxaLh`, … |

## 4. Units

- dp kernels return React Native layout units.
- `ssp` returns a `fontSize`; React Native multiplies by the user font scale (like Android `sp`).
- `sem` returns `ssp / fontScale`, so the rendered size ignores the user font scale.
- `Px` returns physical pixels (`× PixelRatio`, and `× fontScale` for `sspPx`). Never use them as `fontSize`.

## 5. Facilitators

All strategies, all dp and sp stems: `<stem>Rotate`, `<stem>Mode`, `<stem>Qualifier`, `<stem>Screen`, each with `Px`, `Plain`, `PlainPx`.

| Family | Signature | Active when |
|---|---|---|
| Rotate | `(value, rotationValue, orientation = LANDSCAPE, options?)` | current orientation matches |
| Mode | `(value, modeValue, uiModeType, options?)` | current `UiModeType` matches |
| Qualifier | `(value, qualifiedValue, qualifierType, qualifierValue, options?)` | axis dp ≥ threshold |
| Screen | `(value, screenValue, uiModeType, qualifierType, qualifierValue, options?)` | both |

`options`: `finalQualifierResolver` (axis for the active branch), `applyAspectRatio`, `customSensitivityK`, `ignoreMultiWindows`; sp stems also take `fontScale`.

- **Normal** — both branches are scaled (receiver on the stem axis, alternate on `finalQualifierResolver ?? axis`).
- **Plain** — the receiver is already resolved and returned as is; only the alternate is scaled when active (Compose `Plain` with a `Number` alternate).
- **Logic-only** — `plainRotate`, `plainMode`, `plainQualifier`, `plainScreen` (and the `…Px` aliases) choose between two already-resolved values; nothing is converted (Android `code.plain`).

Chaining: nest Plain/logic-only helpers so values are never scaled twice.

## 6. Builders

`<strategy>Dp(value)` → `Dimen<Strategy>` (`scaledDp` → `DimenScaled`) and `<strategy>Sp(value)` → `<Strategy>Sp` (`ScaledSp`). Immutable; values resolve on access.

| Overload | Priority |
|---|---|
| `screen(uiModeType, qualifierType, qualifierValue, customValue, finalQualifierResolver?, orientation?, inverter?)` | 1 |
| `screen(uiModeType, qualifierType, qualifierValue, orientation, customValue, …)` | 1 |
| `screen(uiModeType, customValue, finalQualifierResolver?, orientation?, inverter?)` | 2 |
| `screen(qualifierType, qualifierValue, customValue, finalQualifierResolver?, orientation?, inverter?)` | 3 |
| `screen(orientation, customValue, finalQualifierResolver?, inverter?)` | 4 |
| `screen({uiModeType?, qualifierType?, qualifierValue?, orientation?, customValue, finalQualifierResolver?, inverter?, fontScale?})` | inferred |

Lower priority number wins; within a priority, larger thresholds are checked first. Terminals: `.<P>sdp/.<P>hdp/.<P>wdp` (+`Px`), `.dp(q)`, `.px(q)`, `.sdpHdpWdpPx()`; Sp: `.<P>ssp/.<P>sem` (+`Px`), `.sp(q)`, `.em(q)`, `.spPx(q)`, `.emPx(q)`. Modifiers: `.applyAspectRatio()`, `.aspectRatio(enable, k)`, `.ignoreMultiWindows()`.

## 7. Escape hatches

`toDynamic<Strategy>{Dp,Px,Sp,SpPx}` accept the Android positional order or an options object:

```ts
toDynamicScaledDp(16, 'HEIGHT', 'PH_TO_LW', false, true, 0.01);
toDynamicScaledDp(16, 'HEIGHT', {inverter: 'PH_TO_LW', applyAspectRatio: true, customSensitivityK: 0.01});
toDynamicScaledSp(14, 'SMALL_WIDTH', false); // fontScale = false
```

`customSensitivityK` is the raw coefficient of `ln(aspectRatio / 1.78)`; the default is `0.08 / 30 ≈ 0.00267`.
