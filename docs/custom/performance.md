# Performance

Custom strategies cost the same as the built-ins when they only depend on the screen. Which form you pick decides the lane.

| Form | Per window snapshot | Per value |
|---|---|---|
| `customScaleStrategy(…)`, any curve, rules, factor bounds, aspect ratio | function / curve once | one multiply |
| text formula shaped `base * E` (E reads no value) | `E` once | one multiply |
| `scalingFormula(s => …)`, other text formulas, `transform`, `valueClamp` | | formula / function on every call |

## How it works

- **Memo per snapshot.** Each strategy keeps the last resolved `DimenMetrics` snapshot (rules applied, factor computed). A new snapshot (rotation, resize, fold, font scale, UI mode, multi-window, an `AppDimensProvider` override) resolves again once. `resolveScreen(screen)` is not memoized.
- **One multiply.** A screen-only strategy turns `cdp(16, product)` into a memo check plus one multiply.
- **Value-dependent lane.** Value bounds, code formulas, transforms and non-proportional text formulas add a few operations per call; there is no per-value cache, the work is evaluated each time.
- **Fast path for text.** `base * E` is detected when the formula is parsed; the result is bit for bit the same as evaluating it per value.
- **React.** `useCustomStrategy()` memoizes its bound helpers per strategy and snapshot, so components re-render only when the window changes.

## Guidelines

1. Prefer a factor (`customScaleStrategy`, a curve, rules) over a per-value formula when the math is "base × something about the screen".
2. Use `valueClamp` only for real absolute limits (tap targets ≥ 48 dp, max text size).
3. Declare strategies once: a module-level `const`, one `strategies.ts` module, or a JSON document loaded at startup.
4. Keep functions pure and cheap. Factor functions run once per snapshot; formula functions run on every call.
5. Inline text formulas (`cdp(16, '…')`) are shared per text, so they are fine in components. Building strategies from dynamic strings in a loop is not: past 256 distinct texts each call parses a new strategy.
6. For `StyleSheet`-heavy screens, compute styles from `useCustomStrategy()` inside `useMemo`, keyed on the bound helpers.

[Back to the custom docs](README.md)
