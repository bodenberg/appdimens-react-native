import {Platform} from '../__mocks__/react-native';
import {DimenCache, UnitType} from '../src';
import {
  AutoResizePercentBasis,
  DimenResize,
  ResizeRange,
  buildResizeSteps,
  estimateTextBlock,
  estimateTextWidth,
  findLargestFitting,
  innerMaxDimensions,
  resizeFixedDp,
  resizeFixedSp,
  resizePercentH,
  resizePercentSw,
  resizePercentW,
  resolveBoundToDp,
  resolveBoundToPx,
} from '../src/resize';
import {DimenPhysicalUnits, cm, cmPx, inch, inchPx, mm, mmPx} from '../src/units';
import {DimenMetrics} from '../src/core/DimenMetrics';

const phone = {width: 360, height: 800, density: 3, fontScale: 1.5, isInMultiWindowMode: false};

beforeEach(() => DimenCache.setMetricsOverride(phone));
afterAll(() => DimenCache.reset());

describe('ResizeMath', () => {
  test('step table', () => {
    expect(Array.from(buildResizeSteps(10, 20, 4))).toEqual([10, 14, 18, 20]);
    expect(Array.from(buildResizeSteps(20, 10, 5))).toEqual([10, 15, 20]);
    expect(Array.from(buildResizeSteps(10, 20, 0))).toEqual([10]);
    expect(Array.from(buildResizeSteps(NaN, 20, 1))).toEqual([0]);
    expect(buildResizeSteps(0, 1e9, 1).length).toBe(4096);
    // no floating drift
    const s = buildResizeSteps(0, 1, 0.1);
    expect(s[s.length - 1]).toBe(1);
    expect(s.length).toBe(11);
  });

  test('binary search', () => {
    const steps = buildResizeSteps(10, 30, 1);
    expect(findLargestFitting(steps, c => c <= 17.5)).toBe(17);
    expect(findLargestFitting(steps, () => false)).toBe(0);
    expect(findLargestFitting(new Float64Array(0), () => true)).toBe(0);
    expect(findLargestFitting([5], () => true)).toBe(5);
    expect(findLargestFitting([5], () => false)).toBe(0);
    const r = new ResizeRange(30, 10, 5);
    expect(r.low).toBe(10);
    expect(r.high).toBe(30);
    expect(r.resolveFitting(c => c < 26)).toBe(25);
  });

  test('bounds', () => {
    expect(resolveBoundToDp(resizeFixedDp(12))).toBe(12);
    expect(resolveBoundToDp(resizeFixedDp(-3))).toBe(0);
    expect(resolveBoundToDp(resizeFixedSp(10))).toBe(15);
    expect(resolveBoundToDp(resizePercentW(10))).toBe(36);
    expect(resolveBoundToDp(resizePercentH(150))).toBe(800);
    expect(resolveBoundToDp(resizePercentSw(-5))).toBe(0);
    expect(resolveBoundToPx(resizeFixedDp(10))).toBe(30);
    const bad = Object.assign(Object.create(DimenMetrics.prototype), {density: 0}) as DimenMetrics;
    expect(() => resolveBoundToPx(resizeFixedDp(10), bad)).toThrow(RangeError);
  });
});

describe('DimenResize', () => {
  test('inner dimensions', () => {
    expect(innerMaxDimensions(100, 50)).toEqual({width: 100, height: 50});
    expect(innerMaxDimensions(100, 50, 10)).toEqual({width: 80, height: 30});
    expect(innerMaxDimensions(100, 50, {horizontal: 5, top: 20})).toEqual({width: 90, height: 30});
    expect(innerMaxDimensions(10, 10, {all: 20})).toEqual({width: 0, height: 0});
    expect(innerMaxDimensions(100, 100, {start: 10, end: 5, vertical: 1})).toEqual({
      width: 85,
      height: 98,
    });
  });

  test('ranges and fitting', () => {
    const r = DimenResize.range(10, resizePercentW(20), 4);
    expect(r.high).toBeCloseTo(72);
    expect(DimenResize.rangePx(10, 20, 5).high).toBe(60);
    expect(DimenResize.fittingInnerWidth(r, 50, 2)).toBe(46);
    expect(DimenResize.fittingInnerHeight(r, 30)).toBe(30);
    expect(DimenResize.fittingInnerSquareSide(r, 100, 40, {all: 4})).toBe(30);
    expect(DimenResize.fittingInnerSquareSide(r, 5, 5)).toBe(10); // nothing fits → min
    expect(DimenResize.fitting(r, () => false)).toBe(0); // low-level contract
    expect(DimenResize.fittingPx(r, c => c < 20)).toBe(18);
    const p = DimenResize.rangePercentOfInnerBox(
      10,
      50,
      10,
      200,
      100,
      AutoResizePercentBasis.WIDTH,
    );
    expect(Array.from(p.steps)).toEqual([20, 40, 60, 80, 100]);
    expect(DimenResize.rangePercentOfInnerBox(10, 200, 10, 200, 100).high).toBe(100);
    expect(DimenResize.rangePercentOfInnerBox(10, 50, 10, 200, 100, 'HEIGHT').high).toBe(50);
  });

  test('text estimation', () => {
    expect(estimateTextWidth('', 10)).toBe(0);
    expect(estimateTextWidth('iii', 10)).toBeLessThan(estimateTextWidth('MMM', 10));
    expect(estimateTextWidth('ab', 10, {letterSpacing: 1, widthFactor: 2})).toBeCloseTo(
      0.55 * 2 * 10 * 2 + 2,
    );
    expect(estimateTextWidth('日本', 10)).toBe(20);
    const one = estimateTextBlock('hello world', 10, 1000, {});
    expect(one.lines).toBe(1);
    const wrapped = estimateTextBlock('hello world again', 10, 40, {});
    expect(wrapped.lines).toBeGreaterThan(1);
    expect(wrapped.width).toBeLessThanOrEqual(40);
    const hard = estimateTextBlock('supercalifragilistic', 10, 30, {lineHeight: 12});
    expect(hard.lines).toBeGreaterThan(2);
    expect(hard.height).toBe(hard.lines * 12);
    expect(estimateTextBlock('a\nb', 10, 100, {}).lines).toBe(2);
    const wrappedLong = estimateTextBlock('a supercalifragilistic', 10, 30, {});
    expect(wrappedLong.lines).toBeGreaterThan(2);
  });

  test('fitting text', () => {
    const big = DimenResize.fittingTextSp({text: 'Hi', maxWidth: 1000, minSp: 10, maxSp: 40});
    expect(big).toBe(40);
    const single = DimenResize.fittingTextSp({
      text: 'A fairly long headline',
      maxWidth: 150,
      minSp: 8,
      maxSp: 40,
      maxLines: 1,
    });
    expect(single).toBeGreaterThanOrEqual(8);
    expect(single).toBeLessThan(40);
    expect(estimateTextWidth('A fairly long headline', single * 1.5)).toBeLessThanOrEqual(150);
    const noScale = DimenResize.fittingTextSp({
      text: 'A fairly long headline',
      maxWidth: 150,
      minSp: 8,
      maxSp: 40,
      maxLines: 1,
      fontScale: false,
    });
    expect(noScale).toBeGreaterThan(single);
    const tall = DimenResize.fittingTextSp({
      text: 'one two three four',
      maxWidth: 60,
      maxHeight: 30,
      minSp: 4,
      maxSp: 40,
    });
    expect(tall).toBeLessThan(40);
    expect(DimenResize.fittingTextSp({text: 'x', maxWidth: 0, minSp: 9, maxSp: 20})).toBe(9);
    expect(DimenResize.fittingTextSpPx({text: 'Hi', maxWidth: 1000, minSp: 10, maxSp: 20})).toBe(
      20 * 3 * 1.5,
    );
    expect(
      DimenResize.fittingTextSpPx({
        text: 'Hi',
        maxWidth: 1000,
        minSp: 10,
        maxSp: 20,
        fontScale: false,
      }),
    ).toBe(60);
    const custom = DimenResize.fittingTextSp({
      text: 'x',
      maxWidth: 100,
      minSp: 1,
      maxSp: 100,
      measure: (_t, size) => ({width: size, height: size, lines: 1}),
    });
    expect(custom).toBe(66); // 66 × 1.5 = 99 ≤ 100
    const pct = DimenResize.fittingTextSpPercent({
      text: 'Hi',
      maxWidth: 200,
      maxHeight: 100,
      minPercent: 10,
      maxPercent: 30,
      basis: 'MIN_SIDE',
    });
    expect(pct).toBeCloseTo(20); // 30% of 100 / fontScale 1.5
  });
});

describe('physical units', () => {
  afterEach(() => DimenPhysicalUnits.setDpPerInch(null));

  test('conversions on android (160 dp/in)', () => {
    expect(DimenPhysicalUnits.getDpPerInch()).toBe(160);
    expect(inch(1)).toBe(160);
    expect(mm(25.4)).toBeCloseTo(160);
    expect(cm(2.54)).toBeCloseTo(160);
    expect(inchPx(1)).toBe(480);
    expect(mmPx(25.4)).toBeCloseTo(480);
    expect(cmPx(2.54)).toBeCloseTo(480);
    expect(DimenPhysicalUnits.toSpFromInch(1)).toBeCloseTo(160 / 1.5);
    expect(DimenPhysicalUnits.toSpFromMm(25.4)).toBeCloseTo(160 / 1.5);
    expect(DimenPhysicalUnits.toSpFromCm(2.54)).toBeCloseTo(160 / 1.5);
  });

  test('radius helpers and unit math', () => {
    expect(DimenPhysicalUnits.radiusFromDiameter(10, UnitType.DP)).toBe(5);
    expect(DimenPhysicalUnits.radiusFromDiameter(10, UnitType.SP)).toBe(7.5);
    expect(DimenPhysicalUnits.radiusFromDiameter(30, UnitType.PX)).toBe(5);
    expect(DimenPhysicalUnits.radiusFromDiameter(1, UnitType.INCH)).toBe(80);
    expect(DimenPhysicalUnits.radiusFromDiameter(25.4, UnitType.MM)).toBeCloseTo(80);
    expect(DimenPhysicalUnits.radiusFromCircumference(2 * Math.PI, UnitType.CM)).toBeCloseTo(
      160 / 2.54,
    );
    expect(DimenPhysicalUnits.mmToCm(10)).toBe(1);
    expect(DimenPhysicalUnits.mmToInch(25.4)).toBe(1);
    expect(DimenPhysicalUnits.cmToMm(1)).toBe(10);
    expect(DimenPhysicalUnits.cmToInch(2.54)).toBe(1);
    expect(DimenPhysicalUnits.inchToMm(1)).toBe(25.4);
    expect(DimenPhysicalUnits.inchToCm(1)).toBe(2.54);
  });

  test('dp-per-inch override and platform defaults', () => {
    DimenPhysicalUnits.setDpPerInch(200);
    expect(inch(1)).toBe(200);
    expect(() => DimenPhysicalUnits.setDpPerInch(0)).toThrow(RangeError);
    Platform.OS = 'ios';
    DimenPhysicalUnits.setDpPerInch(null);
    expect(DimenPhysicalUnits.getDpPerInch()).toBe(163);
    Platform.OS = 'web';
    DimenPhysicalUnits.setDpPerInch(null);
    expect(DimenPhysicalUnits.getDpPerInch()).toBe(96);
    Platform.OS = 'android';
  });
});
