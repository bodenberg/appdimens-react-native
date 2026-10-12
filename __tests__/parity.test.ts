/**
 * Parity tests: every generated kernel of every strategy is compared against an independent
 * re-implementation of the Kotlin formulas (`calculate<Strategy>Dp`, `DimenMetrics`,
 * `DimenCalculationPlumbing.effectiveQualifier`) on several window configurations.
 */
import {DimenCache} from '../src/core/DimenCache';
import * as scaled from '../src/strategies/scaled';
import * as percent from '../src/strategies/percent';
import * as power from '../src/strategies/power';
import * as fluid from '../src/strategies/fluid';
import * as auto from '../src/strategies/auto';
import * as diagonal from '../src/strategies/diagonal';
import * as fill from '../src/strategies/fill';
import * as fit from '../src/strategies/fit';
import * as interpolated from '../src/strategies/interpolated';
import * as logarithmic from '../src/strategies/logarithmic';
import * as perimeter from '../src/strategies/perimeter';
import * as density from '../src/strategies/density';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const naming = require('../scripts/naming');

const MODULES: Record<string, any> = {
  scaled,
  percent,
  power,
  fluid,
  auto,
  diagonal,
  fill,
  fit,
  interpolated,
  logarithmic,
  perimeter,
  density,
};

interface Win {
  w: number;
  h: number;
  density: number;
  fontScale: number;
  mw?: boolean;
}

// ── Independent reference (straight from the Kotlin sources) ──────────────────
const INV = 1 / 300; // Kotlin: 0.0033333334f (Float32 rounding of 1/300)
const ADJ = 0.1 / 30;
const SENS = 0.08 / 30;

function ref(
  strategy: string,
  base: number,
  q: string,
  inverter: string,
  ar: boolean,
  imw: boolean,
  win: Win,
): number {
  const isLandscape = win.w > win.h;
  const isPortrait = !isLandscape;
  if (imw && win.mw) return base;
  let actual = q;
  switch (inverter) {
    case 'PH_TO_LW':
      if (isLandscape && q === 'HEIGHT') actual = 'WIDTH';
      break;
    case 'PW_TO_LH':
      if (isLandscape && q === 'WIDTH') actual = 'HEIGHT';
      break;
    case 'LH_TO_PW':
      if (isPortrait && q === 'HEIGHT') actual = 'WIDTH';
      break;
    case 'LW_TO_PH':
      if (isPortrait && q === 'WIDTH') actual = 'HEIGHT';
      break;
    case 'SW_TO_LH':
      if (isLandscape && q === 'SMALL_WIDTH') actual = 'HEIGHT';
      break;
    case 'SW_TO_LW':
      if (isLandscape && q === 'SMALL_WIDTH') actual = 'WIDTH';
      break;
    case 'SW_TO_PH':
      if (isPortrait && q === 'SMALL_WIDTH') actual = 'HEIGHT';
      break;
    case 'SW_TO_PW':
      if (isPortrait && q === 'SMALL_WIDTH') actual = 'WIDTH';
      break;
  }
  const sm = Math.min(win.w, win.h);
  const lg = Math.max(win.w, win.h);
  const sw = sm;
  const dim = actual === 'HEIGHT' ? win.h : actual === 'WIDTH' ? win.w : sw;
  const logAr = Math.log(lg / sm / 1.78);
  const arMul = 1 + SENS * logAr;
  const isDefaultSw = q === 'SMALL_WIDTH' && inverter === 'DEFAULT';
  const withAr = (v: number) => (ar ? v * arMul : v);
  switch (strategy) {
    case 'scaled':
    case 'percent':
      if (strategy === 'scaled' && isDefaultSw) {
        return ar ? base * (1 + (sw - 300) * (ADJ + SENS * logAr)) : base * sw * INV;
      }
      return ar ? base * (1 + (dim - 300) * (ADJ + SENS * logAr)) : base * dim * INV;
    case 'power':
      return withAr(base * Math.pow(dim / 300, 0.75));
    case 'fluid': {
      const minV = base * 0.8;
      const maxV = base * 1.2;
      const out =
        dim <= 320 ? minV : dim >= 768 ? maxV : minV + ((maxV - minV) * (dim - 320)) / (768 - 320);
      return withAr(out);
    }
    case 'auto': {
      const scale = dim <= 480 ? dim * INV : 480 * INV + 0.4 * Math.log(1 + (dim - 480) * INV);
      return withAr(base * scale);
    }
    case 'diagonal':
      return withAr(base * (Math.sqrt(sm * sm + lg * lg) / 611.6305));
    case 'fill':
      return withAr(base * Math.max(sm / 300, lg / 533));
    case 'fit':
      return withAr(base * Math.min(sm / 300, lg / 533));
    case 'interpolated': {
      const linear = base * dim * INV;
      return withAr(base + (linear - base) * 0.5);
    }
    case 'logarithmic': {
      const scale =
        dim > 300 ? 1 + 0.4 * Math.log(dim * INV) : dim > 0 ? 1 - 0.4 * Math.log(300 / dim) : 1;
      return withAr(base * scale);
    }
    case 'perimeter':
      return withAr(base * ((sm + lg) / 833));
    case 'density':
      return withAr(base * win.density);
  }
  throw new Error(strategy);
}

function applyUnit(v: number, unit: string, px: boolean, win: Win): number {
  if (unit === 'dp') return px ? v * win.density : v;
  if (unit === 'sp') return px ? v * win.density * win.fontScale : v;
  return px ? v * win.density : v / win.fontScale; // em
}

const WINDOWS: Array<[string, Win]> = [
  ['phone portrait', {w: 360, h: 800, density: 3, fontScale: 1}],
  ['phone landscape', {w: 800, h: 360, density: 3, fontScale: 1.3}],
  ['small phone', {w: 320, h: 480, density: 2, fontScale: 0.85}],
  ['tablet portrait', {w: 800, h: 1280, density: 2, fontScale: 1}],
  ['foldable open', {w: 673, h: 841, density: 2.625, fontScale: 1.15}],
  ['tv landscape', {w: 960, h: 540, density: 2, fontScale: 1}],
  ['split-screen', {w: 360, h: 380, density: 3, fontScale: 1, mw: true}],
];

afterAll(() => {
  DimenCache.reset();
});

describe.each(WINDOWS)('kernel parity on %s', (_label, win) => {
  beforeAll(() => {
    DimenCache.setMetricsOverride({
      width: win.w,
      height: win.h,
      density: win.density,
      fontScale: win.fontScale,
      isInMultiWindowMode: win.mw ?? false,
    });
  });

  for (const strategy of naming.STRATEGIES) {
    const mod = MODULES[strategy.dir];
    const specs = naming.kernelSpecs(strategy);
    test(`${strategy.dir}: ${specs.length} kernels match the Kotlin formulas`, () => {
      for (const base of [1, 16, 48.5, -8]) {
        for (const spec of specs) {
          const fn = mod[spec.name];
          expect(typeof fn).toBe('function');
          const expected = applyUnit(
            ref(
              strategy.dir,
              base,
              spec.axis.qualifier,
              spec.inv[1],
              (spec.flag[1] & 1) !== 0,
              (spec.flag[1] & 2) !== 0,
              win,
            ),
            spec.family.unit,
            spec.px,
            win,
          );
          const actual = fn(base);
          if (Math.abs(actual - expected) > 1e-4 * Math.max(1, Math.abs(expected))) {
            throw new Error(`${spec.name}(${base}) = ${actual}, expected ${expected}`);
          }
        }
      }
    });
  }
});

describe('known Android values', () => {
  beforeAll(() => {
    DimenCache.setMetricsOverride({
      width: 360,
      height: 800,
      density: 3,
      fontScale: 1,
      isInMultiWindowMode: false,
    });
  });

  test('scaled', () => {
    expect(scaled.sdp(16)).toBeCloseTo(19.2, 4); // 16 × 360/300
    expect(scaled.sdpPx(16)).toBeCloseTo(57.6, 4);
    expect(scaled.hdp(10)).toBeCloseTo(26.6667, 3);
    expect(scaled.wdp(10)).toBeCloseTo(12, 4);
    expect(scaled.ssp(14)).toBeCloseTo(16.8, 4);
  });

  test('default 300×533 reference is identity for scaled', () => {
    DimenCache.setMetricsOverride({
      width: 300,
      height: 533,
      density: 1,
      fontScale: 1,
      isInMultiWindowMode: false,
    });
    expect(scaled.sdp(16)).toBeCloseTo(16, 6);
    expect(fill.flsdp(16)).toBeCloseTo(16, 6);
    expect(fit.ftsdp(16)).toBeCloseTo(16, 6);
    expect(perimeter.prsdp(16)).toBeCloseTo(16, 6);
    expect(diagonal.dgsdp(16)).toBeCloseTo(16, 3);
    expect(power.pwsdp(16)).toBeCloseTo(16, 6);
    expect(logarithmic.logsdp(16)).toBeCloseTo(16, 6);
    expect(interpolated.isdp(16)).toBeCloseTo(16, 6);
  });
});

describe('custom sensitivity (toDynamic*)', () => {
  const win: Win = {w: 400, h: 900, density: 2, fontScale: 1.2};
  beforeAll(() => {
    DimenCache.setMetricsOverride({
      width: win.w,
      height: win.h,
      density: win.density,
      fontScale: win.fontScale,
      isInMultiWindowMode: false,
    });
  });

  test.each([
    ['scaled', scaled.toDynamicScaledDp],
    ['power', power.toDynamicPowerDp],
    ['auto', auto.toDynamicAutoDp],
    ['fluid', fluid.toDynamicFluidDp],
    ['percent', percent.toDynamicPercentDp],
    ['density', density.toDynamicDensityDp],
  ])('%s honours k like Kotlin', (strategy, fn) => {
    const logAr = Math.log(900 / 400 / 1.78);
    const k = 0.01;
    const got = (fn as any)(20, 'SMALL_WIDTH', {applyAspectRatio: true, customSensitivityK: k});
    let expected: number;
    if (strategy === 'scaled' || strategy === 'percent') {
      expected = 20 * (1 + (400 - 300) * (ADJ + k * logAr));
    } else {
      expected =
        ref(strategy as string, 20, 'SMALL_WIDTH', 'DEFAULT', false, false, win) * (1 + k * logAr);
    }
    expect(got).toBeCloseTo(expected, 6);
    // k is ignored without aspect ratio
    expect((fn as any)(20, 'SMALL_WIDTH', {customSensitivityK: k})).toBeCloseTo(
      ref(strategy as string, 20, 'SMALL_WIDTH', 'DEFAULT', false, false, win),
      6,
    );
  });

  test('positional Android signature', () => {
    expect(scaled.toDynamicScaledDp(10, 'HEIGHT', 'PH_TO_LW', false, true, null)).toBeCloseTo(
      ref('scaled', 10, 'HEIGHT', 'PH_TO_LW', true, false, win),
      6,
    );
    expect(scaled.toDynamicScaledPx(10, 'WIDTH')).toBeCloseTo(10 * 400 * INV * 2, 4);
    expect(scaled.toDynamicScaledSp(10, 'SMALL_WIDTH', false)).toBeCloseTo(
      (10 * 400 * INV) / 1.2,
      4,
    );
    expect(scaled.toDynamicScaledSp(10, 'SMALL_WIDTH', {fontScale: true})).toBeCloseTo(
      10 * 400 * INV,
      4,
    );
    expect(scaled.toDynamicScaledSpPx(10, 'SMALL_WIDTH')).toBeCloseTo(10 * 400 * INV * 2 * 1.2, 4);
    expect(scaled.toDynamicScaledSpPx(10, 'SMALL_WIDTH', {fontScale: false})).toBeCloseTo(
      10 * 400 * INV * 2,
      4,
    );
  });

  test('non-finite k throws', () => {
    expect(() =>
      scaled.toDynamicScaledDp(10, 'SMALL_WIDTH', {
        applyAspectRatio: true,
        customSensitivityK: Infinity,
      }),
    ).toThrow(RangeError);
    expect(() =>
      power.toDynamicPowerDp(10, 'SMALL_WIDTH', {applyAspectRatio: true, customSensitivityK: NaN}),
    ).toThrow(RangeError);
  });

  test('unknown enums throw', () => {
    expect(() => scaled.toDynamicScaledDp(10, 'NOPE' as any)).toThrow(TypeError);
    expect(() => scaled.toDynamicScaledDp(10, 'WIDTH', 'NOPE' as any)).toThrow(TypeError);
  });
});

describe('builders and facilitators of every strategy agree with the kernels', () => {
  beforeAll(() => {
    DimenCache.setMetricsOverride({
      width: 412,
      height: 915,
      density: 2.625,
      fontScale: 1.3,
      isInMultiWindowMode: false,
    });
  });

  for (const s of naming.STRATEGIES) {
    test(s.dir, () => {
      const mod = MODULES[s.dir];
      const p = s.prefix;
      const dpB = mod[`${s.lower}Dp`](16);
      const spB = mod[`${s.lower}Sp`](16);
      expect(dpB).toBeInstanceOf(mod[s.dpBuilder]);
      expect(spB).toBeInstanceOf(mod[s.spBuilder]);
      for (const a of ['s', 'h', 'w']) {
        expect(dpB[`${p}${a}dp`]).toBeCloseTo(mod[`${p}${a}dp`](16), 8);
        expect(dpB[`${p}${a}dpPx`]).toBeCloseTo(mod[`${p}${a}dpPx`](16), 8);
        expect(spB[`${p}${a}sp`]).toBeCloseTo(mod[`${p}${a}sp`](16), 8);
        expect(spB[`${p}${a}em`]).toBeCloseTo(mod[`${p}${a}em`](16), 8);
        expect(spB[`${p}${a}spPx`]).toBeCloseTo(mod[`${p}${a}spPx`](16), 8);
        expect(spB[`${p}${a}emPx`]).toBeCloseTo(mod[`${p}${a}emPx`](16), 8);
        expect(dpB.applyAspectRatio()[`${p}${a}dp`]).toBeCloseTo(mod[`${p}${a}dpa`](16), 8);

        for (const unit of ['dp', 'sp']) {
          const stem = `${p}${a}${unit}`;
          const k = (v: number) => mod[stem](v);
          const kPx = (v: number) => mod[unit === 'dp' ? `${stem}Px` : `${stem}Px`](v);
          // Portrait window: PORTRAIT branch active, LANDSCAPE inactive.
          expect(mod[`${stem}Rotate`](10, 20, 'PORTRAIT')).toBeCloseTo(k(20), 8);
          expect(mod[`${stem}Rotate`](10, 20, 'LANDSCAPE')).toBeCloseTo(k(10), 8);
          expect(mod[`${stem}RotatePx`](10, 20, 'PORTRAIT')).toBeCloseTo(kPx(20), 8);
          expect(mod[`${stem}RotatePlain`](7, 20, 'LANDSCAPE')).toBe(7);
          expect(mod[`${stem}RotatePlainPx`](7, 20, 'PORTRAIT')).toBeCloseTo(kPx(20), 8);
          expect(mod[`${stem}Mode`](10, 20, 'NORMAL')).toBeCloseTo(k(20), 8);
          expect(mod[`${stem}ModePx`](10, 20, 'CAR')).toBeCloseTo(kPx(10), 8);
          expect(mod[`${stem}ModePlain`](7, 20, 'CAR')).toBe(7);
          expect(mod[`${stem}ModePlainPx`](7, 20, 'NORMAL')).toBeCloseTo(kPx(20), 8);
          expect(mod[`${stem}Qualifier`](10, 20, 'WIDTH', 400)).toBeCloseTo(k(20), 8);
          expect(mod[`${stem}QualifierPx`](10, 20, 'WIDTH', 500)).toBeCloseTo(kPx(10), 8);
          expect(mod[`${stem}QualifierPlain`](7, 20, 'WIDTH', 500)).toBe(7);
          expect(mod[`${stem}QualifierPlainPx`](7, 20, 'HEIGHT', 900)).toBeCloseTo(kPx(20), 8);
          expect(mod[`${stem}Screen`](10, 20, 'NORMAL', 'WIDTH', 400)).toBeCloseTo(k(20), 8);
          expect(mod[`${stem}ScreenPx`](10, 20, 'TELEVISION', 'WIDTH', 400)).toBeCloseTo(
            kPx(10),
            8,
          );
          expect(mod[`${stem}ScreenPlain`](7, 20, 'NORMAL', 'WIDTH', 500)).toBe(7);
          expect(mod[`${stem}ScreenPlainPx`](7, 20, 'NORMAL', 'SMALL_WIDTH', 400)).toBeCloseTo(
            kPx(20),
            8,
          );
        }
      }
      expect(mod[`toDynamic${s.name}Dp`](16, 'HEIGHT')).toBeCloseTo(mod[`${p}hdp`](16), 8);
      expect(mod[`toDynamic${s.name}Px`](16, 'WIDTH', {applyAspectRatio: true})).toBeCloseTo(
        mod[`${p}wdpaPx`](16),
        8,
      );
      expect(mod[`toDynamic${s.name}Sp`](16, 'SMALL_WIDTH', false)).toBeCloseTo(
        mod[`${p}sem`](16),
        8,
      );
      expect(mod[`toDynamic${s.name}SpPx`](16, 'SMALL_WIDTH')).toBeCloseTo(mod[`${p}sspPx`](16), 8);
      expect(Object.keys(mod[`${s.lower}Kernels`])).toHaveLength(naming.kernelSpecs(s).length);
    });
  }
});
