import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {__setWindow} from '../__mocks__/react-native';
import {
  AppDimensProvider,
  DimenCache,
  DimenStyleSheet,
  UiModeType,
  createDimenStyles,
  sdp,
  ssp,
  useAppDimens,
  useDimenMetrics,
  useLocalDimenMetrics,
} from '../src';
import {useDimenMetricsLegacy} from '../src/react/hooks';
import {powerKernels, pwsdp} from '../src/strategies/power';
import {
  AutoResizeText,
  useAutoResizeHeightSize,
  useAutoResizeHeightSizePercent,
  useAutoResizeSquareSize,
  useAutoResizeSquareSizePercent,
  useAutoResizeTextSp,
  useAutoResizeWidthSize,
  useAutoResizeWidthSizePercent,
} from '../src/resize';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  DimenCache.reset();
  act(() => __setWindow({width: 360, height: 800, scale: 3, fontScale: 1}));
});

function layout(width: number, height: number) {
  return {nativeEvent: {layout: {x: 0, y: 0, width, height}}} as any;
}

test('useDimenMetrics re-renders on window change', () => {
  const values: number[] = [];
  function Probe() {
    useDimenMetrics();
    values.push(sdp(10));
    return null;
  }
  act(() => {
    TestRenderer.create(<Probe />);
  });
  act(() => __setWindow({width: 800, height: 360}));
  expect(values[0]).toBeCloseTo(12);
  expect(values[values.length - 1]).toBeCloseTo(12);
  act(() => __setWindow({width: 600, height: 1000}));
  expect(values[values.length - 1]).toBeCloseTo(20);
  expect(useAppDimens).toBe(useDimenMetrics);
});

test('legacy hook path (React < 18)', () => {
  const seen: number[] = [];
  function Probe() {
    seen.push(useDimenMetricsLegacy().screenWidthDp);
    return null;
  }
  act(() => {
    TestRenderer.create(<Probe />);
  });
  act(() => __setWindow({width: 500, height: 900}));
  expect(seen[seen.length - 1]).toBe(500);
});

test('createDimenStyles caches per snapshot', () => {
  const factory = jest.fn(() => ({box: {padding: sdp(10)}, title: {fontSize: ssp(14)}}));
  const useStyles = createDimenStyles(factory);
  const a = useStyles.get();
  expect(useStyles.get()).toBe(a);
  expect(factory).toHaveBeenCalledTimes(1);
  let rendered: any;
  function C() {
    rendered = useStyles();
    return null;
  }
  act(() => {
    TestRenderer.create(<C />);
  });
  expect(rendered.box.padding).toBeCloseTo(12);
  act(() => __setWindow({width: 600, height: 1000}));
  expect(rendered.box.padding).toBeCloseTo(20);
  expect(factory).toHaveBeenCalledTimes(2);
});

test('DimenStyleSheet resolves tokens', () => {
  DimenStyleSheet.register(powerKernels);
  const useStyles = DimenStyleSheet.create({
    box: {
      padding: '10sdp',
      margin: '-5sdp',
      width: '20pwsdp',
      color: 'red',
      flex: 1,
      opacity: '0.5sdpUnknown',
    },
    text: {fontSize: '14ssp', transform: [{translateX: '.5sdp'}] as any},
  });
  const s = useStyles.get();
  expect(s.box.padding).toBeCloseTo(12);
  expect(s.box.margin).toBeCloseTo(-6);
  expect(s.box.width).toBeCloseTo(pwsdp(20));
  expect(s.box.color).toBe('red');
  expect(s.box.flex).toBe(1);
  expect(s.box.opacity).toBe('0.5sdpUnknown');
  expect(s.text.transform[0].translateX).toBeCloseTo(0.6);
  expect(DimenStyleSheet.resolve('8hdp')).toBeCloseTo((8 * 800) / 300);
  expect(DimenStyleSheet.resolve(5)).toBe(5);
});

test('AppDimensProvider applies overrides and context', () => {
  let local: any;
  let global: any;
  function Probe() {
    local = useLocalDimenMetrics();
    return null;
  }
  function Outside() {
    global = useDimenMetrics();
    return null;
  }
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <>
        <Outside />
        <AppDimensProvider
          uiModeType={UiModeType.TELEVISION}
          metricsOverride={{width: 960, height: 540}}>
          <Probe />
        </AppDimensProvider>
      </>,
    );
  });
  expect(local.uiModeType).toBe('TELEVISION');
  expect(local.screenWidthDp).toBe(960);
  expect(global.uiModeType).toBe('TELEVISION');
  act(() => {
    r.update(
      <>
        <Outside />
        <AppDimensProvider
          uiModeType={UiModeType.TELEVISION}
          metricsOverride={{width: 960, height: 540}}>
          <Probe />
        </AppDimensProvider>
      </>,
    );
  });
  act(() => {
    r.update(
      <AppDimensProvider multiWindowMode>
        <Probe />
      </AppDimensProvider>,
    );
  });
  expect(local.isInMultiWindowMode).toBe(true);
  expect(local.uiModeType).toBe('NORMAL');
  act(() => r.unmount());
  expect(DimenCache.currentMetrics.isInMultiWindowMode).toBe(false);

  let fallback: any;
  function NoProvider() {
    fallback = useLocalDimenMetrics();
    return null;
  }
  act(() => {
    TestRenderer.create(<NoProvider />);
  });
  expect(fallback).toBe(DimenCache.currentMetrics);
});

test('useAutoResizeTextSp and AutoResizeText', () => {
  let result: any;
  function Probe() {
    result = useAutoResizeTextSp('A fairly long headline', {minSp: 8, maxSp: 40, maxLines: 1});
    return null;
  }
  act(() => {
    TestRenderer.create(<Probe />);
  });
  expect(result.fontSize).toBe(8);
  expect(result.measured).toBe(false);
  act(() => result.onLayout(layout(150, 50)));
  expect(result.measured).toBe(true);
  expect(result.fontSize).toBeGreaterThan(8);
  expect(result.fontSize).toBeLessThan(40);
  const before = result.fontSize;
  act(() => result.onLayout(layout(150, 50))); // same size → no change
  expect(result.fontSize).toBe(before);

  let seeded: any;
  function Seeded() {
    seeded = useAutoResizeTextSp('one two three four five', {
      minSp: 4,
      maxSp: 40,
      width: 80,
      height: 30,
    });
    return null;
  }
  act(() => {
    TestRenderer.create(<Seeded />);
  });
  expect(seeded.measured).toBe(true);
  expect(seeded.fontSize).toBeLessThan(40);

  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <AutoResizeText minSp={10} maxSp={30} maxLines={2} letterSpacing={1} style={{color: 'red'}}>
        Hello
      </AutoResizeText>,
    );
  });
  const view = tree.root.findByType('View' as any);
  act(() => view.props.onLayout(layout(300, 100)));
  const text = tree.root.findByType('Text' as any);
  expect(text.props.numberOfLines).toBe(2);
  expect(text.props.allowFontScaling).toBe(true);
  expect(text.props.style[1].fontSize).toBe(30);
  expect(text.props.style[2]).toEqual({letterSpacing: 1});
});

test('box resize hooks', () => {
  const out: Record<string, any> = {};
  function Probe() {
    out.square = useAutoResizeSquareSize({min: 10, max: 200, step: 10, contentPadding: 5});
    out.width = useAutoResizeWidthSize({min: 10, max: 200, width: 95, height: 40});
    out.height = useAutoResizeHeightSize({min: 10, max: 200});
    out.sqp = useAutoResizeSquareSizePercent({minPercent: 10, maxPercent: 90, stepPercent: 10});
    out.wp = useAutoResizeWidthSizePercent({
      minPercent: 10,
      maxPercent: 50,
      width: 200,
      height: 100,
    });
    out.hp = useAutoResizeHeightSizePercent({
      minPercent: 10,
      maxPercent: 50,
      stepPercent: 5,
      basis: 'WIDTH',
      width: 200,
      height: 100,
    });
    return null;
  }
  act(() => {
    TestRenderer.create(<Probe />);
  });
  expect(out.square.size).toBe(10);
  expect(out.sqp.size).toBe(0);
  expect(out.width.size).toBe(94);
  expect(out.wp.size).toBe(100);
  expect(out.hp.size).toBe(100); // 50% of width basis = 100 ≤ inner height 100
  act(() => {
    out.square.onLayout(layout(120, 80));
    out.height.onLayout(layout(10, 55));
    out.sqp.onLayout(layout(100, 200));
  });
  expect(out.square.size).toBe(70);
  expect(out.height.size).toBe(54);
  expect(out.sqp.size).toBeCloseTo(90);
});
