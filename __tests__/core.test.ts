import {__setAppState, __setWindow, Platform} from '../__mocks__/react-native';
import {
  DimenCache,
  DimenMetrics,
  DpQualifier,
  Inverter,
  Orientation,
  UiModeType,
  effectiveQualifier,
  plainMode,
  plainQualifier,
  plainRotate,
  plainScreen,
  scaledDp,
  scaledSp,
  sdp,
  sdpMode,
  sdpModePlain,
  sdpQualifier,
  sdpQualifierPx,
  sdpRotate,
  sdpRotatePlain,
  sdpRotatePlainPx,
  sdpRotatePx,
  sdpScreen,
  sdpScreenPlain,
  hdpRotate,
  wdpMode,
  sspRotate,
  sspRotatePx,
  sspMode,
  sem,
  ssp,
  installNumberExtensions,
  uninstallNumberExtensions,
  scaledKernels,
} from '../src';
import {powerDp, powerSp, pwsdp} from '../src/strategies/power';
import * as percent from '../src/strategies/percent';

const phone = {width: 360, height: 800, density: 3, fontScale: 1, isInMultiWindowMode: false};
const landscape = {width: 800, height: 360, density: 3, fontScale: 1, isInMultiWindowMode: false};
const tablet = {width: 800, height: 1280, density: 2, fontScale: 1, isInMultiWindowMode: false};

afterEach(() => {
  DimenCache.reset();
});

describe('DimenMetrics', () => {
  test('derived values', () => {
    const m = new DimenMetrics({width: 360, height: 800, density: 3, fontScale: 1.2});
    expect(m.smallestWidthDp).toBe(360);
    expect(m.scale).toBeCloseTo(1.2);
    expect(m.isPortrait).toBe(true);
    expect(m.orientation).toBe('PORTRAIT');
    expect(m.normalizedAspectRatio).toBeCloseTo(800 / 360 / 1.78);
    expect(m.readScreenDp('HEIGHT')).toBe(800);
    expect(m.isInMultiWindowMode).toBe(false);
  });

  test('invalid input falls back to safe values', () => {
    const m = new DimenMetrics({width: NaN, height: -1, density: 0, fontScale: Infinity});
    expect(m.smallestWidthDp).toBe(300);
    expect(m.density).toBe(1);
    expect(m.fontScale).toBe(1);
    // Android: raw aspect ratio falls back to 1 when the min side is 0, then / 1.78.
    expect(m.normalizedAspectRatio).toBeCloseTo(1 / 1.78);
  });

  test('multi-window heuristic uses display vs window', () => {
    expect(
      new DimenMetrics({width: 360, height: 380, screenWidth: 360, screenHeight: 800})
        .isInMultiWindowMode,
    ).toBe(true);
    expect(
      new DimenMetrics({width: 360, height: 760, screenWidth: 360, screenHeight: 800})
        .isInMultiWindowMode,
    ).toBe(false);
    expect(
      new DimenMetrics({width: 360, height: 380, isInMultiWindowMode: false}).isInMultiWindowMode,
    ).toBe(false);
  });

  test('custom k validation', () => {
    const m = new DimenMetrics({width: 400, height: 900});
    expect(() => m.scaledMultiplier(true, NaN)).toThrow(RangeError);
    expect(() => m.aspectRatioMultiplier(Infinity)).toThrow(RangeError);
    expect(() => m.scaledMultiplier(true, 1e308)).toThrow(RangeError);
    expect(m.scaledMultiplier(false, 5)).toBe(m.scale);
    expect(m.aspectRatioMultiplier(null)).toBe(m.defaultAspectRatioMultiplier);
  });

  test('factor table is filled lazily and reused', () => {
    const m = new DimenMetrics({width: 400, height: 900});
    const first = m.factor(2, 0, 0, 0);
    expect(m.factor(2, 0, 0, 0)).toBe(first);
    expect(m.factor(2, 0, 0, 1, 0.5)).not.toBe(m.factor(2, 0, 0, 1));
    expect(() => m.factor(99, 0, 0, 0)).toThrow(RangeError);
  });

  test('effectiveQualifier', () => {
    expect(effectiveQualifier('SMALL_WIDTH', 'SW_TO_LH', true, false)).toBe('HEIGHT');
    expect(effectiveQualifier('SMALL_WIDTH', 'SW_TO_LH', false, true)).toBe('SMALL_WIDTH');
    expect(effectiveQualifier('HEIGHT', 'PH_TO_LW', true, false)).toBe('WIDTH');
    expect(effectiveQualifier('WIDTH', 'LW_TO_PH', false, true)).toBe('HEIGHT');
    expect(effectiveQualifier('WIDTH', 'DEFAULT', true, false)).toBe('WIDTH');
  });
});

describe('DimenCache', () => {
  test('watcher publishes a new snapshot only on real changes', () => {
    const seen: number[] = [];
    const unsub = DimenCache.subscribe(m => seen.push(m.screenWidthDp));
    const v0 = DimenCache.version;
    __setWindow({width: 360, height: 800});
    expect(DimenCache.version).toBe(v0); // identical window → same snapshot
    __setWindow({width: 800, height: 360});
    expect(DimenCache.version).not.toBe(v0);
    expect(DimenCache.currentMetrics.isLandscape).toBe(true);
    __setWindow({fontScale: 1.5});
    __setAppState('active');
    expect(DimenCache.currentMetrics.fontScale).toBe(1.5);
    unsub();
    __setWindow({width: 360, height: 800, fontScale: 1});
    expect(seen).toEqual([800, 800]);
  });

  test('listener errors are isolated', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const ok = jest.fn();
    const u1 = DimenCache.subscribe(() => {
      throw new Error('boom');
    });
    const u2 = DimenCache.subscribe(ok);
    DimenCache.setMetricsOverride(tablet);
    expect(ok).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    u1();
    u2();
    spy.mockRestore();
  });

  test('ui mode detection and override', () => {
    expect(DimenCache.getCachedUiModeType()).toBe('NORMAL');
    Platform.isTV = true;
    DimenCache.refresh();
    expect(DimenCache.getCachedUiModeType()).toBe('TELEVISION');
    Platform.isTV = false;
    DimenCache.setUiModeType(UiModeType.FOLD_OPEN);
    expect(DimenCache.getCachedUiModeType()).toBe('FOLD_OPEN');
    DimenCache.setUiModeType(null);
    expect(DimenCache.invalidateOnConfigChange().uiModeType).toBe('NORMAL');
  });

  test('stop / start watching', () => {
    DimenCache.stopWatching();
    const v = DimenCache.version;
    __setWindow({width: 500, height: 900});
    expect(DimenCache.version).toBe(v);
    DimenCache.startWatching();
    DimenCache.startWatching(); // idempotent
    __setWindow({width: 360, height: 800});
    expect(DimenCache.currentMetrics.screenWidthDp).toBe(360);
  });

  test('multi-window override makes `i` variants return the base', () => {
    DimenCache.setMetricsOverride(phone);
    DimenCache.setMultiWindowMode(true);
    expect(scaledKernels.sdpi(16)).toBe(16);
    expect(scaledKernels.sdpia(16)).toBe(16);
    expect(sdp(16)).toBeCloseTo(19.2);
    DimenCache.setMultiWindowMode(null);
    expect(scaledKernels.sdpi(16)).toBeCloseTo(19.2);
  });
});

describe('facilitators', () => {
  test('rotate', () => {
    DimenCache.setMetricsOverride(phone);
    expect(sdpRotate(80, 50)).toBeCloseTo(96); // portrait → receiver on SW
    expect(sdpRotate(80, 50, Orientation.PORTRAIT)).toBeCloseTo(60);
    expect(sdpRotate(80, 50, Orientation.DEFAULT)).toBeCloseTo(96);
    expect(sdpRotatePx(80, 50, Orientation.PORTRAIT)).toBeCloseTo(180);
    DimenCache.setMetricsOverride(landscape);
    expect(sdpRotate(80, 50)).toBeCloseTo(60);
    expect(
      sdpRotate(80, 50, Orientation.LANDSCAPE, {finalQualifierResolver: DpQualifier.WIDTH}),
    ).toBeCloseTo((50 * 800) / 300);
    expect(hdpRotate(30, 10)).toBeCloseTo((10 * 360) / 300);
    expect(sspRotate(14, 20)).toBeCloseTo(24);
    expect(sspRotatePx(14, 20, Orientation.LANDSCAPE, {fontScale: false})).toBeCloseTo(72);
  });

  test('rotate plain does not rescale the receiver', () => {
    DimenCache.setMetricsOverride(phone);
    const base = sdp(16);
    expect(sdpRotatePlain(base, 50)).toBe(base);
    expect(sdpRotatePlain(base, 50, Orientation.PORTRAIT)).toBeCloseTo(60);
    expect(sdpRotatePlainPx(48, 50, Orientation.PORTRAIT)).toBeCloseTo(180);
    expect(plainRotate(1, 2, Orientation.PORTRAIT)).toBe(2);
    expect(plainRotate(1, 2)).toBe(1);
  });

  test('mode', () => {
    DimenCache.setMetricsOverride(phone);
    expect(sdpMode(30, 200, UiModeType.TELEVISION)).toBeCloseTo(36);
    DimenCache.setUiModeType(UiModeType.TELEVISION);
    expect(sdpMode(30, 200, UiModeType.TELEVISION)).toBeCloseTo(240);
    expect(wdpMode(30, 200, UiModeType.TELEVISION, {applyAspectRatio: true})).toBeGreaterThan(0);
    expect(sspMode(14, 20, UiModeType.TELEVISION, {fontScale: false})).toBeCloseTo(24);
    expect(sdpModePlain(5, 10, UiModeType.TELEVISION)).toBeCloseTo(12);
    expect(plainMode(1, 2, UiModeType.TELEVISION)).toBe(2);
    expect(plainMode(1, 2, UiModeType.CAR)).toBe(1);
  });

  test('qualifier and screen', () => {
    DimenCache.setMetricsOverride(tablet);
    expect(sdpQualifier(60, 120, DpQualifier.SMALL_WIDTH, 600)).toBeCloseTo((120 * 800) / 300);
    expect(sdpQualifier(60, 120, DpQualifier.SMALL_WIDTH, 900)).toBeCloseTo((60 * 800) / 300);
    expect(sdpQualifierPx(60, 120, DpQualifier.HEIGHT, 1000)).toBeCloseTo(((120 * 800) / 300) * 2);
    expect(sdpScreen(70, 150, UiModeType.NORMAL, DpQualifier.SMALL_WIDTH, 600)).toBeCloseTo(
      (150 * 800) / 300,
    );
    expect(sdpScreen(70, 150, UiModeType.TELEVISION, DpQualifier.SMALL_WIDTH, 600)).toBeCloseTo(
      (70 * 800) / 300,
    );
    expect(sdpScreenPlain(7, 150, UiModeType.TELEVISION, DpQualifier.SMALL_WIDTH, 600)).toBe(7);
    expect(plainQualifier(1, 2, 'WIDTH', 800)).toBe(2);
    expect(plainScreen(1, 2, 'NORMAL', 'WIDTH', 801)).toBe(1);
    expect(plainScreen(1, 2, 'NORMAL', 'WIDTH', 800)).toBe(2);
  });
});

describe('builders', () => {
  test('priorities follow Android ordering', () => {
    DimenCache.setMetricsOverride(tablet);
    const b = scaledDp(10)
      .screen(Orientation.PORTRAIT, 40) // p4
      .screen(DpQualifier.SMALL_WIDTH, 600, 30) // p3
      .screen(DpQualifier.SMALL_WIDTH, 720, 35) // p3, larger threshold first
      .screen(UiModeType.TELEVISION, 50) // p2
      .screen(UiModeType.NORMAL, DpQualifier.SMALL_WIDTH, 900, 60); // p1 (no match)
    expect(b.sdp).toBeCloseTo((35 * 800) / 300);
    DimenCache.setUiModeType(UiModeType.TELEVISION);
    expect(b.sdp).toBeCloseTo((50 * 800) / 300);
    expect(b.hdp).toBeCloseTo((50 * 1280) / 300);
    expect(b.wdpPx).toBeCloseTo(((50 * 800) / 300) * 2);
    expect(b.sdpHdpWdpPx()).toHaveLength(3);
  });

  test('immutability, flags and object entries', () => {
    DimenCache.setMetricsOverride(phone);
    const base = scaledDp(10);
    const withEntry = base.screen({
      orientation: 'PORTRAIT',
      customValue: 20,
      finalQualifierResolver: 'HEIGHT',
    });
    expect(base.sdp).toBeCloseTo(12);
    expect(withEntry.sdp).toBeCloseTo((20 * 800) / 300);
    expect(base.applyAspectRatio().sdp).toBeCloseTo(scaledKernels.sdpa(10));
    expect(base.aspectRatio(true, 0.01).sdp).not.toBe(base.applyAspectRatio().sdp);
    DimenCache.setMultiWindowMode(true);
    expect(base.ignoreMultiWindows().sdp).toBe(10);
    expect(base.dp('WIDTH')).toBeCloseTo(12);
    expect(base.px()).toBeCloseTo(36);
  });

  test('ui+qualifier with orientation overload and inverter', () => {
    DimenCache.setMetricsOverride(landscape);
    const b = scaledDp(10).screen(
      UiModeType.NORMAL,
      DpQualifier.WIDTH,
      700,
      Orientation.LANDSCAPE,
      20,
      null,
      Inverter.SW_TO_LH,
    );
    expect(b.sdp).toBeCloseTo((20 * 360) / 300);
    const c = scaledDp(10).screen(UiModeType.NORMAL, DpQualifier.WIDTH, 700, 25, DpQualifier.WIDTH);
    expect(c.sdp).toBeCloseTo((25 * 800) / 300);
  });

  test('invalid arguments throw', () => {
    expect(() => scaledDp(NaN)).toThrow(TypeError);
    expect(() => scaledDp(1).screen('BAD' as any, 1)).toThrow(TypeError);
    expect(() => scaledDp(1).screen(Orientation.PORTRAIT, NaN)).toThrow(TypeError);
    expect(() => scaledDp(1).aspectRatio(true, Infinity)).toThrow(RangeError);
  });

  test('sp builders and strategy builders', () => {
    DimenCache.setMetricsOverride({...phone, fontScale: 1.5});
    const t = scaledSp(14).screen({uiModeType: 'NORMAL', customValue: 20, fontScale: false});
    expect(scaledSp(14).ssp).toBeCloseTo(ssp(14));
    expect(scaledSp(14).sem).toBeCloseTo(sem(14));
    expect(t.ssp).toBeCloseTo(24 / 1.5);
    expect(t.sem).toBeCloseTo(24 / 1.5);
    expect(scaledSp(14).sspPx).toBeCloseTo(14 * 1.2 * 3 * 1.5);
    expect(scaledSp(14).semPx).toBeCloseTo(14 * 1.2 * 3);
    expect(scaledSp(14).hsp).toBeGreaterThan(0);
    expect(powerDp(16).pwsdp).toBeCloseTo(pwsdp(16));
    expect(powerSp(16).pwssp).toBeCloseTo(pwsdp(16));
  });
});

describe('percent space', () => {
  test('literal percentages', () => {
    DimenCache.setMetricsOverride({...phone, fontScale: 2});
    expect(percent.spaceW(10)).toBeCloseTo(36);
    expect(percent.spaceH(10)).toBeCloseTo(80);
    expect(percent.spaceSw(50)).toBeCloseTo(180);
    expect(percent.spaceWPx(10)).toBeCloseTo(108);
    expect(percent.space(25, 200)).toBe(50);
    expect(percent.spacePx(25, 200)).toBe(150);
    expect(percent.spaceWSp(10)).toBeCloseTo(36);
    expect(percent.spaceWSp(10, false)).toBeCloseTo(18);
    expect(percent.spaceHSpPx(10)).toBeCloseTo(80 * 3 * 2);
    expect(percent.spaceSp(10, 100, false)).toBeCloseTo(5);
    expect(percent.space(NaN, 100)).toBe(0);
    expect(percent.spaceW(Infinity)).toBe(0);
    DimenCache.setMultiWindowMode(true);
    expect(percent.spaceWi(10)).toBe(10);
    expect(percent.spaceW(10)).toBeCloseTo(36);
  });
});

describe('number extensions', () => {
  afterEach(() => uninstallNumberExtensions());

  test('install / uninstall', () => {
    DimenCache.setMetricsOverride(phone);
    installNumberExtensions(scaledKernels);
    installNumberExtensions(scaledKernels); // idempotent
    expect((16 as any).sdp).toBeCloseTo(19.2);
    expect((2 as any).sdpPx).toBeCloseTo(7.2);
    expect(Object.keys(Number.prototype)).not.toContain('sdp');
    uninstallNumberExtensions();
    expect((16 as any).sdp).toBeUndefined();
  });

  test('replaces getters installed by another copy of the library', () => {
    const foreign = function () {
      return 42;
    };
    (foreign as any).__appdimens = true;
    Object.defineProperty(Number.prototype, 'sdp', {configurable: true, get: foreign});
    DimenCache.setMetricsOverride(phone);
    installNumberExtensions(scaledKernels);
    expect((16 as any).sdp).toBeCloseTo(19.2);
  });

  test('refuses to override existing members', () => {
    expect(() => installNumberExtensions({toFixed: sdp} as any)).toThrow();
  });

  test('side-effect entry point', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/number');
    DimenCache.setMetricsOverride(phone);
    expect((16 as any).ssp).toBeCloseTo(19.2);
  });
});
