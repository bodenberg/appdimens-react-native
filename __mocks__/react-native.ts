/**
 * Minimal `react-native` mock for unit tests: Dimensions / PixelRatio / AppState / Platform /
 * StyleSheet with controllable values, plus host components for the renderer.
 */
import React from 'react';

type Dim = {width: number; height: number; scale: number; fontScale: number};
type Handler = (e: {window: Dim; screen: Dim}) => void;

const state = {
  window: {width: 360, height: 800, scale: 3, fontScale: 1} as Dim,
  screen: {width: 360, height: 800, scale: 3, fontScale: 1} as Dim,
  handlers: new Set<Handler>(),
  appHandlers: new Set<(s: string) => void>(),
};

export const Dimensions = {
  get: (k: 'window' | 'screen') => ({...state[k]}),
  addEventListener: (_: 'change', h: Handler) => {
    state.handlers.add(h);
    return {remove: () => state.handlers.delete(h)};
  },
};

export const PixelRatio = {
  get: () => state.window.scale,
  getFontScale: () => state.window.fontScale,
  roundToNearestPixel: (v: number) => Math.round(v * state.window.scale) / state.window.scale,
};

export const AppState = {
  addEventListener: (_: 'change', h: (s: string) => void) => {
    state.appHandlers.add(h);
    return {remove: () => state.appHandlers.delete(h)};
  },
};

export const Platform: {OS: string; isTV: boolean; select: (o: any) => any} = {
  OS: 'android',
  isTV: false,
  select: (o: any) => o.android ?? o.default,
};

export const StyleSheet = {
  create: <T>(s: T): T => s,
  flatten: (s: any) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s),
};

export const View = (props: any) => React.createElement('View', props, props.children);
export const Text = (props: any) => React.createElement('Text', props, props.children);

export type LayoutChangeEvent = {
  nativeEvent: {layout: {x: number; y: number; width: number; height: number}};
};
export type StyleProp<T> = T | T[] | null | undefined | false;
export type ViewStyle = Record<string, unknown>;
export type TextStyle = Record<string, unknown>;
export type TextProps = Record<string, unknown>;

/** Test helper: change the simulated window and emit the 'change' event. */
export function __setWindow(window: Partial<Dim>, screen?: Partial<Dim>): void {
  state.window = {...state.window, ...window};
  state.screen = {...state.screen, ...(screen ?? window)};
  state.handlers.forEach(h => h({window: state.window, screen: state.screen}));
}

/** Test helper: emit an AppState change. */
export function __setAppState(s: string): void {
  state.appHandlers.forEach(h => h(s));
}
