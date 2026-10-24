import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {__setWindow} from '../__mocks__/react-native';
import {AppDimensProvider, DimenCache, DimenMetrics, UiModeType, sdp} from '../src';
import {
  BuiltInStrategies,
  CustomPresets,
  CustomScalingStrategy,
  CustomStrategyProvider,
  cdp,
  csp,
  defineCustomStrategy,
  exportCustomStrategies,
  getCustomStrategy,
  getDefaultCustomStrategy,
  loadCustomStrategies,
  parseStrategiesDocument,
  requireCustomStrategy,
  resetCustomStrategiesForTest,
  screenSnapshot,
  setDefaultCustomStrategy,
  setDeviceClassResolver,
  toScreenSnapshot,
  useCustomStrategy,
} from '../src/custom';
import type {DeviceClass, ScreenSnapshot} from '../src/custom';
import '../src/custom/number';

declare const require: (id: string) => any;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const phone = screenSnapshot({widthDp: 411, heightDp: 891, smallestWidthDp: 411, density: 2.625});
const tablet = screenSnapshot({widthDp: 1280, heightDp: 800, smallestWidthDp: 800, density: 2});

beforeEach(() => {
  DimenCache.reset();
  resetCustomStrategiesForTest();
  act(() => __setWindow({width: 411, height: 891, scale: 3, fontScale: 1}));
});

describe('engine', () => {
  test('built-ins match the built-in formulas', () => {
    expect(BuiltInStrategies.POWER.resolveScreen(phone).factor).toBeCloseTo(
      Math.pow(411 / 300, 0.75),
      10,
    );
    expect(BuiltInStrategies.LOGARITHMIC.resolveScreen(tablet).factor).toBeCloseTo(
      1 + 0.4 * Math.log(800 / 300),
      10,
    );
    expect(BuiltInStrategies.INTERPOLATED.resolveScreen(phone).factor).toBeCloseTo(
      1 + (411 / 300 - 1) * 0.5,
      10,
    );
    expect(BuiltInStrategies.PERIMETER.resolveScreen(tablet).factor).toBeCloseTo(
      (800 + 1280) / 833,
      10,
    );
  });

  test('rules, clamps and font scale', () => {
    const s = defineCustomStrategy(
      {
        id: 'r',
        clamp: {max: 1.3},
        valueClamp: {min: 4},
        fontScale: {max: 1.2},
        rules: [
          {name: 'tab', when: {device: 'tablet'}, set: {curve: {type: 'power', exponent: 0.5}}},
        ],
      },
      {register: false},
    );
    expect(s.resolveScreen(phone).factor).toBe(1.3); // 411/300 = 1.37 capped by clamp.max
    expect(s.resolveScreen(tablet).appliedRules).toEqual(['tab']);
    expect(s.resolveScreen(tablet).factor).toBe(1.3);
    expect(s.resolveScreen(phone).scale(1)).toBe(4);
    const big = {...phone, fontScale: 2};
    expect(s.resolveScreen(big).scaleSpDp(10)).toBeCloseTo(10 * 1.3 * 1.2, 10);
    expect(s.resolveScreen(big).scaleSpUnits(10)).toBeCloseTo((10 * 1.3 * 1.2) / 2, 10);
  });

  test('JSON: extends, errors and round trip', () => {
    const loaded = loadCustomStrategies({
      version: 1,
      default: 'brand',
      strategies: [
        {id: 'brand', extends: 'tabletFriendly', curve: {type: 'power', exponent: 0.8}},
        {id: 'text', extends: 'brand', fontScale: 'ignore'},
      ],
    });
    expect(getDefaultCustomStrategy()).toBe(loaded.get('brand'));
    expect(loaded.get('text')!.config.rules).toHaveLength(1);
    const back = parseStrategiesDocument(exportCustomStrategies(), () => undefined).configs;
    expect(back.get('text')!.fontScale).toEqual({type: 'ignore'});
    expect(() => parseStrategiesDocument([{id: 'a', extends: 'a'}], () => undefined)).toThrow(
      /Cyclic/,
    );
    expect(() => requireCustomStrategy('nope')).toThrow(/No scaling strategy/);
  });

  test('rejects a range condition that is not an object', () => {
    const json =
      '{"strategies":[{"id":"x","rules":[{"when":{"width":600},"set":{"multiplier":2}}]}]}';
    expect(() => parseStrategiesDocument(json, () => undefined)).toThrow(
      /rules\[0\]\.when\.width must be an object with min\/max/,
    );
  });

  test('ignoreMultiWindow skips the formula in multi-window', () => {
    const s = defineCustomStrategy({id: 'mw', ignoreMultiWindow: true, formula: 'base * 3'});
    const mw = screenSnapshot({widthDp: 411, heightDp: 891, isMultiWindow: true});
    expect(s.resolveScreen(mw).scale(16)).toBe(16);
    expect(s.resolveScreen(phone).scale(16)).toBe(48);
  });

  test('malformed JSON fails loudly and loading is atomic', () => {
    const load = (json: string) => () => loadCustomStrategies(json);
    expect(
      load('{"strategies":[{"id":"x","rules":[{"when":"tablet","set":{"multiplier":2}}]}]}'),
    ).toThrow(/when must be an object/);
    expect(load('{"strategies":[{"id":"x","rules":[{"set":"big"}]}]}')).toThrow(
      /set must be an object/,
    );
    expect(load('{"strategies":[{"id":"x","ignoreMultiWindow":"true"}]}')).toThrow(
      /must be a boolean/,
    );
    expect(
      load('{"strategies":[{"id":"x","rules":[{"when":{"multiWindow":1},"set":{}}]}]}'),
    ).toThrow(/multiWindow must be a boolean/);
    expect(load('{"strategies":[{"id":"x","aspectRatio":{"enabled":"yes"}}]}')).toThrow(
      /aspectRatio\.enabled must be a boolean/,
    );
    expect(load('{"strategies":[{"id":"x","clamp":1.5}]}')).toThrow(/clamp must be an object/);
    expect(load('{"strategies":[{"id":"x","valueClamp":[1,2]}]}')).toThrow(
      /valueClamp must be an object/,
    );
    expect(() =>
      defineCustomStrategy({id: 'neg', valueClamp: {max: -1}}, {register: false}),
    ).toThrow(/maxValue must be >= 0/);
    expect(() =>
      defineCustomStrategy({id: 'neg', valueClamp: {min: -1}}, {register: false}),
    ).toThrow(/minValue must be >= 0/);
    expect(load('{"default":"missing","strategies":[{"id":"atomic","multiplier":2}]}')).toThrow(
      /missing/,
    );
    expect(getCustomStrategy('atomic')).toBeUndefined(); // nothing registered by the failed load
    // withAxis is cached per source instance, not per id.
    const a = defineCustomStrategy({id: 'same', multiplier: 1}, {register: false});
    const b = defineCustomStrategy({id: 'same', multiplier: 2}, {register: false});
    expect(a.withAxis('height').config.multiplier).toBe(1);
    expect(b.withAxis('height').config.multiplier).toBe(2);
    expect(b.withAxis('height')).toBe(b.withAxis('height'));
    // A sensitivity-only rule patch survives export + import.
    const s = loadCustomStrategies(
      '{"strategies":[{"id":"sens","aspectRatio":true,"rules":[{"when":{"device":"tablet"},"set":{"sensitivity":0.01}}]}]}',
    ).get('sens')!;
    expect(s.toJSON().rules![0]!.set).toEqual({sensitivity: 0.01});
    const again = loadCustomStrategies({strategies: [s.toJSON()]}).get('sens')!;
    expect(again.resolveScreen(tablet).factor).toBe(s.resolveScreen(tablet).factor);
  });

  test('cross-platform fixture (Kotlin reference engine)', () => {
    const fixture = require('./fixtures/custom-strategy-fixture.json');
    const configs = parseStrategiesDocument(
      fixture.document,
      id => getCustomStrategy(id)?.config,
    ).configs;
    const screens = new Map<string, ScreenSnapshot>(
      Object.entries(fixture.screens as Record<string, any>).map(([k, s]) => [
        k,
        screenSnapshot({
          widthDp: s.width,
          heightDp: s.height,
          smallestWidthDp: s.smallestWidth,
          density: s.density,
          fontScale: s.fontScale,
          isLandscape: s.landscape,
          isMultiWindow: s.multiWindow,
          device: s.device as DeviceClass,
        }),
      ]),
    );
    expect(fixture.cases.length).toBeGreaterThan(100);
    for (const c of fixture.cases) {
      const r = new CustomScalingStrategy(c.strategy, configs.get(c.strategy)!).resolveScreen(
        screens.get(c.screen)!,
      );
      const tol = (e: number) => fixture.tolerance * Math.max(1, Math.abs(e));
      const label = `${c.strategy}@${c.screen}x${c.base}`;
      expect([label, Math.abs(r.factor - c.factor) <= tol(c.factor)]).toEqual([label, true]);
      expect([label, Math.abs(r.scale(c.base) - c.dp) <= tol(c.dp)]).toEqual([label, true]);
      expect([label, Math.abs(r.scaleSpDp(c.base) - c.spDp) <= tol(c.spDp)]).toEqual([label, true]);
      expect([label, r.appliedRules]).toEqual([label, c.rules]);
    }
  });
});

describe('React Native binding', () => {
  test('cdp / csp follow the window and the default', () => {
    expect(cdp(16)).toBeCloseTo(sdp(16), 10);
    const brand = defineCustomStrategy({id: 'brand', curve: {type: 'power', exponent: 0.8}});
    expect(cdp(16, 'brand')).toBeCloseTo(16 * Math.pow(411 / 300, 0.8), 10);
    act(() => __setWindow({width: 800, height: 1280, fontScale: 1.5}));
    expect(cdp(16, brand)).toBeCloseTo(16 * Math.pow(800 / 300, 0.8), 10);
    expect(csp(14, brand)).toBeCloseTo(14 * Math.pow(800 / 300, 0.8), 10); // RN applies fontScale itself
    setDefaultCustomStrategy(brand);
    expect((16).cdp).toBe(cdp(16, brand));
    expect((16).cdpWith('scaled')).toBeCloseTo(sdp(16), 10);
    expect((14).cspWith(brand)).toBe(csp(14, brand));
  });

  test('device class from UI mode, Platform and resolver', () => {
    const tv = new DimenMetrics({width: 960, height: 540, uiModeType: UiModeType.TELEVISION});
    expect(toScreenSnapshot(tv).device).toBe('tv');
    expect(toScreenSnapshot(new DimenMetrics({width: 800, height: 1280})).device).toBe('tablet');
    setDeviceClassResolver(() => 'watch');
    expect(
      CustomPresets.WEARABLE.resolve(new DimenMetrics({width: 200, height: 200})).appliedRules,
    ).toEqual(['watch']);
  });

  test('provider + hook re-render on window change', () => {
    const brand = defineCustomStrategy({id: 'brand', curve: {type: 'power', exponent: 0.8}});
    const seen: number[] = [];
    function Probe() {
      seen.push(useCustomStrategy().dp(16));
      return null;
    }
    act(() => {
      TestRenderer.create(
        <AppDimensProvider>
          <CustomStrategyProvider strategy={brand}>
            <Probe />
          </CustomStrategyProvider>
        </AppDimensProvider>,
      );
    });
    expect(seen[seen.length - 1]).toBeCloseTo(16 * Math.pow(411 / 300, 0.8), 10);
    act(() => __setWindow({width: 800, height: 1280}));
    expect(seen[seen.length - 1]).toBeCloseTo(16 * Math.pow(800 / 300, 0.8), 10);
  });

  test('extend / withAxis / explain', () => {
    const soft = BuiltInStrategies.POWER.extend('soft', {curve: {type: 'power', exponent: 0.6}});
    expect(getCustomStrategy('soft')).toBe(soft);
    expect(soft.withAxis('height')).toBe(soft.withAxis('height'));
    expect(soft.explain()).toContain('[soft]');
  });
});
