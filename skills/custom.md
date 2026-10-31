# Custom strategies: agent reference

Use when the user wants their own scaling (a formula, per-device rules, a shared JSON) instead of a built-in. Entry: `appdimens-react-native/custom`. Docs: `docs/custom/` (start at [docs/custom/README.md](../docs/custom/README.md)).

## Decide the form

1. **A built-in passes visual QA?** Keep it. Custom strategies are for when none fits.
2. **The user describes math** ("scale by width over 360, between 0.85 and 1.8"):
   - multiplies every value → `customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8))`
   - computes the final value from `base` → `scalingFormula(({base, sw, pow}) => base * pow(sw / 360, 0.8))`
3. **The formula must live in JSON / remote config / design tokens** → text: `scalingFormula('base * pow(sw / 360, 0.8)')`, `cdp(16, '…')`, JSON `"formula"`.
4. **Different behavior per device / screen range / orientation, bounds, font-scale cap** → `defineCustomStrategy({id, …, rules: [{when: {device: 'tablet'}, set: {…}}]})` or the JSON document.
5. **Several apps or platforms share it** → the JSON document, loaded once (`loadCustomStrategies(require('./appdimens-strategies.json'))`).

## Cheat sheet

```tsx
import {cdp, cdpPx, csp, customScaleStrategy, scalingFormula, defineCustomStrategy, setDefaultCustomStrategy,
  loadCustomStrategies, CustomStrategyProvider, useCustomStrategy, CustomPresets, BuiltInStrategies} from 'appdimens-react-native/custom';
import 'appdimens-react-native/custom/number';   // (16).cdp · (16).cdpWith(s) · (14).cspWith(s)
// cdp(16, s): dp · cdpPx: physical px · csp(14, s): fontSize (policy pre-compensated) · s.spDp: final text dp

export const product = customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8));
export const hud = scalingFormula(({base, sw, pow}) => base * pow(sw / 360, 0.8));
export const brand = defineCustomStrategy({
  id: 'brand', reference: {width: 360, height: 640}, curve: {type: 'power', exponent: 0.8},
  clamp: {min: 0.85, max: 1.6}, fontScale: {max: 1.3},
  rules: [{when: {device: ['tablet', 'desktop']}, set: {curve: {type: 'logarithmic', k: 0.4}}}],
});
setDefaultCustomStrategy(brand);               // cdp(16) / (16).cdp without an argument
<CustomStrategyProvider strategy={hud}>…</CustomStrategyProvider>;   // subtree default for useCustomStrategy()
const s = useCustomStrategy();                 // in components: re-renders on window changes
```

Scope names (code and text): `base` (formula only) `sw width height shortSide longSide diagonal perimeter aspectRatio ratio density fontScale`, flags `phone tablet desktop tv watch car vr landscape portrait multiWindow` (booleans in code, 1/0 in text), code-only `device screen`, math `pow sqrt ln log10 exp abs round min max clamp lerp smoothstep`. `ratio = sw / 300`, so `base * ratio` = `sdp`.

## Rules an agent must follow

- **Declare strategies once** (module-level `const`, one `strategies.ts`, or JSON). Never build `customScaleStrategy(…)` / `scalingFormula(s => …)` inside a component body; wrap in `useMemo` if it must be local. Inline text (`cdp(16, '…')`) is shared per text and is fine.
- **Functions are pure**: no state, settings, time or stores inside. Different state → different strategy or a rule.
- **Prefer a factor** when the math is `base × screen-term`: `customScaleStrategy`, a curve, or text shaped `base * (…)` all cost one multiply. `base * sw / 360` misses the text fast path; write `base * (sw / 360)`.
- **Components must subscribe**: use `useCustomStrategy()` (or `useDimenMetrics()` / `createDimenStyles`) so values update on rotation; plain `cdp()` reads the window once per call.
- **Font sizes**: `csp` / `s.sp` for `fontSize`; never `cspPx` / `spPx` (React Native would scale twice); `s.spDp` only with `allowFontScaling={false}`.
- **Value bounds** (`valueClamp`) only for real absolute limits (tap targets, max text); they must be ≥ 0.
- **Text vs code**: code functions cannot be exported to JSON; use text when the user mentions JSON, remote config, A/B tests or other platforms.
- The class is `CustomScalingStrategy` (not `ScalingStrategy`, which is the built-in enum). A string strategy is an id first, then a formula: `cdp(16, 'brnd')` (typo) throws `No scaling strategy 'brnd'`.

## Verify

- `brand.explain()` (or `useCustomStrategy().explain()`) prints the axis, curve, factor, applied rules and formula.
- JSON files: `npx appdimens-skills kit custom check <file>` and `kit custom explain --formula "<text>" --devices medium-phone,medium-tablet`.
- Errors carry the JSON path or the formula position (`TypeError` / `RangeError` / `SyntaxError`); see [docs/custom/troubleshooting.md](../docs/custom/troubleshooting.md).
- Tests: `npm test` (the custom suites include the 540-case cross-platform fixture).
