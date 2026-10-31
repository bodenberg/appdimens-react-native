# Custom strategies (`appdimens-react-native/custom`)

**Entry:** `appdimens-react-native/custom` · Number extensions `appdimens-react-native/custom/number` · See [API conventions](API-CONVENTIONS.md) · **[Full custom-strategy documentation](custom/README.md)**

The built-in strategies cover most apps. When an app (or a design system shared by several apps) needs its **own** growth law, this module lets you write it. It is the React Native port of the Android module `appdimens-dynamic-custom`. The simplest form is one line of typed TypeScript; the full form is a configuration that loads from JSON on every AppDimens platform (Android, KMP, iOS, Flutter, React Native, Web, Games, .NET) with the same numbers.

> The class is called `CustomScalingStrategy` (and the helpers `defineCustomStrategy`, `useCustomStrategy`, …) because `ScalingStrategy` is already this package's built-in strategy enum.

```tsx
import {cdp, csp, customScaleStrategy, scalingFormula, defineCustomStrategy, useCustomStrategy} from 'appdimens-react-native/custom';

// Factor: the number that multiplies every value
export const product = customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8));
// Formula: the final value (base = the 16 in cdp(16, hud))
export const hud = scalingFormula(({base, sw, pow}) => base * pow(sw / 360, 0.8));
// Text, for JSON and remote config
export const remote = scalingFormula('base * pow(sw / 360, 0.8)');
// Full configuration with rules
export const brand = defineCustomStrategy({
  id: 'brand',
  reference: {width: 360, height: 640},
  curve: {type: 'power', exponent: 0.8},
  clamp: {min: 0.85, max: 1.6},
  rules: [{when: {device: ['tablet', 'desktop']}, set: {curve: {type: 'logarithmic', k: 0.4}}}],
});

<View style={{padding: cdp(16, product)}} />;              // dp
<Text style={{fontSize: csp(18, hud)}}>Score</Text>;       // fontSize, follows the user font scale
const s = useCustomStrategy(brand);                        // re-renders on rotation / resize / font scale
(16).cdpWith(brand);                                       // after import 'appdimens-react-native/custom/number'
```

## Documentation

| Guide | What it covers |
|---|---|
| [Overview](custom/README.md) | which form to pick, how the pieces fit |
| [Quick start](custom/quick-start.md) | install and first strategy in five minutes |
| [Code formulas](custom/code-formulas.md) | `customScaleStrategy(…)`, `scalingFormula(…)` and every name in the scope |
| [Text formulas](custom/text-formulas.md) | the formula language: operators, functions, variables, errors, fast path |
| [Configuration](custom/configuration.md) | reference, axes, curves, bounds, aspect ratio, font scale, multi-window, rules, device class, `extend`, built-ins, presets |
| [JSON format](custom/json.md) | the cross-platform document, loading, exporting, validation |
| [API reference](custom/api-reference.md) | functions, registry, `CustomStrategyProvider` / `useCustomStrategy`, Number extensions, engine |
| [Performance](custom/performance.md) | what each form costs, memoization |
| [Cookbook](custom/cookbook.md) | recipes: tablets, TV, watch, game HUD, readable text, A/B tests |
| [Troubleshooting](custom/troubleshooting.md) | error messages, `explain()`, FAQ |

## When to use it

- A design system shared by several apps that needs one growth law everywhere.
- A product whose UI must behave differently per device class: TV, watch, car, tablet, desktop.
- Remote-config or A/B experiments on scaling, by shipping a new JSON.
- Built-ins that are close but need a different reference frame, exponent or bounds.

## Trade-offs

- Strategies are defined at runtime; keep them in one place (a `strategies.ts` module or the JSON document).
- Code functions cannot be exported to JSON; their text equivalents can.
- The aspect-ratio correction always uses the satellite law (`× (1 + k·ln(AR/1.78))`).

Parity: the cross-platform fixture `__tests__/fixtures/custom-strategy-fixture.json` (Kotlin reference engine) is checked in CI with a relative tolerance of 1e-4.

[Back to the guides index](README.md)
