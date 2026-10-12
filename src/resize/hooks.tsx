/**
 * React bindings of the resize module — the React Native counterpart of the Compose
 * `BoxWithConstraintsScope.autoResize*` helpers.
 *
 * Each hook returns the resolved size plus an `onLayout` handler: attach it to the container
 * whose bounds constrain the content (that container plays the role of `BoxWithConstraints`).
 * If the bounds are known up front pass `width` / `height` and the value is ready on the first
 * render.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {useDimenMetrics} from '../react/hooks';
import {ContentPadding, DimenResize, innerMaxDimensions} from './DimenResize';
import {AutoResizePercentBasis, ResizeBound} from './ResizeMath';
import type {TextEstimateOptions, TextMeasurer} from './textMeasure';

interface Box {
  width: number;
  height: number;
}

/** Tracks a container size through `onLayout` (optionally seeded with known bounds). */
export function useContainerSize(
  initial?: Partial<Box>,
): [Box | null, (e: LayoutChangeEvent) => void] {
  const seeded =
    initial && (initial.width != null || initial.height != null)
      ? {width: initial.width ?? Infinity, height: initial.height ?? Infinity}
      : null;
  const [box, setBox] = useState<Box | null>(seeded);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setBox(prev =>
      prev && prev.width === width && prev.height === height ? prev : {width, height},
    );
  }, []);
  return [box, onLayout];
}

/** Options of {@link useAutoResizeTextSp}. */
export interface AutoResizeTextOptions extends TextEstimateOptions {
  minSp: number;
  maxSp: number;
  stepSp?: number;
  maxLines?: number;
  fontScale?: boolean;
  measure?: TextMeasurer;
  /** Known container width (dp) — skips waiting for `onLayout`. */
  width?: number;
  /** Known container height (dp). */
  height?: number;
  /** Padding of the container (dp). */
  contentPadding?: ContentPadding;
  /**
   * Use the measured container height as a constraint (default `false`). Enable it only when the
   * container height is fixed by its own style (e.g. `flex: 1` or `height`), otherwise the
   * container would shrink with the text.
   */
  constrainHeight?: boolean;
}

/**
 * Largest font size (sp) in `[minSp, maxSp]` whose text fits the container
 * (Compose `autoResizeTextSp`). Returns `minSp` until the container is measured.
 */
export function useAutoResizeTextSp(
  text: string,
  options: AutoResizeTextOptions,
): {fontSize: number; onLayout: (e: LayoutChangeEvent) => void; measured: boolean} {
  const metrics = useDimenMetrics();
  const [box, onLayout] = useContainerSize({width: options.width, height: options.height});
  const {
    minSp,
    maxSp,
    stepSp,
    maxLines,
    fontScale,
    measure,
    contentPadding,
    lineHeight,
    lineHeightMultiplier,
    letterSpacing,
    widthFactor,
    constrainHeight,
  } = options;
  const useHeight = constrainHeight === true || options.height != null;
  const fontSize = useMemo(() => {
    if (!box) return Math.min(minSp, maxSp);
    const inner = innerMaxDimensions(box.width, box.height, contentPadding);
    return DimenResize.fittingTextSp({
      text,
      maxWidth: inner.width,
      maxHeight: useHeight && isFinite(inner.height) ? inner.height : undefined,
      minSp,
      maxSp,
      stepSp,
      maxLines,
      fontScale,
      measure,
      lineHeight,
      lineHeightMultiplier,
      letterSpacing,
      widthFactor,
    });
    // `metrics` is a dependency so font-scale / window changes recompute the size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    box,
    metrics,
    text,
    minSp,
    maxSp,
    stepSp,
    maxLines,
    fontScale,
    measure,
    contentPadding,
    lineHeight,
    lineHeightMultiplier,
    letterSpacing,
    widthFactor,
    useHeight,
  ]);
  return {fontSize, onLayout, measured: box !== null};
}

/** Options of the box resize hooks. */
export interface AutoResizeSizeOptions {
  /** Minimum size (dp number or a {@link ResizeBound}). */
  min: number | ResizeBound;
  /** Maximum size (dp number or a {@link ResizeBound}). */
  max: number | ResizeBound;
  /** Step (dp number or a {@link ResizeBound}), default 2 dp like Compose. */
  step?: number | ResizeBound;
  contentPadding?: ContentPadding;
  width?: number;
  height?: number;
}

function useBoxResize(
  options: AutoResizeSizeOptions,
  pick: (range: ReturnType<typeof DimenResize.range>, box: Box, pad?: ContentPadding) => number,
) {
  const metrics = useDimenMetrics();
  const [box, onLayout] = useContainerSize({width: options.width, height: options.height});
  const {min, max, step, contentPadding} = options;
  const range = useMemo(
    () => DimenResize.range(min, max, step ?? 2),
    // metrics: percent / sp bounds depend on the window snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step, metrics],
  );
  const size = useMemo(
    () => (box ? pick(range, box, contentPadding) : range.low),
    [box, range, contentPadding, pick],
  );
  return {size, onLayout, measured: box !== null};
}

const pickSquare = (r: ReturnType<typeof DimenResize.range>, b: Box, p?: ContentPadding) =>
  DimenResize.fittingInnerSquareSide(r, b.width, b.height, p);
const pickWidth = (r: ReturnType<typeof DimenResize.range>, b: Box, p?: ContentPadding) =>
  DimenResize.fittingInnerWidth(r, b.width, p);
const pickHeight = (r: ReturnType<typeof DimenResize.range>, b: Box, p?: ContentPadding) =>
  DimenResize.fittingInnerHeight(r, b.height, p);

/** Largest square side (dp) that fits the container (Compose `autoResizeSquareSize`). */
export function useAutoResizeSquareSize(options: AutoResizeSizeOptions) {
  return useBoxResize(options, pickSquare);
}

/** Largest width (dp) that fits the container (Compose `autoResizeWidthSize`). */
export function useAutoResizeWidthSize(options: AutoResizeSizeOptions) {
  return useBoxResize(options, pickWidth);
}

/** Largest height (dp) that fits the container (Compose `autoResizeHeightSize`). */
export function useAutoResizeHeightSize(options: AutoResizeSizeOptions) {
  return useBoxResize(options, pickHeight);
}

/** Options of the percent-of-box resize hooks. */
export interface AutoResizePercentOptions {
  minPercent: number;
  maxPercent: number;
  stepPercent?: number;
  basis?: AutoResizePercentBasis;
  contentPadding?: ContentPadding;
  width?: number;
  height?: number;
}

function usePercentResize(options: AutoResizePercentOptions, kind: 'square' | 'width' | 'height') {
  const [box, onLayout] = useContainerSize({width: options.width, height: options.height});
  const {minPercent, maxPercent, stepPercent, basis, contentPadding} = options;
  const size = useMemo(() => {
    if (!box) return 0;
    const inner = innerMaxDimensions(box.width, box.height, contentPadding);
    const defaultBasis =
      kind === 'width'
        ? AutoResizePercentBasis.WIDTH
        : kind === 'height'
          ? AutoResizePercentBasis.HEIGHT
          : AutoResizePercentBasis.MIN_SIDE;
    const range = DimenResize.rangePercentOfInnerBox(
      minPercent,
      maxPercent,
      stepPercent ?? 1,
      inner.width,
      inner.height,
      basis ?? defaultBasis,
    );
    const limit =
      kind === 'width'
        ? inner.width
        : kind === 'height'
          ? inner.height
          : Math.min(inner.width, inner.height);
    const best = range.resolveFitting(c => c <= limit);
    return best > 0 ? best : range.low;
  }, [box, minPercent, maxPercent, stepPercent, basis, contentPadding, kind]);
  return {size, onLayout, measured: box !== null};
}

/** Square side as a percentage range of the container (Compose `autoResizeSquareSizePercent`). */
export function useAutoResizeSquareSizePercent(options: AutoResizePercentOptions) {
  return usePercentResize(options, 'square');
}

/** Width as a percentage range of the container (Compose `autoResizeWidthSizePercent`). */
export function useAutoResizeWidthSizePercent(options: AutoResizePercentOptions) {
  return usePercentResize(options, 'width');
}

/** Height as a percentage range of the container (Compose `autoResizeHeightSizePercent`). */
export function useAutoResizeHeightSizePercent(options: AutoResizePercentOptions) {
  return usePercentResize(options, 'height');
}

/** Props of {@link AutoResizeText}. */
export interface AutoResizeTextProps
  extends Omit<TextProps, 'children'>,
    Omit<AutoResizeTextOptions, 'width' | 'height'> {
  children: string;
  /** Style of the measuring container (it must have bounded width, e.g. `flex: 1`). */
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
}

/**
 * Text that picks the largest font size in `[minSp, maxSp]` that fits its container.
 *
 * @example
 * <AutoResizeText minSp={12} maxSp={28} maxLines={2}>{title}</AutoResizeText>
 */
export function AutoResizeText({
  children,
  minSp,
  maxSp,
  stepSp,
  maxLines,
  fontScale,
  measure,
  contentPadding,
  lineHeight,
  lineHeightMultiplier,
  letterSpacing,
  widthFactor,
  constrainHeight,
  containerStyle,
  style,
  ...textProps
}: AutoResizeTextProps) {
  const {fontSize, onLayout} = useAutoResizeTextSp(children, {
    minSp,
    maxSp,
    stepSp,
    maxLines,
    fontScale,
    measure,
    contentPadding,
    lineHeight,
    lineHeightMultiplier,
    letterSpacing,
    widthFactor,
    constrainHeight,
  });
  return (
    <View style={containerStyle} onLayout={onLayout}>
      <Text
        numberOfLines={maxLines}
        allowFontScaling={fontScale !== false}
        {...textProps}
        style={[style, {fontSize}, letterSpacing != null ? {letterSpacing} : null]}>
        {children}
      </Text>
    </View>
  );
}
