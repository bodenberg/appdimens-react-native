/**
 * Responsive styles with one computation per window snapshot (shared by every component).
 *
 *   const useStyles = createDimenStyles(() => ({
 *     card: {padding: sdp(16), borderRadius: sdp(12)},
 *     title: {fontSize: ssp(18)},
 *   }));
 *
 *   const useStyles2 = DimenStyleSheet.create({
 *     card: {padding: '16sdp', borderRadius: '12sdp'},
 *     title: {fontSize: '18ssp'},
 *   });
 *
 *   function Card() {
 *     const styles = useStyles(); // re-renders on rotation / resize / font scale
 *   }
 */
import {StyleSheet} from 'react-native';
import {store} from '../core/DimenCache';
import type {DimenMetrics} from '../core/DimenMetrics';
import type {DimenFn} from '../core/types';
import {scaledKernels} from '../strategies/scaled';
import {useDimenMetrics} from './hooks';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/** A styles hook that also exposes the cached styles outside React. */
export interface DimenStylesHook<T> {
  (): T;
  /** Styles for the current snapshot (no subscription). */
  get(): T;
}

/**
 * Creates a hook returning `StyleSheet.create(factory(metrics))`, recomputed only when the
 * window snapshot changes. The factory runs once per snapshot, not once per component.
 */
export function createDimenStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (metrics: DimenMetrics) => T & NamedStyles<any>,
): DimenStylesHook<T> {
  let version = -1;
  let cached: T;
  const get = (): T => {
    const m = store.m;
    if (m.version !== version) {
      cached = StyleSheet.create(factory(m)) as T;
      version = m.version;
    }
    return cached;
  };
  const hook = (() => {
    useDimenMetrics();
    return get();
  }) as DimenStylesHook<T>;
  hook.get = get;
  return hook;
}

// ── Token style sheets ('16sdp', '12ssp', '-8hdpLw', '10pwsdp', …) ────────────

const registry = new Map<string, DimenFn>(Object.entries(scaledKernels));
const TOKEN = /^(-?(?:\d+\.?\d*|\.\d+))([A-Za-z]+)$/;

/** Unit tokens: `${number}${unit}`. */
export type DimenToken = `${number}${string}`;

/** Style values may be numbers or dimension tokens. */
export type TokenStyles<T> = {
  [K in keyof T]: {[P in keyof T[K]]: T[K][P] | DimenToken};
};

function resolveValue(v: unknown): unknown {
  if (typeof v === 'string') {
    const match = TOKEN.exec(v);
    if (match) {
      const fn = registry.get(match[2]);
      if (fn) return fn(parseFloat(match[1]));
    }
    return v;
  }
  if (Array.isArray(v)) return v.map(resolveValue);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object))
      out[k] = resolveValue((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

export const DimenStyleSheet = {
  /**
   * Like `StyleSheet.create`, but string tokens such as `'16sdp'`, `'14ssp'`, `'8hdpLw'`
   * are resolved with the matching kernel for the current window. Returns a styles hook.
   */
  create<T extends Record<string, Record<string, unknown>>>(
    styles: T,
  ): DimenStylesHook<{[K in keyof T]: any}> {
    return createDimenStyles(() => resolveValue(styles) as any);
  },

  /** Registers the kernels of a strategy module so its tokens work (e.g. `powerKernels`). */
  register(kernels: Readonly<Record<string, DimenFn>>): void {
    for (const k of Object.keys(kernels)) registry.set(k, kernels[k]);
  },

  /** Resolves a single token (`'16sdp'`) to a number; non-token values are returned as is. */
  resolve(value: string | number): number | string {
    return resolveValue(value) as number | string;
  },
};
