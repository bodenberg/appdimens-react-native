# Contributing

## Setup

```bash
npm ci
npm run validate   # generated check, typecheck, lint, format, tests, build, smoke
```

Node 18+ (the compiled-package smoke test needs Node 20.6+).

## Rules

- **Generated code.** `src/strategies/**` and the root proxy folders (`power/`, `number/`, `resize/`, `units/`, …) are produced by `scripts/generate.js` from `scripts/naming.js`. Change the generator, run `npm run generate`, and commit the output. CI fails on stale files (`npm run generate:check`).
- **Formulas.** `computeFactor` in `src/core/DimenMetrics.ts` is the single source of truth and must stay identical to the Android `calculate<Strategy>Dp` functions. `__tests__/parity.test.ts` re-implements the Kotlin formulas independently; update both only together with the Android library.
- **Hot path.** Kernels must stay allocation-free (snapshot load → table read → multiply). Run `npm run bench` before and after touching `src/core/kernels.ts` or `DimenMetrics.ts`.
- **Docs.** Keep `README.md`, `docs/`, `skills/` and `LLMS.txt` in sync with API changes; every identifier mentioned must exist in the source.
- **Versioning.** Versions follow the Android library. Update `package.json`, `VERSION` in `src/index.ts` and `CHANGELOG.md` together.

## Releasing

Push a `vX.Y.Z` tag matching `package.json`; `.github/workflows/release.yml` validates, publishes to npm (needs the `NPM_TOKEN` secret) and creates the GitHub release.
