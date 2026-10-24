import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {__setWindow} from '../__mocks__/react-native';
import {AppDimensProvider, DimenCache} from '../src';
import {
  cdp,
  csp,
  customScaleStrategy,
  defineCustomStrategy,
  getCustomStrategy,
  getFormulaCustomStrategy,
  loadCustomStrategies,
  pickCustomStrategy,
  resetCustomStrategiesForTest,
  ScalingExpression,
  scalingFormula,
  screenSnapshot,
  setDefaultCustomStrategy,
  useCustomStrategy,
} from '../src/custom';
import '../src/custom/number';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const phone = screenSnapshot({widthDp: 411, heightDp: 891, smallestWidthDp: 411, density: 2.625});
const tablet = screenSnapshot({
  widthDp: 1280,
  heightDp: 800,
  smallestWidthDp: 800,
  density: 2,
  device: 'tablet',
});

beforeEach(() => {
  DimenCache.reset();
  resetCustomStrategiesForTest();
  act(() => __setWindow({width: 411, height: 891, scale: 3, fontScale: 1}));
});

describe('scalingFormula — the formula is the value', () => {
  test('text formula is the final value', () => {
    expect(scalingFormula('base * pow(sw / 360, 0.8)').resolveScreen(phone).scale(16)).toBe(
      16 * Math.pow(411 / 360, 0.8),
    );
    expect(scalingFormula('base + 2').resolveScreen(phone).scale(16)).toBe(18);
    expect(scalingFormula('base * ratio').resolveScreen(phone).scale(16)).toBeCloseTo(
      (16 * 411) / 300,
      10,
    );
    expect(scalingFormula('base * (tablet ? 0.9 : 1)').resolveScreen(tablet).scale(16)).toBeCloseTo(
      16 * 0.9,
      12,
    );
  });

  test('proportional formulas take the fast path and match the slow path bit for bit', () => {
    for (const src of [
      'base',
      'base * pow(sw / 360, 0.8)',
      '(sw / 360) * base',
      'base * (tablet ? 0.9 : 1.1)',
      'base * sqrt(diagonal / 734.4)',
    ]) {
      const fast = scalingFormula(src);
      expect(fast.valueDependent).toBe(false);
      expect(ScalingExpression.parse(src).baseCoefficient).not.toBeNull();
      const slow = scalingFormula(`${src} + 0`); // forces the per-value path
      expect(slow.valueDependent).toBe(true);
      for (const screen of [phone, tablet]) {
        for (const base of [1, 16, 48, -8, 0.5, 13.37, 1e-7]) {
          expect(
            Object.is(
              fast.resolveScreen(screen).scale(base),
              slow.resolveScreen(screen).scale(base),
            ),
          ).toBe(true);
        }
      }
    }
    expect(scalingFormula('base * min(base, 20)').valueDependent).toBe(true);
    expect(scalingFormula('max(base * sw / 360, base)').valueDependent).toBe(true);
    // `(base * sw) / 360` is evaluated as written (per value), so it is not on the fast path.
    expect(scalingFormula('base * sw / 360').valueDependent).toBe(true);
  });

  test('a proportional formula inside a spec or JSON is screen-only too', () => {
    expect(
      defineCustomStrategy({id: 'p', formula: 'base * (sw / 360)'}, {register: false})
        .valueDependent,
    ).toBe(false);
    const json = loadCustomStrategies('{"strategies":[{"id":"j","formula":"base * 1.1"}]}').get(
      'j',
    )!;
    expect(json.valueDependent).toBe(false);
    expect(json.resolveScreen(phone).scale(16)).toBeCloseTo(16 * 1.1, 12);
    expect(
      defineCustomStrategy({id: 'v', formula: 'round(scaled)'}, {register: false}).valueDependent,
    ).toBe(true);
  });

  test('text formulas are shared per text unless an id is given', () => {
    expect(scalingFormula('base * 2')).toBe(scalingFormula('base * 2'));
    expect(getFormulaCustomStrategy('base * 2')).toBe(scalingFormula('base * 2'));
    expect(scalingFormula('base * 2').id).toBe('formula:base * 2');
    expect(getCustomStrategy('formula:base * 2')).toBeUndefined();
    const named = scalingFormula('base * 2', {id: 'double'});
    expect(named).not.toBe(scalingFormula('base * 2'));
    expect(getCustomStrategy('double')).toBe(named);
  });

  test('code formulas have no limits', () => {
    const s = scalingFormula(
      ({base, sw, pow, landscape}) => base * pow(sw / 360, 0.8) + (landscape ? 2 : 0),
    );
    expect(s.resolveScreen(tablet).scale(16)).toBeCloseTo(16 * Math.pow(800 / 360, 0.8) + 2, 12);
    expect(s.valueDependent).toBe(true);
    expect(s.id.startsWith('formula#')).toBe(true);
    expect(scalingFormula(({base}) => base).id).not.toBe(s.id);
    expect(() => s.toJSON()).toThrow('cannot be encoded');
    expect(getCustomStrategy('hud')).toBeUndefined();
    const named = scalingFormula(({base}) => base * 3, {id: 'hud'});
    expect(getCustomStrategy('hud')).toBe(named);
    expect(s.resolveScreen(phone).explain(s.id)).toContain(' then transform');
  });

  test('errors are reported right away; explain shows the formula; font scale is followed', () => {
    expect(() => scalingFormula('base * sww')).toThrow("unknown variable 'sww'");
    expect(() => cdp(16, 'base * sww')).toThrow("unknown variable 'sww'");
    expect(() => cdp(16, 'brnad')).toThrow("No scaling strategy 'brnad'");
    expect(scalingFormula('base * 2').resolveScreen(phone).explain('x')).toContain(
      ' then Formula(base * 2)',
    );
    const big = screenSnapshot({widthDp: 411, heightDp: 891, fontScale: 1.5});
    expect(scalingFormula('base * 2').resolveScreen(big).scaleSpDp(16)).toBe(48);
  });
});

describe('inline formulas on the React Native runtime', () => {
  test('cdp / csp / cdpWith / pickCustomStrategy / the hook accept a formula', () => {
    expect(cdp(16, 'base * pow(sw / 360, 0.8)')).toBe(16 * Math.pow(411 / 360, 0.8));
    expect(csp(14, 'base * (sw / 360)')).toBeCloseTo(14 * (411 / 360), 10);
    expect((16).cdpWith('base * 2')).toBe(32);
    expect(pickCustomStrategy('base * 2')).toBe(getFormulaCustomStrategy('base * 2'));
    defineCustomStrategy({id: 'base'}); // an id named like a variable takes precedence
    expect(pickCustomStrategy('base').id).toBe('base');
    setDefaultCustomStrategy('base * 3');
    expect(cdp(10)).toBe(30);
    const seen: number[] = [];
    function Probe() {
      seen.push(useCustomStrategy('base * (width / 360)').dp(36));
      return null;
    }
    act(() => {
      TestRenderer.create(
        <AppDimensProvider>
          <Probe />
        </AppDimensProvider>,
      );
    });
    expect(seen[seen.length - 1]).toBeCloseTo(41.1, 10);
    act(() => __setWindow({width: 720, height: 1280}));
    expect(seen[seen.length - 1]).toBeCloseTo(72, 10);
  });
});

describe('customScaleStrategy — programmable factor', () => {
  test('is screen-only and multiplies every value', () => {
    const product = customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8));
    expect(product.valueDependent).toBe(false);
    expect(product.resolveScreen(phone).factor).toBe(411 / 360);
    expect(product.resolveScreen(tablet).factor).toBe(1.8);
    expect(product.resolveScreen(phone).scale(16)).toBe(16 * (411 / 360));
    expect(product.id.startsWith('scale#')).toBe(true);
    expect(customScaleStrategy(() => 1).id).not.toBe(product.id);
    const named = customScaleStrategy(() => 1.25, {id: 'product'});
    expect(getCustomStrategy('product')).toBe(named);
    expect(cdp(16, 'product')).toBe(20);
    expect(() => customScaleStrategy(() => NaN).resolveScreen(phone)).toThrow('non-finite');
  });
});

describe('code scope matches the text language', () => {
  test('same names, same numbers', () => {
    const pairs: [Parameters<typeof scalingFormula>[0], string][] = [
      [({base, sw, pow}) => base * pow(sw / 360, 0.8), 'base * pow(sw / 360, 0.8)'],
      [({base, ratio}) => base * ratio, 'base * ratio'],
      [
        ({base, tablet, clamp, width}) => base * (tablet ? 0.9 : 1) * clamp(width / 360, 0.85, 1.6),
        'base * (tablet ? 0.9 : 1) * clamp(width / 360, 0.85, 1.6)',
      ],
      [
        ({base, round, lerp, aspectRatio}) => round(base * lerp(1, aspectRatio, 0.1)),
        'round(base * lerp(1, aspectRatio, 0.1))',
      ],
      [
        s =>
          s.base * s.smoothstep(300, 900, s.diagonal) +
          s.ln(s.perimeter) -
          s.sqrt(s.shortSide) +
          s.max(s.longSide, s.height) * s.min(1, s.fontScale, s.density),
        'base * smoothstep(300, 900, diagonal) + ln(perimeter) - sqrt(shortSide) + max(longSide, height) * min(1, fontScale, density)',
      ],
    ];
    for (const [code, text] of pairs) {
      for (const screen of [phone, tablet]) {
        for (const base of [1, 16, 48]) {
          expect(scalingFormula(code).resolveScreen(screen).scale(base)).toBeCloseTo(
            scalingFormula(text).resolveScreen(screen).scale(base),
            4,
          );
        }
      }
    }
    const tv = screenSnapshot({widthDp: 960, heightDp: 540, device: 'tv'});
    const factor = customScaleStrategy(({tv: isTv, height, ratio}) =>
      isTv ? height / 540 : ratio,
    );
    expect(factor.resolveScreen(tv).factor).toBe(1);
    expect(factor.resolveScreen(phone).factor).toBeCloseTo(411 / 300, 12);
  });
});
