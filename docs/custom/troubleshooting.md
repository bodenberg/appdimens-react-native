# Troubleshooting

## See what a strategy does

```ts
console.log(brand.explain());                               // current window
const s = useCustomStrategy(brand); console.log(s.explain());   // inside a component (AppDimensProvider snapshot)
console.log(brand.resolveScreen(screenSnapshot({widthDp: 1280, heightDp: 800, device: 'tablet'})).explain('brand'));
```

```
[brand] tablet smallestWidth=800dp / ref 360 = 2.2222 -> logarithmic(0.4) = 1.3194 x 0.9 clamp[0.85, 1.6] => factor 1.1875 rules=[large, #1]
[hud] phone smallestWidth=411dp / ref 300 = 1.37 -> linear = 1.37 => factor 1.37 then Formula(base * pow(sw / 360, 0.8))
```

The line reads left to right: device class, axis value and reference, the curve and its result, multiplier, aspect ratio, bounds, the final factor, the applied rules and, when there is one, the per-value formula or transform. `factor()` returns only the number.

## Common errors

| Message | Cause | Fix |
|---|---|---|
| `SyntaxError: Invalid expression at 7: unknown variable 'sww' …` | typo in a text formula | use a name from the list in the message, or switch to a [code formula](code-formulas.md), which the type checker checks |
| `'clamp' takes 3 argument(s), got 2` | wrong number of arguments | see the [function table](text-formulas.md#functions) |
| `RangeError: custom strategy produced a non-finite factor (NaN)` | division by zero, `ln` of 0, NaN from a function | guard the formula (`max(x, 1)`) or clamp the factor |
| `<path> must be an object` / `must be a boolean` / `must be a finite number` | wrong JSON type | see the [field tables](json.md#strategy-fields) |
| `strategy: maxValue must be >= 0` | negative value bound | value bounds limit the magnitude; use a positive number |
| `strategy: minFactor must be <= maxFactor` | crossed bounds in the declaration | swap them (crossed bounds produced by rules at runtime let the max win) |
| `No scaling strategy 'x'. Registered: …` | id not registered, or a typo in `cdp(16, 'x')` | register it, load the JSON first, or check the id |
| `Custom curve functions cannot be encoded to JSON` · `transform functions cannot be encoded to JSON` | `toJSON()` on code | use the text form for strategies you export |
| `strategy id must not be blank` | empty `id` | give the strategy an id |

## Frequent questions

**My function result never changes.** The factor is memoized per window snapshot. A function that reads mutable state (a setting, the time, a store) is not re-run until the snapshot changes. Use separate strategies and pick one, or express the setting as a rule.

**The value does not update on rotation.** `cdp()` / `csp()` read the window when they are called; a component re-renders only if it subscribes. Use `useCustomStrategy()` (or `useDimenMetrics()`, `createDimenStyles`) in that component.

**`cdp(16, product)` and `sdp(16)` differ.** Expected: the default reference is 300 dp of smallest width; `ratio` is `sw / 300`. `base * ratio` (or `BuiltInStrategies.SCALED`) gives exactly `sdp`.

**Text is too big / scaled twice.** `csp` / `s.sp` already account for React Native's own font scaling. Never pass `cspPx` / `s.spPx` to `fontSize`; use `s.spDp` only with `allowFontScaling={false}`.

**Fonts ignore my strategy.** `csp` follows the user font scale by default. Use `fontScale: 'ignore'` for fixed text, or `fontScale: {max}` to cap it.

**My text formula is slow / misses the fast path.** Only `base * E` qualifies. `base * sw / 360` reads as `(base * sw) / 360`; write `base * (sw / 360)`.

**A strategy created in a component leaks.** `customScaleStrategy(…)` and `scalingFormula(s => …)` build a new strategy on each call. Declare them at module level or wrap them in `useMemo`. Inline text formulas (`cdp(16, '…')`) are shared per text and are fine.

**My tablet is a `phone`.** Device classes come from the UI mode, `Platform.isTV`, desktop platforms, then `sw >= 600`. A small tablet under 600 dp is a phone; use range rules or `setDeviceClassResolver`.

**`(16).cdp` is undefined.** Import the extensions once: `import 'appdimens-react-native/custom/number'`.

**Are the numbers the same on Android / iOS / Web?** Yes for everything that can be written as JSON (curves, rules, text formulas): a shared 540-case fixture checks every platform (`__tests__/fixtures/custom-strategy-fixture.json`). Code functions run your own code, so they match as long as the code does.

[Back to the custom docs](README.md)
