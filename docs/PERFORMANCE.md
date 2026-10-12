# Performance

## Architecture

1. **Snapshot.** `DimenCache` keeps one immutable `DimenMetrics` per window (size, display size, density, font scale, orientation, UI mode, multi-window). It is rebuilt only when `Dimensions` emits a change (or `AppState` becomes active and the font scale changed) **and** an input really differs — identical events keep the same snapshot, so subscribers are not notified.
2. **Factor table.** Every strategy curve is linear in the design value: `out = value × factor(strategy, axis, inverter, flags)`. Each snapshot owns a `Float64Array` with one slot per combination (12 × 3 × 9 × 4 = 1,296 slots, ~10 KB), filled lazily on first use.
3. **Specialized kernels.** Each exported name (`sdp`, `pwhdpLw`, …) is created once with its slot index baked in. The hot path: load the snapshot, read the slot, check NaN, multiply (plus `× density` / `× fontScale` for `Px`/fixed variants). No allocation, no `Map`, no string handling.
4. **Shared styles.** `createDimenStyles` / `DimenStyleSheet.create` compute styles once per snapshot and share them across components.
5. **Tree-shaking by module.** Strategies are separate entry points; what you don't import is not bundled.

## Benchmark

`npm run build && npm run bench` (Node 22, compiled output, monomorphic call sites):

| Call | ns/op |
|---|---|
| `v * constant` (baseline) | ~1 |
| `sdp(v)` | ~5 |
| `sdpa(v)`, `hdpLw(v)`, `ssp(v)`, `sdpPx(v)`, `pwsdp(v)` | ~9–14 |
| `toDynamicScaledDp(v, 'HEIGHT', opts)` | ~18 |
| `sdpRotate(v, 20)`, builder with two `screen` entries | ~40–50 |

Hermes is slower than V8 in absolute terms but the shape is the same: resolving a dimension is a few multiplies, far below the cost of rendering the view that uses it.

## Tips

- Prefer the styles hooks over computing inline styles in every render.
- Declare builders at module scope; they are immutable.
- Use a custom `measure` in resize only when needed: the built-in estimator is O(text length) per candidate and the search is O(log steps).
