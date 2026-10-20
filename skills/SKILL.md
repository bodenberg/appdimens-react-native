---
name: appdimens-react-native-workflow
description: Use this skill for any React Native responsive layout or scaling question (including custom scaling strategies: defineCustomStrategy, cdp/csp, per-device scaling rules, scaling JSON shared across platforms) — making apps look right on phones, tablets, foldables, TVs or different window sizes — and whenever the user mentions appdimens-react-native, appdimens-dynamic, sdp, hdp, wdp, ssp, sem, DimenCache, useDimenMetrics, createDimenStyles, DimenStyleSheet, AutoResizeText, autoResize, responsive dp/sp, or scaling strategies. Also trigger when the user wants to install the package, port Android (Compose/Views) AppDimens code to React Native, choose a strategy, implement constraint-based resize, or convert fixed style numbers to scaled values. When in doubt, use this skill — it covers install, strategy selection, implementation, reactivity and resize.
---

# AppDimens Dynamic for React Native — project workflow

**Library (3.2.0):** npm package `appdimens-react-native`. Main entry = core + **scaled** strategy + React integration; one sub-path per extra strategy (`/percent`, `/power`, `/fluid`, `/auto`, `/diagonal`, `/fill`, `/fit`, `/interpolated`, `/logarithmic`, `/perimeter`, `/density`) plus `/resize` and `/units`. API names are identical to the Android library [appdimens-dynamic](https://github.com/bodenberg/appdimens-dynamic) 3.2.0.

**Install:** `npm install appdimens-react-native` (pure JS — no native module, no pods, works with Expo, New Architecture, Hermes, React Native Web).

**Authoritative docs (in this repo):**
- [README.md](../README.md) — install, Android → RN mapping, every API family
- [docs/README.md](../docs/README.md) — per-strategy guides and decision flow
- [docs/API-CONVENTIONS.md](../docs/API-CONVENTIONS.md) — naming rules (prefixes, suffixes, `Px`, inverters), facilitators, Plain chains, builders
- [docs/MIGRATION-FROM-ANDROID.md](../docs/MIGRATION-FROM-ANDROID.md) — Compose / Views → React Native translation table
- [docs/PERFORMANCE.md](../docs/PERFORMANCE.md) — snapshot + factor-table architecture, benchmark
- [docs/resize.md](../docs/resize.md) — `AutoResizeText`, `useAutoResize*`, `DimenResize`
- Example: [example/App.tsx](../example/App.tsx)

**Package map and strategy → doc index:** [library-map.md](library-map.md) · **API cheat sheet:** [reference.md](reference.md)

---

## Agent preflight (before any non-trivial edit)

1. Read [library-map.md](library-map.md) for the module layout and strategy ↔ doc mapping.
2. Grep the package source for every identifier you plan to use (`node_modules/appdimens-react-native/src/…` in a consumer app, `src/…` in this repo). Generated names follow `scripts/naming.js`; never invent a name.
3. Skim [example/App.tsx](../example/App.tsx) for the idiomatic patterns (styles hook, builders, resize).

**Hard rule:** never surface `ignoreMultiWindows` or the `i` / `ia` suffixes to users (same rule as the Android skill).

**Hard rule (this repo):** files under `src/strategies/**` and the root proxy folders (`power/`, `number/`, …) are generated — edit `scripts/naming.js` / `scripts/generate.js` and run `npm run generate`, never edit them by hand.

---

## Phase 0 — Interactive baseline

Ask one question at a time; skip anything already answered.

### 0.1 Reactivity model
How do components get their styles?

| Choice | Pattern | Note |
|---|---|---|
| **Shared styles (recommended)** | `const useStyles = createDimenStyles(() => ({…sdp(16)…}))` | factory runs once per window snapshot, every component re-renders on change |
| **Token sheets** | `DimenStyleSheet.create({card: {padding: '16sdp'}})` | register satellite kernels first (`DimenStyleSheet.register(powerKernels)`) |
| **Inline values** | `sdp(16)` in render + `useDimenMetrics()` in the component | without the hook the component won't update on rotation |
| **Kotlin style** | `import 'appdimens-react-native/number'` → `(16).sdp` | opt-in, still needs a subscription for re-render |

### 0.2 Axis (`DpQualifier`)
- **`SMALL_WIDTH` (default)** — `sdp` / `ssp`; right for most phone/tablet layouts.
- **`HEIGHT` / `WIDTH`** — `hdp` / `wdp`; vertical rhythm or width-driven columns. Inverters (`sdpLh`, `hdpLw`, `wdpPh`, …) swap axes by orientation.

### 0.3 Task type
- **Scaling strategy** (global curve) → Phase 1.
- **Resize** (fit-to-container: auto-size text, square thumbnails) → Phase 3.
- **Both** → Phase 1 then Phase 3.

### 0.4 Scope
Whole app or listed screens/components? For partial scope, list the files first.

### 0.5 Acceptance criteria
Per screen, plain-language criteria (e.g. "title never wraps on a 320 dp phone", "comfortable padding on a 10-inch tablet"). Tie every recommendation to them.

---

## Phase 1 — Strategy selection

### Default: Scaled (`appdimens-react-native`)
Linear around a 300 dp reference: `sdp(16)` = 19.2 dp on a 360 dp phone, 42.7 dp on an 800 dp tablet.

| Function | Typical use |
|---|---|
| `sdp` | padding, margins, radii, icons |
| `hdp` | row heights, vertical rhythm |
| `wdp` | width-driven columns |
| `ssp` / `hsp` / `wsp` | font sizes (RN applies the user font scale) |
| `sem` | font sizes that must ignore the user font scale |
| `sdpa`, `hdpa`, … | very wide/tall aspect ratios |

### Other strategies
Read the matching guide in [docs/](../docs/README.md) before recommending one; quote its trade-offs, not memory.

| Strategy | Import / prefix | Typically when | Not ideal when |
|---|---|---|---|
| Percent | `/percent`, `p` + `spaceW/H/Sw` | literal % of an axis | "design at 300 dp" feel is enough |
| Power | `/power`, `pw` | tablets feel too big with linear | need strict linear mapping |
| Fluid | `/fluid`, `f` | text/spacing bounded 0.8×–1.2× | need growth past 768 dp |
| Auto | `/auto`, `a` | phone-first, damped after 480 dp | need smooth linear everywhere |
| Diagonal | `/diagonal`, `dg` | ultrawide / canvas-like layouts | simple portrait phones |
| Fill | `/fill`, `fl` | hero / full-bleed visuals | touch targets (can overshoot) |
| Fit | `/fit`, `ft` | content boxes that must not overflow | aggressive tablet growth |
| Interpolated | `/interpolated`, `i` | halfway between fixed and linear | need full proportional growth |
| Logarithmic | `/logarithmic`, `log` | strong damping on big screens | proportional feel |
| Perimeter | `/perimeter`, `pr` | frame-perception designs | no such requirement |
| Density | `/density`, `d` | matching pixel-density assets | layout tokens (multiplies by PixelRatio) |
| Physical units | `/units` | mm/cm/inch sizing | Material-style layout |
| Resize | `/resize` | fit text/boxes inside a container | whole-screen proportional layout |
| **Custom** | `/custom`, `cdp` / `csp` | no built-in passes QA; one law shared across apps/platforms; TV / watch / car rules | a built-in already fits (less to maintain) |

**Custom strategy workflow.** Read [docs/custom.md](../docs/custom.md) first.
1. Start from a built-in or preset: `BuiltInStrategies.POWER.extend('x', …)`, `CustomPresets.TABLET_FRIENDLY`, or `"extends"`.
2. Keep one source: a JSON file loaded with `loadCustomStrategies(require(…))`, or one `strategies.ts` module. Reuse the ids from `appdimens.config.json` (`customStrategies`) when it exists.
3. Express device or screen differences as `rules`, never as `if`s at call sites. When no curve fits, write the law as text (`curve: {type: 'expression', expression: '…'}` or `formula: '…'`); prefer that over JS functions when it lives in JSON or is shared with other platforms.
4. In components, use `useCustomStrategy()` (it re-renders) or `<CustomStrategyProvider>`. For `fontSize`, use `csp` / `s.sp()`, never a `Px` value.
5. Verify with `strategy.explain()` on a phone and a tablet.

---

## Phase 2 — Implementation rules

1. **Subscribe for updates.** Every component that computes dimensions in render must use `useDimenMetrics()` or a styles hook (`createDimenStyles` / `DimenStyleSheet.create`). Prefer the styles hooks: one computation per window snapshot, shared.
2. **Font sizes.** Use `ssp`/`hsp`/`wsp`/`sem` for `fontSize`; never a `*Px` value (font scale would apply twice).
3. **Px only for native/canvas interop.** RN styles are in dp; `sdpPx` & co. are for Skia, native modules or `PixelRatio` math.
4. **Plain chains.** When nesting facilitators, pass already-resolved values to the `*Plain` variants or `plainRotate/Mode/Qualifier/Screen` so nothing is scaled twice.
5. **Builders at module scope.** `scaledDp(48).screen(…)` is immutable and resolves on access — declare once, read in render.
6. **Overrides the platform can't detect.** Fold/flip, car, watch and desk modes come from the app (hinge/posture library) via `<AppDimensProvider uiModeType={…}>` or `DimenCache.setUiModeType(…)`. TV and visionOS are detected automatically.
7. **Tests/Storybook.** Use `DimenCache.setMetricsOverride({width, height, density, fontScale})` and reset with `null`.

---

## Phase 3 — Resize work

Ask in order:
1. **Element** — text (`AutoResizeText`, `useAutoResizeTextSp`, `DimenResize.fittingTextSp`) or box (`useAutoResize{Square,Width,Height}Size[Percent]`)?
2. **Constraint source** — the container that receives `onLayout` (RN's `BoxWithConstraints`), or known `width`/`height` passed up front.
3. **Bounds** — dp numbers, `resizeFixedSp`, or screen-axis percent (`resizePercentSw/W/H`); box-local percent via the `…Percent` hooks and `AutoResizePercentBasis`.
4. **Height as a constraint for text** — only with `constrainHeight` when the container height is fixed by its own style (otherwise it shrinks with the text).
5. **Measurement** — built-in estimator by default; pass `measure` for exact native measurement.

Reference: [docs/resize.md](../docs/resize.md).

---

## Phase 4 — Checklist

- [ ] Preflight done; every identifier grepped in source.
- [ ] Phase 0 answered (reactivity, axis, task type, scope, criteria).
- [ ] Scaled presented first; other strategies justified with their guide.
- [ ] Components subscribe (`useDimenMetrics` or styles hook).
- [ ] No `*Px` in `fontSize`; no `i`/`ia` surfaced.
- [ ] `npm run validate` (in this repo) or the app's typecheck/tests pass.

## Output style

For each decision state: strategy and import path, axis (`sdp`/`hdp`/`wdp`), reactivity pattern, resize vs global scaling, and which acceptance criterion it satisfies. Keep diffs small and aligned with [example/App.tsx](../example/App.tsx).
