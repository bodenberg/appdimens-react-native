# Custom strategies: documentation

**Entry:** `appdimens-react-native/custom` · Number extensions `appdimens-react-native/custom/number` · class `CustomScalingStrategy` · React `CustomStrategyProvider` / `useCustomStrategy`

> The class is called `CustomScalingStrategy` (and the helpers `defineCustomStrategy`, `useCustomStrategy`, …) because `ScalingStrategy` is already this package's built-in strategy enum.

The built-in strategies (`sdp`, `pwsdp`, `asdp`…) cover most apps. When yours needs its **own** growth law, this module lets you write it, in one line of TypeScript or as a full configuration that is shared through JSON with every AppDimens platform (Android, KMP, iOS, Flutter, React Native, Web, Games, .NET).

## Pick a form

| You want to… | Use | Read |
|---|---|---|
| Write the math yourself, in TypeScript, with autocomplete | `customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8))` (factor) · `scalingFormula(({base, sw, pow}) => base * pow(sw / 360, 0.8))` (value) | [Quick start](quick-start.md) · [Code formulas](code-formulas.md) |
| Keep the formula in JSON or remote config | `scalingFormula('base * pow(sw / 360, 0.8)')` · `cdp(16, '…')` | [Text formulas](text-formulas.md) |
| Different behavior per device, screen range or orientation, bounds, font-scale policy | `defineCustomStrategy({id: 'brand', …})` | [Configuration](configuration.md) |
| Share one definition across apps and platforms | a strategies JSON file | [JSON format](json.md) |

## Guides

1. [Quick start](quick-start.md): install, the four forms and your first strategy in five minutes.
2. [Code formulas](code-formulas.md): `customScaleStrategy(…)` and `scalingFormula(…)`, with every name available in the scope.
3. [Text formulas](text-formulas.md): the formula language (operators, functions, variables, errors, fast path).
4. [Configuration](configuration.md): reference frame, axes, curves, bounds, aspect ratio, font scale, multi-window, rules, device class, `extend`, built-ins and presets.
5. [JSON format](json.md): the cross-platform document, loading, exporting and validation errors.
6. [API reference](api-reference.md): every function, the React provider and hook, Number extensions, the registry and the debug helpers.
7. [Performance](performance.md): what each form costs and how memoization works.
8. [Cookbook](cookbook.md): ready-to-use recipes (tablets, TV, watch, game HUD, readable text, A/B tests).
9. [Troubleshooting](troubleshooting.md): error messages, `explain()`, and frequent questions.

## How it works, in one picture

```
ratio  = axis(window) / axis(reference)                  // e.g. sw / 300
factor = clamp( curve(ratio) × multiplier × AR , min, max )   // once per window snapshot
value  = formula( valueClamp( base × factor ) )           // per value, only if needed
```

`customScaleStrategy(…)` replaces the whole `factor` line. `scalingFormula(…)` replaces the whole `value` line. The full configuration lets you set each piece and change it per device with rules. Values are dp, which you use directly in React Native styles. The numbers are the same on every AppDimens platform: a shared 540-case fixture checks it (`__tests__/fixtures/custom-strategy-fixture.json`).

[Back to the guides index](../README.md) · [Overview page](../custom.md)
